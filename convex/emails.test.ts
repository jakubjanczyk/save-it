import type { FunctionReference } from "convex/server";
import { makeFunctionReference } from "convex/server";
import type { GenericId } from "convex/values";
import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";

import { EMAIL_FETCH_LIMIT_SETTING_KEY } from "../lib/settings-keys";

import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

interface GoogleTokens extends Record<string, unknown> {
  accessToken: string;
  expiresAt: number;
  refreshToken: string;
}

interface EmailListItem {
  _id: GenericId<"emails">;
  extractionError: boolean;
  from: string;
  gmailId: string;
  pendingLinkCount: number;
  receivedAt: number;
  subject: string;
}

const addSender: FunctionReference<
  "mutation",
  "public",
  { email: string; name?: string },
  GenericId<"senders">
> = makeFunctionReference("senders:addSender");

const saveTokens: FunctionReference<
  "mutation",
  "public",
  GoogleTokens,
  string
> = makeFunctionReference("googleauth:saveTokens");

const fetchFromGmail: FunctionReference<
  "action",
  "public",
  Record<string, never>,
  { fetched: number }
> = makeFunctionReference("emails:fetchFromGmail");

const listWithPendingLinks: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  EmailListItem[]
> = makeFunctionReference("emails:listWithPendingLinks");

const markAsRead: FunctionReference<
  "action",
  "public",
  { emailId: GenericId<"emails"> },
  { discarded: number }
> = makeFunctionReference("emails:markAsRead");

const archiveEmail: FunctionReference<
  "action",
  "public",
  { emailId: GenericId<"emails"> },
  { discarded: number }
> = makeFunctionReference("emails:archive");

const retrySyncEmail: FunctionReference<
  "action",
  "public",
  { emailId: GenericId<"emails"> },
  { status: "success" | "error"; storedLinkCount: number }
> = makeFunctionReference("emails:retrySyncEmail");

const setSetting: FunctionReference<
  "mutation",
  "public",
  { key: string; value: string },
  null
> = makeFunctionReference("settings:set");

const storeLinks: FunctionReference<
  "mutation",
  "internal",
  {
    emailId: GenericId<"emails">;
    links: { description: string; title: string; url: string }[];
  },
  { inserted: number }
> = makeFunctionReference("emails:storeLinks") as unknown as FunctionReference<
  "mutation",
  "internal",
  {
    emailId: GenericId<"emails">;
    links: { description: string; title: string; url: string }[];
  },
  { inserted: number }
>;

function encodeBase64Url(value: string) {
  const base64 = Buffer.from(value, "utf-8").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function withMockFetch(impl: typeof fetch) {
  const original = globalThis.fetch;
  vi.stubGlobal("fetch", impl);
  return () => {
    vi.stubGlobal("fetch", original);
  };
}

test("fetchFromGmail returns fetched=1 for a new email", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(addSender, { email: "*@substack.com" });
  await t.mutation(saveTokens, {
    accessToken: "access",
    expiresAt: Date.now() + 60_000,
    refreshToken: "refresh",
  });

  const restoreFetch = withMockFetch((input) => {
    const url = new URL(typeof input === "string" ? input : input.toString());

    if (url.pathname === "/gmail/v1/users/me/messages") {
      return Promise.resolve(
        new Response(JSON.stringify({ messages: [{ id: "m1" }] }), {
          headers: { "content-type": "application/json" },
          status: 200,
        })
      );
    }

    if (url.pathname === "/gmail/v1/users/me/messages/m1") {
      const html = `<a href="https://substack.com/app-link/post/abc">Read</a>`;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: "m1",
            internalDate: "1700000000000",
            payload: {
              headers: [
                { name: "From", value: "newsletter@substack.com" },
                { name: "Subject", value: "Hello" },
              ],
              parts: [
                {
                  body: { data: encodeBase64Url(html) },
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
    }

    return Promise.resolve(new Response("not found", { status: 404 }));
  });

  try {
    const result = await t.action(fetchFromGmail, {});
    expect(result.fetched).toBe(1);
  } finally {
    restoreFetch();
  }
});

test("fetchFromGmail uses configured email fetch limit", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(addSender, { email: "*@substack.com" });
  await t.mutation(saveTokens, {
    accessToken: "access",
    expiresAt: Date.now() + 60_000,
    refreshToken: "refresh",
  });
  await t.mutation(setSetting, {
    key: EMAIL_FETCH_LIMIT_SETTING_KEY,
    value: "2",
  });

  const restoreFetch = withMockFetch((input) => {
    const url = new URL(typeof input === "string" ? input : input.toString());

    if (url.pathname === "/gmail/v1/users/me/messages") {
      expect(url.searchParams.get("maxResults")).toBe("2");
      return Promise.resolve(
        new Response(JSON.stringify({ messages: [{ id: "m1" }] }), {
          headers: { "content-type": "application/json" },
          status: 200,
        })
      );
    }

    if (url.pathname === "/gmail/v1/users/me/messages/m1") {
      const html = `<a href="https://substack.com/app-link/post/abc">Read</a>`;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: "m1",
            internalDate: "1700000000000",
            payload: {
              headers: [
                { name: "From", value: "newsletter@substack.com" },
                { name: "Subject", value: "Hello" },
              ],
              parts: [
                {
                  body: { data: encodeBase64Url(html) },
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
    }

    return Promise.resolve(new Response("not found", { status: 404 }));
  });

  try {
    await t.action(fetchFromGmail, {});
  } finally {
    restoreFetch();
  }
});

test("fetchFromGmail throws when a sync is already running", async () => {
  const t = convexTest(schema, modules);
  const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1000);

  try {
    await t.mutation(addSender, { email: "*@substack.com" });
    await t.mutation(saveTokens, {
      accessToken: "access",
      expiresAt: 2000,
      refreshToken: "refresh",
    });

    await t.run((ctx) =>
      ctx.db.insert("syncRuns", {
        lastHeartbeatAt: 1000,
        progress: {
          fetchedEmails: 0,
          insertedEmails: 0,
          processedEmails: 0,
          storedLinks: 0,
        },
        startedAt: 1000,
        status: "running",
      })
    );

    await expect(t.action(fetchFromGmail, {})).rejects.toThrow(
      "Sync already in progress"
    );
  } finally {
    nowSpy.mockRestore();
  }
});

test("fetchFromGmail updates sync run heartbeat on a fixed interval while running", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(0);

  const t = convexTest(schema, modules);

  await t.mutation(addSender, { email: "*@substack.com" });
  await t.mutation(saveTokens, {
    accessToken: "access",
    expiresAt: Date.now() + 60_000,
    refreshToken: "refresh",
  });

  const messageResponse = Promise.withResolvers<Response>();

  const restoreFetch = withMockFetch((input) => {
    const url = new URL(typeof input === "string" ? input : input.toString());

    if (url.pathname === "/gmail/v1/users/me/messages") {
      return Promise.resolve(
        new Response(JSON.stringify({ messages: [{ id: "m1" }] }), {
          headers: { "content-type": "application/json" },
          status: 200,
        })
      );
    }

    if (url.pathname === "/gmail/v1/users/me/messages/m1") {
      return messageResponse.promise;
    }

    return Promise.resolve(new Response("not found", { status: 404 }));
  });

  try {
    const actionPromise = t.action(fetchFromGmail, {});

    let runId: GenericId<"syncRuns"> | undefined;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const runs = await t.run((ctx) => ctx.db.query("syncRuns").collect());
      if (runs.length === 1) {
        runId = runs[0]?._id;
        break;
      }
      await Promise.resolve();
    }

    if (!runId) {
      throw new Error("Expected sync run to be created");
    }

    const initial = await t.run((ctx) => ctx.db.get(runId));
    const initialHeartbeat = initial?.lastHeartbeatAt;
    expect(initialHeartbeat).toBeTypeOf("number");

    await vi.advanceTimersByTimeAsync(30_000);

    const updated = await t.run((ctx) => ctx.db.get(runId));
    expect(updated?.lastHeartbeatAt).toBeGreaterThan(
      initialHeartbeat as number
    );

    const html = `<a href="https://substack.com/app-link/post/abc">Read</a>`;
    messageResponse.resolve(
      new Response(
        JSON.stringify({
          id: "m1",
          internalDate: "1700000000000",
          payload: {
            headers: [
              { name: "From", value: "newsletter@substack.com" },
              { name: "Subject", value: "Hello" },
            ],
            parts: [
              {
                body: { data: encodeBase64Url(html) },
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

    await actionPromise;
  } finally {
    restoreFetch();
    vi.useRealTimers();
  }
});

test("fetchFromGmail stops heartbeats after completion", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(0);

  const t = convexTest(schema, modules);

  await t.mutation(addSender, { email: "*@substack.com" });
  await t.mutation(saveTokens, {
    accessToken: "access",
    expiresAt: Date.now() + 60_000,
    refreshToken: "refresh",
  });

  const restoreFetch = withMockFetch((input) => {
    const url = new URL(typeof input === "string" ? input : input.toString());

    if (url.pathname === "/gmail/v1/users/me/messages") {
      return Promise.resolve(
        new Response(JSON.stringify({ messages: [{ id: "m1" }] }), {
          headers: { "content-type": "application/json" },
          status: 200,
        })
      );
    }

    if (url.pathname === "/gmail/v1/users/me/messages/m1") {
      const html = `<a href="https://substack.com/app-link/post/abc">Read</a>`;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: "m1",
            internalDate: "1700000000000",
            payload: {
              headers: [
                { name: "From", value: "newsletter@substack.com" },
                { name: "Subject", value: "Hello" },
              ],
              parts: [
                {
                  body: { data: encodeBase64Url(html) },
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
    }

    return Promise.resolve(new Response("not found", { status: 404 }));
  });

  try {
    await t.action(fetchFromGmail, {});

    const runs = await t.run((ctx) => ctx.db.query("syncRuns").collect());
    expect(runs).toHaveLength(1);

    const [run] = runs;
    if (!run) {
      throw new Error("Expected a sync run");
    }
    const runId = run._id;
    const finished = await t.run((ctx) => ctx.db.get(runId));
    const lastHeartbeatAt = finished?.lastHeartbeatAt;
    expect(lastHeartbeatAt).toBeTypeOf("number");

    await vi.advanceTimersByTimeAsync(120_000);

    const stillFinished = await t.run((ctx) => ctx.db.get(runId));
    expect(stillFinished?.lastHeartbeatAt).toBe(lastHeartbeatAt);
  } finally {
    restoreFetch();
    vi.useRealTimers();
  }
});

test("fetchFromGmail stops heartbeats after failure", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(0);

  const t = convexTest(schema, modules);

  await t.mutation(addSender, { email: "*@substack.com" });

  try {
    await expect(t.action(fetchFromGmail, {})).rejects.toThrow();

    const runs = await t.run((ctx) => ctx.db.query("syncRuns").collect());
    expect(runs).toHaveLength(1);

    const [run] = runs;
    if (!run) {
      throw new Error("Expected a sync run");
    }
    const runId = run._id;
    const finished = await t.run((ctx) => ctx.db.get(runId));
    const lastHeartbeatAt = finished?.lastHeartbeatAt;
    expect(lastHeartbeatAt).toBeTypeOf("number");

    await vi.advanceTimersByTimeAsync(120_000);

    const stillFinished = await t.run((ctx) => ctx.db.get(runId));
    expect(stillFinished?.lastHeartbeatAt).toBe(lastHeartbeatAt);
  } finally {
    vi.useRealTimers();
  }
});

test("fetchFromGmail stores link titles", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(addSender, { email: "*@substack.com" });
  await t.mutation(saveTokens, {
    accessToken: "access",
    expiresAt: Date.now() + 60_000,
    refreshToken: "refresh",
  });

  const restoreFetch = withMockFetch((input) => {
    const url = new URL(typeof input === "string" ? input : input.toString());

    if (url.pathname === "/gmail/v1/users/me/messages") {
      return Promise.resolve(
        new Response(JSON.stringify({ messages: [{ id: "m1" }] }), {
          headers: { "content-type": "application/json" },
          status: 200,
        })
      );
    }

    if (url.pathname === "/gmail/v1/users/me/messages/m1") {
      const html = `<a href="https://substack.com/app-link/post/abc">Read</a>`;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: "m1",
            internalDate: "1700000000000",
            payload: {
              headers: [
                { name: "From", value: "newsletter@substack.com" },
                { name: "Subject", value: "Hello" },
              ],
              parts: [
                {
                  body: { data: encodeBase64Url(html) },
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
    }

    return Promise.resolve(new Response("not found", { status: 404 }));
  });

  try {
    await t.action(fetchFromGmail, {});
  } finally {
    restoreFetch();
  }

  const links = await t.run(
    async (ctx) => await ctx.db.query("links").collect()
  );
  expect(links).toHaveLength(1);
  expect(links[0]?.title).toBe("Hello");
});

test("fetchFromGmail creates a sync log entry", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(addSender, { email: "*@substack.com" });
  await t.mutation(saveTokens, {
    accessToken: "access",
    expiresAt: Date.now() + 60_000,
    refreshToken: "refresh",
  });

  const restoreFetch = withMockFetch((input) => {
    const url = new URL(typeof input === "string" ? input : input.toString());

    if (url.pathname === "/gmail/v1/users/me/messages") {
      return Promise.resolve(
        new Response(JSON.stringify({ messages: [{ id: "m1" }] }), {
          headers: { "content-type": "application/json" },
          status: 200,
        })
      );
    }

    if (url.pathname === "/gmail/v1/users/me/messages/m1") {
      const html = `<a href="https://substack.com/app-link/post/abc">Read</a>`;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: "m1",
            internalDate: "1700000000000",
            payload: {
              headers: [
                { name: "From", value: "newsletter@substack.com" },
                { name: "Subject", value: "Hello" },
              ],
              parts: [
                {
                  body: { data: encodeBase64Url(html) },
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
    }

    return Promise.resolve(new Response("not found", { status: 404 }));
  });

  try {
    await t.action(fetchFromGmail, {});
  } finally {
    restoreFetch();
  }

  const logs = await t.run((ctx) => ctx.db.query("syncLogs").collect());
  expect(logs).toHaveLength(1);
  expect(logs[0]?.status).toBe("success");
  expect(logs[0]?.storedLinkCount).toBe(1);
});

test("fetchFromGmail refreshes access token when expired", async () => {
  const t = convexTest(schema, modules);

  const previousClientId = process.env.GOOGLE_CLIENT_ID;
  const previousClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  process.env.GOOGLE_CLIENT_ID = "client-id";
  process.env.GOOGLE_CLIENT_SECRET = "client-secret";

  try {
    await t.mutation(addSender, { email: "*@substack.com" });
    await t.mutation(saveTokens, {
      accessToken: "expired",
      expiresAt: Date.now() - 1,
      refreshToken: "refresh",
    });

    const restoreFetch = withMockFetch((input, init) => {
      const url = new URL(typeof input === "string" ? input : input.toString());

      if (
        url.hostname === "oauth2.googleapis.com" &&
        url.pathname === "/token"
      ) {
        let body = "";

        if (typeof init?.body === "string") {
          body = init.body;
        } else if (init?.body instanceof URLSearchParams) {
          body = init.body.toString();
        }

        if (!body.includes("grant_type=refresh_token")) {
          return Promise.resolve(new Response("bad request", { status: 400 }));
        }

        return Promise.resolve(
          new Response(
            JSON.stringify({ access_token: "fresh", expires_in: 3600 }),
            {
              headers: { "content-type": "application/json" },
              status: 200,
            }
          )
        );
      }

      if (url.pathname === "/gmail/v1/users/me/messages") {
        return Promise.resolve(
          new Response(JSON.stringify({ messages: [{ id: "m1" }] }), {
            headers: { "content-type": "application/json" },
            status: 200,
          })
        );
      }

      if (url.pathname === "/gmail/v1/users/me/messages/m1") {
        const html = `<a href="https://substack.com/app-link/post/abc">Read</a>`;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: "m1",
              internalDate: "1700000000000",
              payload: {
                headers: [
                  { name: "From", value: "newsletter@substack.com" },
                  { name: "Subject", value: "Hello" },
                ],
                parts: [
                  {
                    body: { data: encodeBase64Url(html) },
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
      }

      return Promise.resolve(new Response("not found", { status: 404 }));
    });

    try {
      const result = await t.action(fetchFromGmail, {});
      expect(result.fetched).toBe(1);
    } finally {
      restoreFetch();
    }
  } finally {
    process.env.GOOGLE_CLIENT_ID = previousClientId;
    process.env.GOOGLE_CLIENT_SECRET = previousClientSecret;
  }
});

test("fetchFromGmail does not insert duplicates", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(addSender, { email: "*@substack.com" });
  await t.mutation(saveTokens, {
    accessToken: "access",
    expiresAt: Date.now() + 60_000,
    refreshToken: "refresh",
  });

  const restoreFetch = withMockFetch((input) => {
    const url = new URL(typeof input === "string" ? input : input.toString());

    if (url.pathname === "/gmail/v1/users/me/messages") {
      return Promise.resolve(
        new Response(JSON.stringify({ messages: [{ id: "m1" }] }), {
          headers: { "content-type": "application/json" },
          status: 200,
        })
      );
    }

    if (url.pathname === "/gmail/v1/users/me/messages/m1") {
      const html = `<a href="https://substack.com/app-link/post/abc">Read</a>`;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: "m1",
            internalDate: "1700000000000",
            payload: {
              headers: [
                { name: "From", value: "newsletter@substack.com" },
                { name: "Subject", value: "Hello" },
              ],
              parts: [
                {
                  body: { data: encodeBase64Url(html) },
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
    }

    return Promise.resolve(new Response("not found", { status: 404 }));
  });

  try {
    await t.action(fetchFromGmail, {});
    const result = await t.action(fetchFromGmail, {});
    expect(result.fetched).toBe(0);
  } finally {
    restoreFetch();
  }
});

test("listWithPendingLinks returns emails that have pending links", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(addSender, { email: "*@substack.com" });
  await t.mutation(saveTokens, {
    accessToken: "access",
    expiresAt: Date.now() + 60_000,
    refreshToken: "refresh",
  });

  const restoreFetch = withMockFetch((input) => {
    const url = new URL(typeof input === "string" ? input : input.toString());

    if (url.pathname === "/gmail/v1/users/me/messages") {
      return Promise.resolve(
        new Response(JSON.stringify({ messages: [{ id: "m1" }] }), {
          headers: { "content-type": "application/json" },
          status: 200,
        })
      );
    }

    if (url.pathname === "/gmail/v1/users/me/messages/m1") {
      const html = `<a href="https://substack.com/app-link/post/abc">Read</a>`;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: "m1",
            internalDate: "1700000000000",
            payload: {
              headers: [
                { name: "From", value: "newsletter@substack.com" },
                { name: "Subject", value: "Hello" },
              ],
              parts: [
                {
                  body: { data: encodeBase64Url(html) },
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
    }

    return Promise.resolve(new Response("not found", { status: 404 }));
  });

  try {
    await t.action(fetchFromGmail, {});
  } finally {
    restoreFetch();
  }

  const result = await t.query(listWithPendingLinks, {});
  expect(result).toHaveLength(1);
});

test("fetchFromGmail sets extractionError when extraction fails", async () => {
  const t = convexTest(schema, modules);

  const previousApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = undefined;

  try {
    await t.mutation(addSender, { email: "newsletter@example.com" });

    await t.mutation(saveTokens, {
      accessToken: "access",
      expiresAt: Date.now() + 60_000,
      refreshToken: "refresh",
    });

    const restoreFetch = withMockFetch((input) => {
      const url = new URL(typeof input === "string" ? input : input.toString());

      if (url.pathname === "/gmail/v1/users/me/messages") {
        return Promise.resolve(
          new Response(JSON.stringify({ messages: [{ id: "m1" }] }), {
            headers: { "content-type": "application/json" },
            status: 200,
          })
        );
      }

      if (url.pathname === "/gmail/v1/users/me/messages/m1") {
        const html = `<a href="https://example.com/a">A</a>`;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: "m1",
              internalDate: "1700000000000",
              payload: {
                headers: [
                  { name: "From", value: "newsletter@example.com" },
                  { name: "Subject", value: "Hello" },
                ],
                parts: [
                  {
                    body: { data: encodeBase64Url(html) },
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
      }

      return Promise.resolve(new Response("not found", { status: 404 }));
    });

    try {
      await t.action(fetchFromGmail, {});
    } finally {
      restoreFetch();
    }

    const items = await t.query(listWithPendingLinks, {});
    expect(items[0]?.extractionError).toBe(true);
  } finally {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = previousApiKey;
  }
});

test("retrySyncEmail stores links and logs the retry", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(addSender, { email: "*@substack.com" });
  await t.mutation(saveTokens, {
    accessToken: "access",
    expiresAt: Date.now() + 60_000,
    refreshToken: "refresh",
  });

  const previousApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = undefined;

  const restoreFetchInitial = withMockFetch((input) => {
    const url = new URL(typeof input === "string" ? input : input.toString());

    if (url.pathname === "/gmail/v1/users/me/messages") {
      return Promise.resolve(
        new Response(JSON.stringify({ messages: [{ id: "m1" }] }), {
          headers: { "content-type": "application/json" },
          status: 200,
        })
      );
    }

    if (url.pathname === "/gmail/v1/users/me/messages/m1") {
      const html = `<a href="https://example.com/a">A</a>`;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: "m1",
            internalDate: "1700000000000",
            payload: {
              headers: [
                { name: "From", value: "newsletter@substack.com" },
                { name: "Subject", value: "Hello" },
              ],
              parts: [
                {
                  body: { data: encodeBase64Url(html) },
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
    }

    return Promise.resolve(new Response("not found", { status: 404 }));
  });

  try {
    await t.action(fetchFromGmail, {});
  } finally {
    restoreFetchInitial();
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = previousApiKey;
  }

  const emails = await t.query(listWithPendingLinks, {});
  const emailId = emails[0]?._id;
  if (!emailId) {
    throw new Error("Expected emailId");
  }

  const restoreFetchRetry = withMockFetch((input) => {
    const url = new URL(typeof input === "string" ? input : input.toString());

    if (url.pathname === "/gmail/v1/users/me/messages/m1") {
      const html = `<a href="https://substack.com/app-link/post/abc">Read</a>`;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: "m1",
            internalDate: "1700000000000",
            payload: {
              headers: [
                { name: "From", value: "newsletter@substack.com" },
                { name: "Subject", value: "Hello" },
              ],
              parts: [
                {
                  body: { data: encodeBase64Url(html) },
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
    }

    return Promise.resolve(new Response("not found", { status: 404 }));
  });

  try {
    const result = await t.action(retrySyncEmail, { emailId });
    expect(result.status).toBe("success");
    expect(result.storedLinkCount).toBe(1);
  } finally {
    restoreFetchRetry();
  }

  const storedEmail = await t.run((ctx) => ctx.db.get(emailId));
  expect(storedEmail?.extractionError).toBe(false);

  const links = await t.run((ctx) =>
    ctx.db
      .query("links")
      .withIndex("by_emailId", (q) => q.eq("emailId", emailId))
      .collect()
  );
  expect(links).toHaveLength(1);

  const logs = await t.run((ctx) =>
    ctx.db
      .query("syncLogs")
      .withIndex("by_emailId_attemptedAt", (q) => q.eq("emailId", emailId))
      .collect()
  );
  expect(logs).toHaveLength(2);
});

test("listWithPendingLinks includes emails with actioned links but not marked as read", async () => {
  const t = convexTest(schema, modules);

  const senderId = await t.run((ctx) =>
    ctx.db.insert("senders", {
      createdAt: Date.now(),
      email: "newsletter@example.com",
    })
  );

  const emailId = await t.run((ctx) =>
    ctx.db.insert("emails", {
      extractionError: false,
      from: "newsletter@example.com",
      gmailId: "m1",
      markedAsRead: false,
      receivedAt: Date.now(),
      senderId,
      subject: "Hello",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Desc",
      emailId,
      raindropId: "r1",
      savedAt: Date.now(),
      status: "saved",
      title: "Title",
      url: "https://example.com/a",
    })
  );

  const result = await t.query(listWithPendingLinks, {});
  expect(result).toHaveLength(1);
  expect(result[0]?._id).toBe(emailId);
  expect(result[0]?.pendingLinkCount).toBe(0);
});

test("markAsRead calls Gmail modify endpoint", async () => {
  const t = convexTest(schema, modules);

  const senderId = await t.run((ctx) =>
    ctx.db.insert("senders", {
      createdAt: Date.now(),
      email: "newsletter@example.com",
    })
  );

  await t.mutation(saveTokens, {
    accessToken: "access",
    expiresAt: Date.now() + 60_000,
    refreshToken: "refresh",
  });

  const emailId = await t.run((ctx) =>
    ctx.db.insert("emails", {
      extractionError: false,
      from: "newsletter@example.com",
      gmailId: "m1",
      markedAsRead: false,
      receivedAt: Date.now(),
      senderId,
      subject: "Hello",
    })
  );

  const calls: Array<{ input: string; init?: RequestInit }> = [];

  const restoreFetch = withMockFetch((input, init) => {
    calls.push({ input: input.toString(), init });

    const url = new URL(typeof input === "string" ? input : input.toString());

    if (url.pathname === "/gmail/v1/users/me/messages/m1/modify") {
      return Promise.resolve(
        new Response(JSON.stringify({}), {
          headers: { "content-type": "application/json" },
          status: 200,
        })
      );
    }

    return Promise.resolve(new Response("not found", { status: 404 }));
  });

  try {
    await t.action(markAsRead, { emailId });
  } finally {
    restoreFetch();
  }

  expect(calls).toHaveLength(1);
  expect(calls[0]?.input).toContain("/gmail/v1/users/me/messages/m1/modify");
});

test("markAsRead discards pending links", async () => {
  const t = convexTest(schema, modules);

  const senderId = await t.run((ctx) =>
    ctx.db.insert("senders", {
      createdAt: Date.now(),
      email: "newsletter@example.com",
    })
  );

  await t.mutation(saveTokens, {
    accessToken: "access",
    expiresAt: Date.now() + 60_000,
    refreshToken: "refresh",
  });

  const emailId = await t.run((ctx) =>
    ctx.db.insert("emails", {
      extractionError: false,
      from: "newsletter@example.com",
      gmailId: "m1",
      markedAsRead: false,
      receivedAt: Date.now(),
      senderId,
      subject: "Hello",
    })
  );

  const pendingId = await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Pending",
      emailId,
      status: "pending",
      title: "Pending",
      url: "https://example.com/pending",
    })
  );

  const savedId = await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Saved",
      emailId,
      raindropId: "r1",
      savedAt: Date.now(),
      status: "saved",
      title: "Saved",
      url: "https://example.com/saved",
    })
  );

  const restoreFetch = withMockFetch((input) => {
    const url = new URL(typeof input === "string" ? input : input.toString());

    if (url.pathname === "/gmail/v1/users/me/messages/m1/modify") {
      return Promise.resolve(
        new Response(JSON.stringify({}), {
          headers: { "content-type": "application/json" },
          status: 200,
        })
      );
    }

    return Promise.resolve(new Response("not found", { status: 404 }));
  });

  try {
    const result = await t.action(markAsRead, { emailId });
    expect(result.discarded).toBe(1);
  } finally {
    restoreFetch();
  }

  const pending = await t.run((ctx) => ctx.db.get(pendingId));
  const saved = await t.run((ctx) => ctx.db.get(savedId));

  expect(pending?.status).toBe("discarded");
  expect(saved?.status).toBe("saved");
});

test("markAsRead updates email record", async () => {
  const t = convexTest(schema, modules);

  const senderId = await t.run((ctx) =>
    ctx.db.insert("senders", {
      createdAt: Date.now(),
      email: "newsletter@example.com",
    })
  );

  await t.mutation(saveTokens, {
    accessToken: "access",
    expiresAt: Date.now() + 60_000,
    refreshToken: "refresh",
  });

  const emailId = await t.run((ctx) =>
    ctx.db.insert("emails", {
      extractionError: false,
      from: "newsletter@example.com",
      gmailId: "m1",
      markedAsRead: false,
      receivedAt: Date.now(),
      senderId,
      subject: "Hello",
    })
  );

  const restoreFetch = withMockFetch((input) => {
    const url = new URL(typeof input === "string" ? input : input.toString());

    if (url.pathname === "/gmail/v1/users/me/messages/m1/modify") {
      return Promise.resolve(
        new Response(JSON.stringify({}), {
          headers: { "content-type": "application/json" },
          status: 200,
        })
      );
    }

    return Promise.resolve(new Response("not found", { status: 404 }));
  });

  try {
    await t.action(markAsRead, { emailId });
  } finally {
    restoreFetch();
  }

  const email = await t.run((ctx) => ctx.db.get(emailId));
  expect(email?.markedAsRead).toBe(true);
  expect(typeof email?.processedAt).toBe("number");
});

test("markAsRead does not discard links if Gmail call fails", async () => {
  const t = convexTest(schema, modules);

  const senderId = await t.run((ctx) =>
    ctx.db.insert("senders", {
      createdAt: Date.now(),
      email: "newsletter@example.com",
    })
  );

  await t.mutation(saveTokens, {
    accessToken: "access",
    expiresAt: Date.now() + 60_000,
    refreshToken: "refresh",
  });

  const emailId = await t.run((ctx) =>
    ctx.db.insert("emails", {
      extractionError: false,
      from: "newsletter@example.com",
      gmailId: "m1",
      markedAsRead: false,
      receivedAt: Date.now(),
      senderId,
      subject: "Hello",
    })
  );

  const pendingId = await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Pending",
      emailId,
      status: "pending",
      title: "Pending",
      url: "https://example.com/pending",
    })
  );

  const restoreFetch = withMockFetch((input) => {
    const url = new URL(typeof input === "string" ? input : input.toString());

    if (url.pathname === "/gmail/v1/users/me/messages/m1/modify") {
      return Promise.resolve(new Response("Unauthorized", { status: 401 }));
    }

    return Promise.resolve(new Response("not found", { status: 404 }));
  });

  try {
    await expect(t.action(markAsRead, { emailId })).rejects.toThrow();
  } finally {
    restoreFetch();
  }

  const pending = await t.run((ctx) => ctx.db.get(pendingId));
  expect(pending?.status).toBe("pending");
});

test("archive removes inbox label via Gmail modify endpoint", async () => {
  const t = convexTest(schema, modules);

  const senderId = await t.run((ctx) =>
    ctx.db.insert("senders", {
      createdAt: Date.now(),
      email: "newsletter@example.com",
    })
  );

  await t.mutation(saveTokens, {
    accessToken: "access",
    expiresAt: Date.now() + 60_000,
    refreshToken: "refresh",
  });

  const emailId = await t.run((ctx) =>
    ctx.db.insert("emails", {
      extractionError: false,
      from: "newsletter@example.com",
      gmailId: "m1",
      markedAsRead: false,
      receivedAt: Date.now(),
      senderId,
      subject: "Hello",
    })
  );

  const restoreFetch = withMockFetch((input, init) => {
    const url = new URL(typeof input === "string" ? input : input.toString());

    if (url.pathname === "/gmail/v1/users/me/messages/m1/modify") {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        removeLabelIds?: string[];
      };
      expect(body.removeLabelIds).toContain("INBOX");
      return Promise.resolve(
        new Response(JSON.stringify({}), {
          headers: { "content-type": "application/json" },
          status: 200,
        })
      );
    }

    return Promise.resolve(new Response("not found", { status: 404 }));
  });

  try {
    await t.action(archiveEmail, { emailId });
  } finally {
    restoreFetch();
  }
});

test("archive marks email as read in the database", async () => {
  const t = convexTest(schema, modules);

  const senderId = await t.run((ctx) =>
    ctx.db.insert("senders", {
      createdAt: Date.now(),
      email: "newsletter@example.com",
    })
  );

  await t.mutation(saveTokens, {
    accessToken: "access",
    expiresAt: Date.now() + 60_000,
    refreshToken: "refresh",
  });

  const emailId = await t.run((ctx) =>
    ctx.db.insert("emails", {
      extractionError: false,
      from: "newsletter@example.com",
      gmailId: "m1",
      markedAsRead: false,
      receivedAt: Date.now(),
      senderId,
      subject: "Hello",
    })
  );

  const restoreFetch = withMockFetch((input) => {
    const url = new URL(typeof input === "string" ? input : input.toString());

    if (url.pathname === "/gmail/v1/users/me/messages/m1/modify") {
      return Promise.resolve(
        new Response(JSON.stringify({}), {
          headers: { "content-type": "application/json" },
          status: 200,
        })
      );
    }

    return Promise.resolve(new Response("not found", { status: 404 }));
  });

  try {
    await t.action(archiveEmail, { emailId });
  } finally {
    restoreFetch();
  }

  const email = await t.run((ctx) => ctx.db.get(emailId));
  expect(email?.markedAsRead).toBe(true);
});

test("storeLinks skips inserting a duplicate url across emails", async () => {
  const t = convexTest(schema, modules);

  const senderId = await t.run((ctx) =>
    ctx.db.insert("senders", {
      createdAt: Date.now(),
      email: "newsletter@example.com",
    })
  );

  const email1Id = await t.run((ctx) =>
    ctx.db.insert("emails", {
      extractionError: false,
      from: "newsletter@example.com",
      gmailId: "m1",
      markedAsRead: false,
      receivedAt: Date.now(),
      senderId,
      subject: "Hello",
    })
  );

  const email2Id = await t.run((ctx) =>
    ctx.db.insert("emails", {
      extractionError: false,
      from: "newsletter@example.com",
      gmailId: "m2",
      markedAsRead: false,
      receivedAt: Date.now(),
      senderId,
      subject: "Hello again",
    })
  );

  const existingUrl = "https://example.com/duplicate";

  await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Existing",
      emailId: email1Id,
      status: "saved",
      title: "Existing title",
      url: existingUrl,
    })
  );

  const result = await t.mutation(storeLinks, {
    emailId: email2Id,
    links: [
      {
        description: "New",
        title: "New title",
        url: existingUrl,
      },
    ],
  });

  expect(result.inserted).toBe(0);

  const email2Links = await t.run((ctx) =>
    ctx.db
      .query("links")
      .withIndex("by_emailId", (q) => q.eq("emailId", email2Id))
      .collect()
  );

  expect(email2Links).toHaveLength(0);
});

test("storeLinks skips inserting a duplicate title across emails", async () => {
  const t = convexTest(schema, modules);

  const senderId = await t.run((ctx) =>
    ctx.db.insert("senders", {
      createdAt: Date.now(),
      email: "newsletter@example.com",
    })
  );

  const email1Id = await t.run((ctx) =>
    ctx.db.insert("emails", {
      extractionError: false,
      from: "newsletter@example.com",
      gmailId: "m1",
      markedAsRead: false,
      receivedAt: Date.now(),
      senderId,
      subject: "Hello",
    })
  );

  const email2Id = await t.run((ctx) =>
    ctx.db.insert("emails", {
      extractionError: false,
      from: "newsletter@example.com",
      gmailId: "m2",
      markedAsRead: false,
      receivedAt: Date.now(),
      senderId,
      subject: "Hello again",
    })
  );

  const existingTitle = "Duplicate title";

  await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Existing",
      emailId: email1Id,
      status: "discarded",
      title: existingTitle,
      url: "https://example.com/original",
    })
  );

  const result = await t.mutation(storeLinks, {
    emailId: email2Id,
    links: [
      {
        description: "New",
        title: existingTitle,
        url: "https://example.com/new-url",
      },
    ],
  });

  expect(result.inserted).toBe(0);

  const email2Links = await t.run((ctx) =>
    ctx.db
      .query("links")
      .withIndex("by_emailId", (q) => q.eq("emailId", email2Id))
      .collect()
  );

  expect(email2Links).toHaveLength(0);
});
