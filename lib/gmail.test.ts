import { Cause, Chunk, Effect, Exit } from "effect";
import { expect, test } from "vitest";

import {
  fetchEmails,
  fetchMessageFull,
  mapGmailError,
  markAsRead,
  withFreshToken,
} from "./gmail";

test("mapGmailError maps 401 to GmailTokenExpired", () => {
  const error = mapGmailError({ body: "Unauthorized", status: 401 });

  expect(error._tag).toBe("GmailTokenExpired");
});

test("mapGmailError maps 429 to GmailRateLimited", () => {
  const error = mapGmailError({ retryAfter: 7, status: 429 });

  expect(error._tag).toBe("GmailRateLimited");
  if (error._tag !== "GmailRateLimited") {
    throw new Error("Expected GmailRateLimited");
  }
  expect(error.retryAfter).toBe(7);
});

test("mapGmailError maps unknown errors to GmailNetworkError", () => {
  const cause = new Error("ECONNRESET");
  const error = mapGmailError(cause);

  expect(error._tag).toBe("GmailNetworkError");
  expect(error.cause).toBe(cause);
});

test("fetchEmails returns messages on success", async () => {
  const fetcher = () =>
    Promise.resolve(
      new Response(JSON.stringify({ messages: [{ id: "m1" }] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      })
    );

  const result = await Effect.runPromise(
    fetchEmails("token", ["a"], { fetcher })
  );

  expect(result).toEqual([{ id: "m1" }]);
});

test("fetchEmails includes is:unread in the query string", async () => {
  let requestUrl: string | null = null;

  const fetcher = (input: string) => {
    requestUrl = input;
    return Promise.resolve(
      new Response(JSON.stringify({ messages: [] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      })
    );
  };

  await Effect.runPromise(
    fetchEmails("token", ["a@example.com"], {
      baseUrl: "https://example.test",
      fetcher,
    })
  );

  if (!requestUrl) {
    throw new Error("Expected requestUrl");
  }

  const url = new URL(requestUrl);
  expect(url.searchParams.get("q")).toBe("is:unread from:a@example.com");
});

test("fetchEmails includes maxResults when provided", async () => {
  let requestUrl: string | null = null;

  const fetcher = (input: string) => {
    requestUrl = input;
    return Promise.resolve(
      new Response(JSON.stringify({ messages: [] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      })
    );
  };

  await Effect.runPromise(
    fetchEmails("token", ["a@example.com"], {
      baseUrl: "https://example.test",
      fetcher,
      maxResults: 7,
    })
  );

  if (!requestUrl) {
    throw new Error("Expected requestUrl");
  }

  const url = new URL(requestUrl);
  expect(url.searchParams.get("maxResults")).toBe("7");
});

test("fetchEmails fails with GmailTokenExpired on 401", async () => {
  const fetcher = () =>
    Promise.resolve(new Response("Unauthorized", { status: 401 }));

  const exit = await Effect.runPromiseExit(
    fetchEmails("token", ["a"], { fetcher })
  );

  expect(Exit.isFailure(exit)).toBe(true);
  if (!Exit.isFailure(exit)) {
    throw new Error("Expected failure");
  }

  const failures = Cause.failures(exit.cause);
  const firstFailure = Chunk.toReadonlyArray(failures)[0];

  expect(firstFailure?._tag).toBe("GmailTokenExpired");
});

test("fetchEmails retries when rate limited", async () => {
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
      new Response(JSON.stringify({ messages: [{ id: "m1" }] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      })
    );
  };

  await Effect.runPromise(
    fetchEmails("token", ["a"], { fetcher, retryBase: "1 millis" })
  );

  expect(calls).toBe(2);
});

test("markAsRead completes on success", async () => {
  const fetcher = () =>
    Promise.resolve(
      new Response(JSON.stringify({}), {
        headers: { "content-type": "application/json" },
        status: 200,
      })
    );

  await Effect.runPromise(markAsRead("token", "m1", { fetcher }));
});

test("fetchMessageFull returns parsed html for a text/html part", async () => {
  const html = "<p>Hello</p>";

  const fetcher = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          id: "m1",
          internalDate: "1700000000000",
          payload: {
            headers: [
              { name: "From", value: "newsletter@example.com" },
              { name: "Subject", value: "Hi" },
            ],
            parts: [
              {
                body: { data: Buffer.from(html).toString("base64url") },
                mimeType: "text/html",
              },
            ],
          },
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        }
      )
    );

  const result = await Effect.runPromise(
    fetchMessageFull("token", "m1", {
      fetcher,
      baseUrl: "https://example.test",
    })
  );

  expect(result).toEqual({
    from: "newsletter@example.com",
    gmailId: "m1",
    html,
    receivedAt: 1_700_000_000_000,
    subject: "Hi",
  });
});

test("withFreshToken uses refreshed token when expired", async () => {
  const getTokens = async () => ({
    accessToken: "old",
    expiresAt: Date.now() - 1,
    refreshToken: "refresh",
  });

  const refreshTokens = async () => ({
    accessToken: "new",
    expiresAt: Date.now() + 60_000,
    refreshToken: "refresh",
  });

  const result = await Effect.runPromise(
    withFreshToken(
      getTokens,
      async () => undefined,
      (accessToken) => Effect.succeed(accessToken),
      { refreshTokens }
    )
  );

  expect(result).toBe("new");
});

test("withFreshToken uses existing token when not expired", async () => {
  const getTokens = async () => ({
    accessToken: "current",
    expiresAt: Date.now() + 60_000,
    refreshToken: "refresh",
  });

  const refreshTokens = () =>
    Promise.reject(new Error("refresh should not be called"));

  const result = await Effect.runPromise(
    withFreshToken(
      getTokens,
      async () => undefined,
      (accessToken) => Effect.succeed(accessToken),
      { refreshTokens }
    )
  );

  expect(result).toBe("current");
});
