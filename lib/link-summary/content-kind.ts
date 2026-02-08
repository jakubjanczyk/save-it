export type LinkContentKind = "article" | "github" | "other";

export function classifyContentKind(url: string): LinkContentKind {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "other";
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "other";
  }

  if (parsed.hostname === "github.com") {
    return "github";
  }

  return "article";
}
