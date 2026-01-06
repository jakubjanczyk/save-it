import { Cause, Chunk, Effect, Exit } from "effect";
import { expect, test } from "vitest";

import { createRaindropBookmark, mapRaindropError } from "./raindrop";

test("mapRaindropError maps 401 to RaindropAuthError", () => {
  const error = mapRaindropError({ body: "Unauthorized", status: 401 });

  expect(error._tag).toBe("RaindropAuthError");
});

test("mapRaindropError maps 429 to RaindropRateLimited", () => {
  const error = mapRaindropError({ retryAfter: 3, status: 429 });

  expect(error._tag).toBe("RaindropRateLimited");
  if (error._tag !== "RaindropRateLimited") {
    throw new Error("Expected RaindropRateLimited");
  }
  expect(error.retryAfter).toBe(3);
});

test("mapRaindropError maps unknown errors to RaindropNetworkError", () => {
  const cause = new Error("ECONNRESET");
  const error = mapRaindropError(cause);

  expect(error._tag).toBe("RaindropNetworkError");
  expect(error.cause).toBe(cause);
});

test("createRaindropBookmark returns created id on success", async () => {
  const fetcher = () =>
    Promise.resolve(
      new Response(JSON.stringify({ item: { _id: 123 } }), {
        headers: { "content-type": "application/json" },
        status: 200,
      })
    );

  const id = await Effect.runPromise(
    createRaindropBookmark(
      "token",
      { title: "Title", url: "https://example.com/a" },
      { fetcher, baseUrl: "https://example.test" }
    )
  );

  expect(id).toBe("123");
});

test("createRaindropBookmark fails with RaindropAuthError on 401", async () => {
  const fetcher = () =>
    Promise.resolve(new Response("Unauthorized", { status: 401 }));

  const exit = await Effect.runPromiseExit(
    createRaindropBookmark(
      "token",
      { title: "Title", url: "https://example.com/a" },
      { fetcher, baseUrl: "https://example.test" }
    )
  );

  expect(Exit.isFailure(exit)).toBe(true);
  if (!Exit.isFailure(exit)) {
    throw new Error("Expected failure");
  }

  const failures = Cause.failures(exit.cause);
  const firstFailure = Chunk.toReadonlyArray(failures)[0];

  expect(firstFailure?._tag).toBe("RaindropAuthError");
});

test("createRaindropBookmark retries when rate limited", async () => {
  let calls = 0;

  const fetcher = () => {
    calls += 1;
    if (calls === 1) {
      return Promise.resolve(
        new Response("rate limited", {
          headers: { "retry-after": "1" },
          status: 429,
        })
      );
    }

    return Promise.resolve(
      new Response(JSON.stringify({ item: { _id: "r1" } }), {
        headers: { "content-type": "application/json" },
        status: 200,
      })
    );
  };

  await Effect.runPromise(
    createRaindropBookmark(
      "token",
      { title: "Title", url: "https://example.com/a" },
      { fetcher, baseUrl: "https://example.test", retryBase: "1 millis" }
    )
  );

  expect(calls).toBe(2);
});
