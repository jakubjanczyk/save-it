const indicators = [
  "enable javascript",
  "please enable javascript",
  "turn on javascript",
  "javascript is required",
  "javascript is disabled",
  "javascript is not available",
  "requires javascript",
] as const;

/**
 * Best-effort detector for pages that require client-side JS to render content.
 * If this returns true, we should skip LLM summarization (it won't be useful).
 */
export function isJavaScriptRequiredHtml(html: string): boolean {
  const lower = html.toLowerCase();

  const hasIndicator = indicators.some((indicator) =>
    lower.includes(indicator)
  );
  if (!hasIndicator) {
    return false;
  }

  // `<noscript>` is a strong signal that the page expects JS to render.
  if (lower.includes("<noscript")) {
    return true;
  }

  // Many JS-gated interstitials are very small pages with little useful content.
  if (lower.length < 25_000) {
    return true;
  }

  // Cloudflare-style interstitials.
  if (lower.includes("cloudflare") && lower.includes("enable javascript")) {
    return true;
  }

  return false;
}
