import { Cause, Chunk, Effect, Exit } from "effect";
import { describe, expect, test } from "vitest";

import { checkSubstackPattern } from "./substack-detector";

describe("checkSubstackPattern", () => {
  test("fails with 'not substack' when sender is not @substack.com", async () => {
    const exit = await Effect.runPromiseExit(
      checkSubstackPattern("<html></html>", "Subject", "Someone <a@x.com>")
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (!Exit.isFailure(exit)) {
      throw new Error("Expected failure");
    }

    const failures = Cause.failures(exit.cause);
    const firstFailure = Chunk.toReadonlyArray(failures)[0];

    expect(firstFailure).toBe("not substack");
  });

  test("fails with 'no substack link found' when sender is substack but link is missing", async () => {
    const exit = await Effect.runPromiseExit(
      checkSubstackPattern("<html></html>", "Subject", "me@substack.com")
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (!Exit.isFailure(exit)) {
      throw new Error("Expected failure");
    }

    const failures = Cause.failures(exit.cause);
    const firstFailure = Chunk.toReadonlyArray(failures)[0];

    expect(firstFailure).toBe("no substack link found");
  });

  test("returns a link with email subject as description", async () => {
    const result = await Effect.runPromise(
      checkSubstackPattern(
        `<a href="https://substack.com/app-link/post/abc">Read</a>`,
        "Hello",
        "newsletter@substack.com"
      )
    );

    expect(result).toEqual([
      {
        description: "Hello",
        title: "Hello",
        url: "https://substack.com/app-link/post/abc",
      },
    ]);
  });
});
