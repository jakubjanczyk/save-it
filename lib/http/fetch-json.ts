export interface FetchFailure {
  body?: string;
  retryAfter?: number;
  status: number;
}

export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

function parseRetryAfter(headerValue: string | null): number | undefined {
  if (!headerValue) {
    return undefined;
  }

  const parsed = Number.parseInt(headerValue, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function fetchJson(
  fetcher: Fetcher,
  url: string,
  init: RequestInit
) {
  const response = await fetcher(url, init);

  if (!response.ok) {
    let body: string | undefined;
    try {
      body = await response.text();
    } catch {
      body = undefined;
    }

    const failure: FetchFailure = {
      body,
      retryAfter: parseRetryAfter(response.headers.get("retry-after")),
      status: response.status,
    };

    throw failure;
  }

  return await response.json();
}
