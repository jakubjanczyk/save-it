import { expect, test } from "vitest";

import { fetchJson } from "./fetch-json";

test("fetchJson returns parsed JSON for ok responses", async () => {
  const result = await fetchJson(
    async () =>
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    "https://example.com",
    { method: "GET" }
  );

  expect(result).toEqual({ ok: true });
});

test("fetchJson throws status and retryAfter for non-ok responses with Retry-After", async () => {
  await expect(
    fetchJson(
      async () =>
        new Response("rate limited", {
          headers: { "retry-after": "5" },
          status: 429,
        }),
      "https://example.com",
      { method: "GET" }
    )
  ).rejects.toEqual({
    body: "rate limited",
    retryAfter: 5,
    status: 429,
  });
});

test("fetchJson ignores invalid Retry-After values", async () => {
  await expect(
    fetchJson(
      async () =>
        new Response("rate limited", {
          headers: { "retry-after": "abc" },
          status: 429,
        }),
      "https://example.com",
      { method: "GET" }
    )
  ).rejects.toEqual({
    body: "rate limited",
    retryAfter: undefined,
    status: 429,
  });
});
