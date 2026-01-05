import { Effect } from "effect";

export interface DetectedLink {
  description: string;
  url: string;
}

const substackAppLinkPostUrlRegex =
  /https:\/\/substack\.com\/app-link\/post[^"'\s]+/;

function isSubstackSender(from: string) {
  return from.toLowerCase().includes("@substack.com");
}

function findSubstackAppLinkPostUrl(html: string): string | null {
  const match = html.match(substackAppLinkPostUrlRegex);
  return match?.[0] ?? null;
}

export function checkSubstackPattern(
  html: string,
  subject: string,
  from: string
): Effect.Effect<DetectedLink[], "not substack" | "no substack link found"> {
  return Effect.sync(() => {
    if (!isSubstackSender(from)) {
      return Effect.fail("not substack" as const);
    }

    const url = findSubstackAppLinkPostUrl(html);
    if (!url) {
      return Effect.fail("no substack link found" as const);
    }

    return Effect.succeed([{ description: subject, url }]);
  }).pipe(Effect.flatten);
}
