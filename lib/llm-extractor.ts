import { generateText, Output } from "ai";
import { Effect } from "effect";
import { ZodError, z } from "zod";

import { createGeminiModel, type Env } from "./ai";
import {
  ExtractionLLMError,
  ExtractionParseError,
  ExtractionTimeout,
} from "./errors";
import { stripNewsletterHtmlForLlm } from "./newsletter-html";

export type LlmModel = Parameters<typeof generateText>[0]["model"];

const extractedLinksSchema = z.object({
  links: z.array(
    z.object({
      description: z.string(),
      title: z.string(),
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
- title: the original link title / label shown in the email (anchor text). If unavailable, use the URL.
- description: 1-2 sentences describing what this link is about, based on surrounding context in the email

Return as JSON:
{
  "links": [
    { "url": "https://example.com/article", "title": "Article title", "description": "An article about..." }
  ]
}

If no content links are found, return: { "links": [] }`;

export interface ExtractedLink {
  description: string;
  title: string;
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

function isAbortError(cause: unknown): boolean {
  if (typeof cause !== "object" || cause === null) {
    return false;
  }

  return (cause as { name?: unknown }).name === "AbortError";
}

export function llmExtractLinks(
  html: string,
  options?: {
    env?: Env;
    model?: LlmModel;
    timeoutMs?: number;
  }
) {
  const stripped = stripNewsletterHtmlForLlm(html);
  const prompt = `${extractionPrompt}\n\n${stripped}`;
  const timeoutMs = options?.timeoutMs ?? 90_000;

  const request = Effect.tryPromise({
    try: async () => {
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), timeoutMs);

      try {
        const { output } = await generateText({
          model: options?.model ?? createGeminiModel(options?.env),
          output: Output.object({ schema: extractedLinksSchema }),
          prompt,
          abortSignal: abortController.signal,
          providerOptions: {
            google: {
              thinkingConfig: {
                thinkingBudget: 0, // Setting the budget to 0 disables thinking
              },
            },
          },
        });

        return output.links satisfies ExtractedLink[];
      } finally {
        clearTimeout(timeout);
      }
    },
    catch: (cause) => {
      if (isAbortError(cause)) {
        return new ExtractionTimeout({ timeoutMs });
      }

      return mapLlmExtractionError(cause);
    },
  });

  return request;
}
