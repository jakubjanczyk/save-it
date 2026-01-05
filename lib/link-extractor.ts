import { Duration, Effect } from "effect";

import {
  ExtractionLLMError,
  ExtractionParseError,
  ExtractionTimeout,
} from "./errors";
import { type ExtractedLink, llmExtractLinks } from "./llm-extractor";
import { checkSubstackPattern, type DetectedLink } from "./substack-detector";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function mapExtractionLlmError(error: unknown) {
  return new ExtractionLLMError({
    cause: error,
    message: "LLM extraction failed",
  });
}

export function parseExtractedLinks(rawResponse: string) {
  return Effect.try({
    try: () => {
      const parsed = JSON.parse(rawResponse) as unknown;

      if (
        Array.isArray(parsed) &&
        parsed.every((item) => typeof item === "string")
      ) {
        return parsed as string[];
      }

      if (isRecord(parsed) && Array.isArray(parsed.links)) {
        const links = parsed.links;

        if (links.every((item) => typeof item === "string")) {
          return links as string[];
        }
      }

      throw new Error("Invalid link extraction response shape");
    },
    catch: (_cause) =>
      new ExtractionParseError({
        message: "Failed to parse extracted links",
        rawResponse,
      }),
  });
}

export function withExtractionTimeout<A, E>(
  effect: Effect.Effect<A, E>,
  timeoutMs: number
) {
  return Effect.timeoutFail(effect, {
    duration: Duration.millis(timeoutMs),
    onTimeout: () => new ExtractionTimeout({ timeoutMs }),
  });
}

export function extractLinks(
  html: string,
  subject: string,
  from: string,
  options?: {
    checkSubstack?: typeof checkSubstackPattern;
    llmExtract?: typeof llmExtractLinks;
  }
): Effect.Effect<
  ExtractedLink[],
  ExtractionLLMError | ExtractionParseError | ExtractionTimeout
> {
  const checkSubstack = options?.checkSubstack ?? checkSubstackPattern;
  const llmExtract = options?.llmExtract ?? llmExtractLinks;

  return Effect.orElse(
    checkSubstack(html, subject, from) as Effect.Effect<
      DetectedLink[],
      unknown
    >,
    () => llmExtract(html)
  );
}
