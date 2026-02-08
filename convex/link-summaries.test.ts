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

const retrySummary: FunctionReference<
  "action",
  "public",
  { linkId: GenericId<"links"> },
  null
> = makeFunctionReference("links:retrySummary");

function withMockFetch(impl: typeof fetch) {
  const original = globalThis.fetch;
  vi.stubGlobal("fetch", impl);
  return () => {
    vi.stubGlobal("fetch", original);
  };
}

async function settleScheduledFunctions(t: ReturnType<typeof convexTest>) {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
  await t.finishInProgressScheduledFunctions();
}

async function settleScheduledFunctionsWithFakeTimers(
  t: ReturnType<typeof convexTest>
) {
  for (let i = 0; i < 50; i++) {
    await vi.runOnlyPendingTimersAsync();
    await t.finishInProgressScheduledFunctions();

    const jobs = (await t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect()
    )) as Array<{ state: { kind: string } }>;

    const unsettled = jobs.filter(
      (job) => job.state.kind === "pending" || job.state.kind === "inProgress"
    );
    if (unsettled.length === 0) {
      return;
    }
  }

  throw new Error("Timed out waiting for scheduled functions to settle");
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
  expect(updated?.summaryTldr).toBe("TL;DR");
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
    },
  });

  try {
    await t.action(generateSummary, { linkId });
  } finally {
    restoreFetch();
  }

  const updated = await t.run((ctx) => ctx.db.get(linkId));
  expect(updated?.summaryStatus).toBe("success");
  expect(updated?.summaryLongSummary).toBeUndefined();
});

test("retrySummary increments attempt count and re-queues generateSummary", async () => {
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
      summaryAttemptCount: 1,
      summaryErrorMessage: "Old error",
      summaryErrorStage: "llm",
      summaryStatus: "failed",
    })
  );

  const restoreFetch = withMockFetch((input) => {
    const url = new URL(typeof input === "string" ? input : input.toString());
    if (url.hostname === "example.com") {
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
      longSummary: "Long summary",
    },
  });

  try {
    await t.action(retrySummary, { linkId });
    await settleScheduledFunctions(t);
  } finally {
    restoreFetch();
  }

  const updated = await t.run((ctx) => ctx.db.get(linkId));
  expect(updated?.summaryAttemptCount).toBe(2);
  expect(updated?.summaryStatus).toBe("success");

  const jobs = (await t.run((ctx) =>
    ctx.db.system.query("_scheduled_functions").collect()
  )) as Array<{ name: string }>;
  expect(jobs.some((job) => job.name === "links:generateSummary")).toBe(true);
});

test("retrySummary clears errors and sets summaryStatus=pending before job runs", async () => {
  vi.useFakeTimers();
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
      summaryAttemptCount: 1,
      summaryErrorMessage: "Old error",
      summaryErrorStage: "llm",
      summaryStatus: "failed",
    })
  );

  const restoreFetch = withMockFetch(() =>
    Promise.resolve(
      new Response("not html", {
        headers: { "content-type": "text/plain" },
        status: 200,
      })
    )
  );

  try {
    await t.action(retrySummary, { linkId });

    const updated = await t.run((ctx) => ctx.db.get(linkId));
    expect(updated?.summaryAttemptCount).toBe(2);
    expect(updated?.summaryStatus).toBe("pending");
    expect(updated?.summaryErrorStage).toBeUndefined();
    expect(updated?.summaryErrorMessage).toBeUndefined();

    const jobs = (await t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect()
    )) as Array<{ name: string }>;
    expect(jobs.some((job) => job.name === "links:generateSummary")).toBe(true);

    await settleScheduledFunctionsWithFakeTimers(t);
  } finally {
    restoreFetch();
    vi.useRealTimers();
  }
});

test("generateSummary skips LLM when page requires JavaScript", async () => {
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

  const restoreFetch = withMockFetch(() =>
    Promise.resolve(
      new Response(
        "<html><body><noscript>JavaScript is not available</noscript></body></html>",
        { headers: { "content-type": "text/html" }, status: 200 }
      )
    )
  );

  try {
    await t.action(generateSummary, { linkId });
  } finally {
    restoreFetch();
  }

  expect(generateTextMock).not.toHaveBeenCalled();

  const updated = await t.run((ctx) => ctx.db.get(linkId));
  expect(updated?.summaryStatus).toBe("failed");
  expect(updated?.summaryErrorStage).toBe("extract");
  expect(updated?.summaryErrorMessage?.toLowerCase()).toContain("javascript");
});

test("retrySummary throws for non-saved links", async () => {
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
      status: "pending",
      title: "Source title",
      url: "https://example.com/post",
    })
  );

  await expect(t.action(retrySummary, { linkId })).rejects.toThrow();
});
