import { parseHTML } from "linkedom";

export type ExtractedTitleSource = "h1" | "og" | "twitter" | "title";

export interface ExtractedTitle {
  source: ExtractedTitleSource;
  title: string;
}

const MAX_TITLE_LENGTH = 200;

function normalizeTitleCandidate(candidate: string | null | undefined): string {
  const normalized = (candidate ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) {
    return "";
  }

  return normalized.length > MAX_TITLE_LENGTH
    ? normalized.slice(0, MAX_TITLE_LENGTH)
    : normalized;
}

function getFirstH1(document: Document): string {
  const h1 = document.querySelector("h1");
  return normalizeTitleCandidate(h1?.textContent);
}

function getMetaTitle(document: Document, selector: string): string {
  const meta = document.querySelector(selector);
  return normalizeTitleCandidate(meta?.getAttribute("content"));
}

function getTitleTag(document: Document): string {
  const title = document.querySelector("title");
  return normalizeTitleCandidate(title?.textContent);
}

/**
 * Deterministic title selection heuristic (v1):
 * - prefer the first `<h1>` (human-facing page title)
 * - else `og:title`
 * - else `twitter:title`
 * - else `<title>`
 */
export function extractBestTitleFromHtml(html: string): ExtractedTitle | null {
  const { document } = parseHTML(html);

  const h1 = getFirstH1(document);
  if (h1) {
    return { source: "h1", title: h1 };
  }

  const og = getMetaTitle(document, 'meta[property="og:title"]');
  if (og) {
    return { source: "og", title: og };
  }

  const twitter = getMetaTitle(document, 'meta[name="twitter:title"]');
  if (twitter) {
    return { source: "twitter", title: twitter };
  }

  const title = getTitleTag(document);
  if (title) {
    return { source: "title", title };
  }

  return null;
}
