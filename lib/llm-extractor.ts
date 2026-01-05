import { generateText, Output } from "ai";
import { Effect } from "effect";
import { ZodError, z } from "zod";

import { createGeminiModel, type Env } from "./ai";
import { ExtractionLLMError, ExtractionParseError } from "./errors";
import { withExtractionTimeout } from "./link-extractor";

export type LlmModel = Parameters<typeof generateText>[0]["model"];

const extractedLinksSchema = z.object({
  links: z.array(
    z.object({
      description: z.string(),
      url: z.url(),
    })
  ),
});

const extractionPrompt = `Extract content links from this newsletter email. Return only links to articles, blog posts, videos, tools, or other content the reader is meant to consume.

Ignore and exclude:
- Unsubscribe / manage preferences links
- Social media profile links (twitter.com/user, linkedin.com/in/user, etc.)
- "View in browser" or "View online" links
- Company/sender homepage links
- Logo or header image links
- Footer links
- Email client links (mailto:)
- Tracking pixels or analytics URLs
- Share buttons
- App store links unless the newsletter is specifically about that app

For each content link found, provide:
- url: the full href URL
- description: 1-2 sentences describing what this link is about, based on surrounding context in the email

Return as JSON:
{
  "links": [
    { "url": "https://example.com/article", "description": "An article about..." }
  ]
}

If no content links are found, return: { "links": [] }`;

export interface ExtractedLink {
  description: string;
  url: string;
}

function isAiOutputErrorName(errorName: unknown): boolean {
  return (
    errorName === "AI_JSONParseError" ||
    errorName === "AI_TypeValidationError" ||
    errorName === "AI_NoOutputGeneratedError"
  );
}

function isAiOutputError(cause: unknown): boolean {
  if (typeof cause !== "object" || cause === null) {
    return false;
  }

  return isAiOutputErrorName((cause as { name?: unknown }).name);
}

function mapLlmExtractionError(cause: unknown) {
  if (
    cause instanceof SyntaxError ||
    cause instanceof ZodError ||
    isAiOutputError(cause)
  ) {
    return new ExtractionParseError({
      message: "LLM returned malformed JSON",
    });
  }

  return new ExtractionLLMError({
    cause,
    message: "LLM extraction failed",
  });
}

export function llmExtractLinks(
  html: string,
  options?: {
    env?: Env;
    model?: LlmModel;
    timeoutMs?: number;
  }
) {
  const request = Effect.tryPromise({
    try: async () => {
      const { output } = await generateText({
        model: options?.model ?? createGeminiModel(options?.env),
        output: Output.object({ schema: extractedLinksSchema }),
        prompt: `${extractionPrompt}\n\n${html}`,
      });

      return output.links satisfies ExtractedLink[];
    },
    catch: mapLlmExtractionError,
  });

  return withExtractionTimeout(request, options?.timeoutMs ?? 30_000);
}
