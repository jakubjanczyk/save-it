import { parseHTML } from "linkedom";
import TurndownService from "turndown";

export type ExtractionConfidence = "low" | "medium" | "high";

export interface MainContentExtraction {
  confidence: ExtractionConfidence;
  markdown: string;
}

const LOW_CONFIDENCE_CHARS = 200;
const HIGH_CONFIDENCE_CHARS = 1200;

const noiseSelectors = [
  "script",
  "style",
  "noscript",
  "svg",
  "canvas",
  "iframe",
  "nav",
  "header",
  "footer",
  "aside",
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
] as const;

function normalizeMarkdown(markdown: string) {
  return markdown
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function computeConfidence(markdown: string): ExtractionConfidence {
  const length = markdown.trim().length;
  if (length < LOW_CONFIDENCE_CHARS) {
    return "low";
  }

  if (length < HIGH_CONFIDENCE_CHARS) {
    return "medium";
  }

  return "high";
}

function ensureHtmlDocument(html: string) {
  const trimmed = html.trim();
  if (trimmed.toLowerCase().includes("<html")) {
    return trimmed;
  }

  return `<!doctype html><html><body>${trimmed}</body></html>`;
}

function removeNoise(root: ParentNode) {
  for (const selector of noiseSelectors) {
    for (const node of Array.from(root.querySelectorAll(selector))) {
      node.remove();
    }
  }
}

/**
 * Best-effort main-content extraction for LLM input.
 * v1 heuristic:
 * - drop common noise containers (nav/header/footer/etc.)
 * - prefer `<article>` or `<main>`, else fall back to `<body>`
 * - convert to compact markdown via Turndown
 * - compute confidence from output length
 */
export function extractMainContent(html: string): MainContentExtraction {
  const wrapped = ensureHtmlDocument(html);
  const { document } = parseHTML(wrapped);

  removeNoise(document);

  const container =
    document.querySelector("article") ??
    document.querySelector("main") ??
    document.body;

  const turndown = new TurndownService();
  const markdown = normalizeMarkdown(turndown.turndown(container));

  return { confidence: computeConfidence(markdown), markdown };
}
