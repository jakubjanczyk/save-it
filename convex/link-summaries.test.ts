import type { FunctionReference } from "convex/server";
import { makeFunctionReference } from "convex/server";
import type { GenericId } from "convex/values";
import { convexTest } from "convex-test";
import { beforeEach, expect, test, vi } from "vitest";

import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const generateTextMock = vi.fn();

vi.mock("ai", () => ({
  Output: { object: () => ({}) },
  generateText: (...args: unknown[]) => generateTextMock(...args),
}));

beforeEach(() => {
  generateTextMock.mockReset();
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test";
});

const generateSummary: FunctionReference<
  "action",
  "internal",
  { linkId: GenericId<"links"> },
  null
> = makeFunctionReference(
  "links:generateSummary"
) as unknown as FunctionReference<
  "action",
  "internal",
  { linkId: GenericId<"links"> },
  null
>;

function withMockFetch(impl: typeof fetch) {
  const original = globalThis.fetch;
  vi.stubGlobal("fetch", impl);
  return () => {
    vi.stubGlobal("fetch", original);
  };
}

test("generateSummary stores article summary outputs", async () => {
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
      from: "a@example.com",
      gmailId: "g1",
      markedAsRead: false,
      receivedAt: Date.now(),
      senderId,
      subject: "Hello",
    })
  );

  const linkId = await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Desc",
      emailId,
      savedAt: Date.now(),
      status: "saved",
      title: "Source title",
      url: "https://example.com/post",
      summaryStatus: "pending",
      summaryAttemptCount: 1,
    })
  );

  const restoreFetch = withMockFetch((input) => {
    const url = new URL(typeof input === "string" ? input : input.toString());
    if (url.hostname === "example.com") {
      return Promise.resolve(
        new Response(
          `<html><head><title>Title Tag</title></head><body><main>${"word ".repeat(
            300
          )}</main></body></html>`,
          { headers: { "content-type": "text/html" }, status: 200 }
        )
      );
    }
    return Promise.resolve(new Response("not found", { status: 404 }));
  });

  generateTextMock.mockResolvedValue({
    output: {
      tldr: "TL;DR",
      worthReading: "yes",
      worthReadingReason: "Reason",
      credibility: "high",
      credibilityReason: "Cred reason",
      longSummary: "Long summary",
    },
  });

  try {
    await t.action(generateSummary, { linkId });
  } finally {
    restoreFetch();
  }

  const updated = await t.run((ctx) => ctx.db.get(linkId));
  expect(updated?.summaryStatus).toBe("success");
  expect(updated?.summaryContentKind).toBe("article");
  expect(updated?.summaryTldr).toBe("TL;DR");
  expect(updated?.summaryWorthReading).toBe("yes");
  expect(updated?.summaryCredibility).toBe("high");
  expect(updated?.summaryLongSummary).toBe("Long summary");
});

test("generateSummary stores github summary without longSummary", async () => {
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
      from: "a@example.com",
      gmailId: "g1",
      markedAsRead: false,
      receivedAt: Date.now(),
      senderId,
      subject: "Hello",
    })
  );

  const linkId = await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Desc",
      emailId,
      savedAt: Date.now(),
      status: "saved",
      title: "Source title",
      url: "https://github.com/openai/openai",
      summaryStatus: "pending",
      summaryAttemptCount: 1,
    })
  );

  const restoreFetch = withMockFetch((input) => {
    const url = new URL(typeof input === "string" ? input : input.toString());
    if (url.hostname === "github.com") {
      return Promise.resolve(
        new Response(
          `<html><body><main>${"word ".repeat(300)}</main></body></html>`,
          { headers: { "content-type": "text/html" }, status: 200 }
        )
      );
    }
    return Promise.resolve(new Response("not found", { status: 404 }));
  });

  generateTextMock.mockResolvedValue({
    output: {
      tldr: "TL;DR",
      worthReading: "maybe",
      worthReadingReason: "Reason",
      credibility: "unknown",
      credibilityReason: "Cred reason",
    },
  });

  try {
    await t.action(generateSummary, { linkId });
  } finally {
    restoreFetch();
  }

  const updated = await t.run((ctx) => ctx.db.get(linkId));
  expect(updated?.summaryStatus).toBe("success");
  expect(updated?.summaryContentKind).toBe("github");
  expect(updated?.summaryLongSummary).toBeUndefined();
});
