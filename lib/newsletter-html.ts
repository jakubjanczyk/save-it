import { parseHTML } from "linkedom";
import TurndownService from "turndown";

const ignoredLinkTextEquals = [
  "sign up",
  "advertise",
  "unsubscribe",
  "view online",
  "manage your subscription",
] as const;

const ignoredLinkTextContains = ["(sponsor)"] as const;

function shouldIgnoreLinkText(text: string) {
  const normalized = text.trim().replace(/\s+/g, " ").toLowerCase();
  if (!normalized) {
    return false;
  }

  if (ignoredLinkTextEquals.some((exactMatch) => normalized === exactMatch)) {
    return true;
  }

  return ignoredLinkTextContains.some((substring) =>
    normalized.includes(substring)
  );
}

export function stripNewsletterHtmlForLlm(html: string) {
  const cleaned = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(meta|link|base)\b[^>]*>/gi, " ")
    .replace(/<(svg|iframe|canvas)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<img\b[^>]*>/gi, " ")
    .replace(/<(canvas|video)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");

  const turndown = new TurndownService();
  const wrapped = `<!doctype html><html><body>${cleaned}</body></html>`;
  const { document } = parseHTML(wrapped);

  for (const anchor of Array.from(document.body.querySelectorAll("a"))) {
    const text = anchor.textContent ?? "";
    if (shouldIgnoreLinkText(text)) {
      anchor.remove();
    }
  }

  const markdown = turndown.turndown(document.body);

  return markdown
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
