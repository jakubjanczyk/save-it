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
        { description: "A", url: "https://example.com/a" },
        { description: "B", url: "https://example.com/b" },
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
    { description: "A", url: "https://example.com/a" },
    { description: "B", url: "https://example.com/b" },
  ]);
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
    () =>
      new Promise((resolve) =>
        setTimeout(() => resolve({ output: { links: [] } }), 10)
      )
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
