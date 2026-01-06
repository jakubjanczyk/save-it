import { Cause, Chunk, Effect, Exit } from "effect";
import { beforeEach, expect, test, vi } from "vitest";

import { type LlmModel, llmExtractLinks } from "./llm-extractor";

const generateTextMock = vi.fn();

vi.mock("ai", () => ({
  Output: { object: () => ({}) },
  generateText: (...args: unknown[]) => generateTextMock(...args),
}));

beforeEach(() => {
  generateTextMock.mockReset();
});

test("llmExtractLinks returns links on success", async () => {
  generateTextMock.mockResolvedValue({
    output: {
      links: [
        { description: "A", title: "A title", url: "https://example.com/a" },
        { description: "B", title: "B title", url: "https://example.com/b" },
      ],
    },
  });

  const result = await Effect.runPromise(
    llmExtractLinks("<html></html>", {
      model: {} as LlmModel,
      timeoutMs: 10,
    })
  );

  expect(result).toEqual([
    { description: "A", title: "A title", url: "https://example.com/a" },
    { description: "B", title: "B title", url: "https://example.com/b" },
  ]);
});

test("llmExtractLinks strips newsletter HTML before sending to the model", async () => {
  generateTextMock.mockResolvedValue({ output: { links: [] } });

  await Effect.runPromise(
    llmExtractLinks(
      `<script>alert("x")</script><p><a href="https://example.com/a">Read</a></p>`,
      {
        model: {} as LlmModel,
        timeoutMs: 10,
      }
    )
  );

  const call = generateTextMock.mock.calls[0]?.[0] as
    | { prompt?: unknown }
    | undefined;

  expect(typeof call?.prompt).toBe("string");
  if (typeof call?.prompt !== "string") {
    throw new Error("Expected prompt");
  }

  expect(call.prompt.includes('alert("x")')).toBe(false);
  expect(call.prompt.includes("[Read](https://example.com/a)")).toBe(true);
});

test("llmExtractLinks maps generic failures to ExtractionLLMError", async () => {
  generateTextMock.mockRejectedValue(new Error("boom"));

  const exit = await Effect.runPromiseExit(
    llmExtractLinks("<html></html>", {
      model: {} as LlmModel,
      timeoutMs: 10,
    })
  );

  if (!Exit.isFailure(exit)) {
    throw new Error("Expected failure");
  }

  const failures = Cause.failures(exit.cause);
  const firstFailure = Chunk.toReadonlyArray(failures)[0];

  expect(firstFailure?._tag).toBe("ExtractionLLMError");
});

test("llmExtractLinks maps parse failures to ExtractionParseError", async () => {
  const cause = new Error("invalid output");
  cause.name = "AI_TypeValidationError";
  generateTextMock.mockRejectedValue(cause);

  const exit = await Effect.runPromiseExit(
    llmExtractLinks("<html></html>", {
      model: {} as LlmModel,
      timeoutMs: 10,
    })
  );

  if (!Exit.isFailure(exit)) {
    throw new Error("Expected failure");
  }

  const failures = Cause.failures(exit.cause);
  const firstFailure = Chunk.toReadonlyArray(failures)[0];

  expect(firstFailure?._tag).toBe("ExtractionParseError");
});

test("llmExtractLinks fails with ExtractionTimeout when it exceeds timeout", async () => {
  generateTextMock.mockImplementation(
    (args: unknown) =>
      new Promise((resolve, reject) => {
        const abortSignal = (args as { abortSignal?: AbortSignal }).abortSignal;
        const timer = setTimeout(() => resolve({ output: { links: [] } }), 10);

        abortSignal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          },
          { once: true }
        );
      })
  );

  const exit = await Effect.runPromiseExit(
    llmExtractLinks("<html></html>", {
      model: {} as LlmModel,
      timeoutMs: 1,
    })
  );

  if (!Exit.isFailure(exit)) {
    throw new Error("Expected failure");
  }

  const failures = Cause.failures(exit.cause);
  const firstFailure = Chunk.toReadonlyArray(failures)[0];

  expect(firstFailure?._tag).toBe("ExtractionTimeout");
});
