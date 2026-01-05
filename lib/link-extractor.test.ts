import { Cause, Chunk, Effect, Exit } from "effect";
import { describe, expect, test } from "vitest";

import {
  mapExtractionLlmError,
  parseExtractedLinks,
  withExtractionTimeout,
} from "./link-extractor";

describe("mapExtractionLlmError", () => {
  test("returns ExtractionLLMError", () => {
    expect(mapExtractionLlmError("boom")._tag).toBe("ExtractionLLMError");
  });

  test("keeps cause", () => {
    const cause = new Error("boom");
    expect(mapExtractionLlmError(cause).cause).toBe(cause);
  });
});

describe("parseExtractedLinks", () => {
  test("parses a JSON array of strings", async () => {
    const result = await Effect.runPromise(parseExtractedLinks('["a","b"]'));
    expect(result).toEqual(["a", "b"]);
  });

  test("parses an object with links array", async () => {
    const result = await Effect.runPromise(
      parseExtractedLinks('{"links":["a","b"]}')
    );
    expect(result).toEqual(["a", "b"]);
  });

  test("fails with ExtractionParseError on invalid JSON", async () => {
    const exit = await Effect.runPromiseExit(parseExtractedLinks("{"));

    expect(Exit.isFailure(exit)).toBe(true);
    if (!Exit.isFailure(exit)) {
      throw new Error("Expected failure");
    }

    const failures = Cause.failures(exit.cause);
    const firstFailure = Chunk.toReadonlyArray(failures)[0];

    expect(firstFailure?._tag).toBe("ExtractionParseError");
  });

  test("includes rawResponse on parse failure", async () => {
    const rawResponse = "{";
    const exit = await Effect.runPromiseExit(parseExtractedLinks(rawResponse));

    expect(Exit.isFailure(exit)).toBe(true);
    if (!Exit.isFailure(exit)) {
      throw new Error("Expected failure");
    }

    const failures = Cause.failures(exit.cause);
    const firstFailure = Chunk.toReadonlyArray(failures)[0];

    if (firstFailure?._tag !== "ExtractionParseError") {
      throw new Error("Expected ExtractionParseError");
    }

    expect(firstFailure.rawResponse).toBe(rawResponse);
  });
});

describe("withExtractionTimeout", () => {
  test("fails with ExtractionTimeout when effect exceeds timeout", async () => {
    const exit = await Effect.runPromiseExit(
      withExtractionTimeout(Effect.sleep("10 millis"), 1)
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (!Exit.isFailure(exit)) {
      throw new Error("Expected failure");
    }

    const failures = Cause.failures(exit.cause);
    const firstFailure = Chunk.toReadonlyArray(failures)[0];

    expect(firstFailure?._tag).toBe("ExtractionTimeout");
  });

  test("keeps timeoutMs", async () => {
    const timeoutMs = 1;
    const exit = await Effect.runPromiseExit(
      withExtractionTimeout(Effect.sleep("10 millis"), timeoutMs)
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (!Exit.isFailure(exit)) {
      throw new Error("Expected failure");
    }

    const failures = Cause.failures(exit.cause);
    const firstFailure = Chunk.toReadonlyArray(failures)[0];

    if (firstFailure?._tag !== "ExtractionTimeout") {
      throw new Error("Expected ExtractionTimeout");
    }

    expect(firstFailure.timeoutMs).toBe(timeoutMs);
  });

  test("succeeds when effect completes in time", async () => {
    const result = await Effect.runPromise(
      withExtractionTimeout(Effect.succeed("ok"), 10)
    );
    expect(result).toBe("ok");
  });
});
