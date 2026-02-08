export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export interface FetchHtmlOptions {
  maxBytes?: number;
  timeoutMs?: number;
}

export interface FetchHtmlResult {
  finalUrl: string;
  html: string;
}

const DEFAULT_MAX_BYTES = 1_000_000;
const DEFAULT_TIMEOUT_MS = 10_000;

function isHtmlContentType(contentType: string | null): boolean {
  if (!contentType) {
    return false;
  }

  const normalized = contentType.toLowerCase();
  return (
    normalized.includes("text/html") || normalized.includes("application/xhtml")
  );
}

function parseContentLength(contentLength: string | null): number | null {
  if (!contentLength) {
    return null;
  }

  const parsed = Number.parseInt(contentLength, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function readResponseTextWithLimit(
  response: Response,
  maxBytes: number
): Promise<string> {
  const contentLength = parseContentLength(
    response.headers.get("content-length")
  );
  if (contentLength !== null && contentLength > maxBytes) {
    throw new Error(`Response size ${contentLength} exceeds limit ${maxBytes}`);
  }

  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    if (!value) {
      continue;
    }

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      throw new Error(`Response size exceeds limit ${maxBytes}`);
    }

    chunks.push(value);
  }

  const allBytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    allBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(allBytes);
}

export async function fetchHtml(
  fetcher: Fetcher,
  url: string,
  options: FetchHtmlOptions = {}
): Promise<FetchHtmlResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only HTTP(S) URLs are supported");
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetcher(url, {
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (!isHtmlContentType(contentType)) {
      throw new Error(`Unexpected content-type: ${contentType ?? "(missing)"}`);
    }

    const html = await readResponseTextWithLimit(response, maxBytes);
    const finalUrl = response.url || url;
    return { finalUrl, html };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Fetch timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
