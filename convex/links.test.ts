import type { FunctionReference } from "convex/server";
import { makeFunctionReference } from "convex/server";
import type { GenericId } from "convex/values";
import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";

import {
  EMAIL_FINALIZE_ACTION_SETTING_KEY,
  RAINDROP_SYNC_ENABLED_SETTING_KEY,
} from "../lib/settings-keys";

import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

interface LinkListItem {
  _id: GenericId<"links">;
  description: string;
  emailId: GenericId<"emails">;
  status: "pending" | "processing" | "saved" | "discarded" | "archived";
  title: string;
  url: string;
}

const listByEmail: FunctionReference<
  "query",
  "public",
  { emailId: GenericId<"emails"> },
  LinkListItem[]
> = makeFunctionReference("links:listByEmail");

const listPendingFocus: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  Array<{ id: GenericId<"links">; email: { id: GenericId<"emails"> } }>
> = makeFunctionReference("links:listPendingFocus");

const listPendingFocusBatch: FunctionReference<
  "query",
  "public",
  { excludeIds?: GenericId<"links">[]; limit: number },
  Array<{ id: GenericId<"links">; email: { id: GenericId<"emails"> } }>
> = makeFunctionReference("links:listPendingFocusBatch");

const countPendingFocus: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  number
> = makeFunctionReference("links:countPendingFocus");

const discard: FunctionReference<
  "action",
  "public",
  { linkId: GenericId<"links"> },
  null
> = makeFunctionReference("links:discard");

const save: FunctionReference<
  "action",
  "public",
  { linkId: GenericId<"links"> },
  { raindropId: string | null }
> = makeFunctionReference("links:save");

const listSaved: FunctionReference<
  "query",
  "public",
  { cursor?: string; limit: number; sortOrder: "oldest" | "newest" },
  {
    continueCursor: string;
    isDone: boolean;
    items: Array<{
      id: GenericId<"links">;
      isFavorite: boolean;
      savedAt?: number;
      summaryAttemptCount?: number;
      summaryContentKind?: "article" | "github" | "other";
      summaryCredibility?: "high" | "medium" | "low" | "unknown";
      summaryCredibilityReason?: string;
      summaryErrorMessage?: string;
      summaryErrorStage?: "fetch" | "extract" | "llm" | "parse";
      summaryExtractedTitle?: string;
      summaryExtractedTitleSource?: "h1" | "og" | "twitter" | "title" | "llm";
      summaryLongSummary?: string;
      summaryModel?: string;
      summaryPromptVersion?: string;
      summaryStatus?: "pending" | "running" | "success" | "failed";
      summaryTldr?: string;
      summaryUpdatedAt?: number;
      summaryWorthReading?: "yes" | "maybe" | "no";
      summaryWorthReadingReason?: string;
    }>;
  }
> = makeFunctionReference("links:listSaved");

const archive: FunctionReference<
  "action",
  "public",
  { linkId: GenericId<"links"> },
  null
> = makeFunctionReference("links:archive");

const toggleFavoriteAction: FunctionReference<
  "action",
  "public",
  { linkId: GenericId<"links"> },
  { isFavorite: boolean }
> = makeFunctionReference("links:toggleFavoriteAction");

const setSummaryPending: FunctionReference<
  "mutation",
  "internal",
  { linkId: GenericId<"links"> },
  null
> = makeFunctionReference(
  "links:setSummaryPending"
) as unknown as FunctionReference<
  "mutation",
  "internal",
  { linkId: GenericId<"links"> },
  null
>;

const setSummaryRunning: FunctionReference<
  "mutation",
  "internal",
  {
    linkId: GenericId<"links">;
    model: string;
    promptVersion: string;
    contentKind: "article" | "github" | "other";
    extractedTitle?: string;
    extractedTitleSource?: "h1" | "og" | "twitter" | "title" | "llm";
  },
  null
> = makeFunctionReference(
  "links:setSummaryRunning"
) as unknown as FunctionReference<
  "mutation",
  "internal",
  {
    linkId: GenericId<"links">;
    model: string;
    promptVersion: string;
    contentKind: "article" | "github" | "other";
    extractedTitle?: string;
    extractedTitleSource?: "h1" | "og" | "twitter" | "title" | "llm";
  },
  null
>;

const setSummarySuccess: FunctionReference<
  "mutation",
  "internal",
  {
    linkId: GenericId<"links">;
    contentKind: "article" | "github" | "other";
    extractedTitle?: string;
    extractedTitleSource?: "h1" | "og" | "twitter" | "title" | "llm";
    tldr: string;
    worthReading: "yes" | "maybe" | "no";
    worthReadingReason: string;
    credibility: "high" | "medium" | "low" | "unknown";
    credibilityReason: string;
    longSummary?: string;
  },
  null
> = makeFunctionReference(
  "links:setSummarySuccess"
) as unknown as FunctionReference<
  "mutation",
  "internal",
  {
    linkId: GenericId<"links">;
    contentKind: "article" | "github" | "other";
    extractedTitle?: string;
    extractedTitleSource?: "h1" | "og" | "twitter" | "title" | "llm";
    tldr: string;
    worthReading: "yes" | "maybe" | "no";
    worthReadingReason: string;
    credibility: "high" | "medium" | "low" | "unknown";
    credibilityReason: string;
    longSummary?: string;
  },
  null
>;

const setSummaryFailed: FunctionReference<
  "mutation",
  "internal",
  {
    linkId: GenericId<"links">;
    stage: "fetch" | "extract" | "llm" | "parse";
    message: string;
  },
  null
> = makeFunctionReference(
  "links:setSummaryFailed"
) as unknown as FunctionReference<
  "mutation",
  "internal",
  {
    linkId: GenericId<"links">;
    stage: "fetch" | "extract" | "llm" | "parse";
    message: string;
  },
  null
>;

function withMockFetch(impl: typeof fetch) {
  const original = globalThis.fetch;
  vi.stubGlobal("fetch", impl);
  return () => {
    vi.stubGlobal("fetch", original);
  };
}

async function settleScheduledFunctions(t: ReturnType<typeof convexTest>) {
  for (let i = 0; i < 50; i++) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });

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

test("listByEmail returns empty array when there are no links", async () => {
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

  const result = await t.query(listByEmail, { emailId });

  expect(result).toEqual([]);
});

test("listByEmail returns links for the email", async () => {
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

  await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Desc",
      emailId,
      status: "pending",
      title: "Title",
      url: "https://example.com/a",
    })
  );

  const result = await t.query(listByEmail, { emailId });

  expect(result).toHaveLength(1);
});

test("discard updates link status to discarded", async () => {
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
      title: "Title",
      url: "https://example.com/a",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Desc 2",
      emailId,
      status: "pending",
      title: "Title 2",
      url: "https://example.com/b",
    })
  );

  await t.action(discard, { linkId });

  const links = await t.run((ctx) => ctx.db.query("links").collect());
  expect(links.find((link) => link._id === linkId)?.status).toBe("discarded");
});

test("save returns the created raindropId", async () => {
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
      title: "Title",
      url: "https://example.com/a",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Desc 2",
      emailId,
      status: "pending",
      title: "Title 2",
      url: "https://example.com/b",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("oauthTokens", {
      accessToken: "raindrop-access",
      type: "raindrop",
    })
  );

  const restoreFetch = withMockFetch(() =>
    Promise.resolve(
      new Response(JSON.stringify({ item: { _id: 777 } }), {
        headers: { "content-type": "application/json" },
        status: 200,
      })
    )
  );

  try {
    const result = await t.action(save, { linkId });
    expect(result.raindropId).toBe("777");
    await settleScheduledFunctions(t);
  } finally {
    restoreFetch();
  }
});

test("save updates link status to saved", async () => {
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
      title: "Title",
      url: "https://example.com/a",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Desc 2",
      emailId,
      status: "pending",
      title: "Title 2",
      url: "https://example.com/b",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("oauthTokens", {
      accessToken: "raindrop-access",
      type: "raindrop",
    })
  );

  const restoreFetch = withMockFetch(() =>
    Promise.resolve(
      new Response(JSON.stringify({ item: { _id: "r1" } }), {
        headers: { "content-type": "application/json" },
        status: 200,
      })
    )
  );

  try {
    await t.action(save, { linkId });
    await settleScheduledFunctions(t);
  } finally {
    restoreFetch();
  }

  const saved = await t.run((ctx) => ctx.db.get(linkId));
  expect(saved?.status).toBe("saved");
});

test("save sets summaryStatus pending and queues generateSummary", async () => {
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
      title: "Title",
      url: "https://example.com/a",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("settings", {
      createdAt: Date.now(),
      key: RAINDROP_SYNC_ENABLED_SETTING_KEY,
      updatedAt: Date.now(),
      value: "false",
    })
  );

  await t.action(save, { linkId });

  const updated = await t.run((ctx) => ctx.db.get(linkId));
  expect(updated?.status).toBe("saved");
  expect(
    ["pending", "running", "success", "failed"].includes(
      updated?.summaryStatus ?? ""
    )
  ).toBe(true);
  expect(updated?.summaryAttemptCount).toBe(1);

  const jobs = await t.run((ctx) =>
    ctx.db.system.query("_scheduled_functions").collect()
  );
  expect(
    jobs.filter((job) => job.name === "links:generateSummary")
  ).toHaveLength(1);

  await settleScheduledFunctions(t);
});

test("save initializes summaryStatus=pending before job runs", async () => {
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
      status: "pending",
      title: "Title",
      url: "https://example.com/a",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("settings", {
      createdAt: Date.now(),
      key: RAINDROP_SYNC_ENABLED_SETTING_KEY,
      updatedAt: Date.now(),
      value: "false",
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
    await t.action(save, { linkId });

    const updated = await t.run((ctx) => ctx.db.get(linkId));
    expect(updated?.summaryStatus).toBe("pending");
    expect(updated?.summaryAttemptCount).toBe(1);

    const jobs = await t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect()
    );
    expect(
      jobs.filter((job) => job.name === "links:generateSummary")
    ).toHaveLength(1);

    await settleScheduledFunctionsWithFakeTimers(t);
  } finally {
    restoreFetch();
    vi.useRealTimers();
  }
});

test("save does not re-queue summaries for already-saved links", async () => {
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
      title: "Title",
      url: "https://example.com/a",
      summaryAttemptCount: 5,
      summaryStatus: "success",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("settings", {
      createdAt: Date.now(),
      key: RAINDROP_SYNC_ENABLED_SETTING_KEY,
      updatedAt: Date.now(),
      value: "false",
    })
  );

  await t.action(save, { linkId });

  const updated = await t.run((ctx) => ctx.db.get(linkId));
  expect(updated?.summaryAttemptCount).toBe(5);
  expect(updated?.summaryStatus).toBe("success");

  const jobs = await t.run((ctx) =>
    ctx.db.system.query("_scheduled_functions").collect()
  );
  expect(
    jobs.filter((job) => job.name === "links:generateSummary")
  ).toHaveLength(0);
});

test("save throws when Raindrop is not connected", async () => {
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
      title: "Title",
      url: "https://example.com/a",
    })
  );

  await expect(t.action(save, { linkId })).rejects.toThrow(
    "Raindrop not connected"
  );
});

test("listPendingFocus excludes emails that are already marked as read", async () => {
  const t = convexTest(schema, modules);

  const senderId = await t.run((ctx) =>
    ctx.db.insert("senders", {
      createdAt: Date.now(),
      email: "newsletter@example.com",
    })
  );

  const activeEmailId = await t.run((ctx) =>
    ctx.db.insert("emails", {
      extractionError: false,
      from: "a@example.com",
      gmailId: "g1",
      markedAsRead: false,
      receivedAt: Date.now(),
      senderId,
      subject: "Active",
    })
  );

  const hiddenEmailId = await t.run((ctx) =>
    ctx.db.insert("emails", {
      extractionError: false,
      from: "a@example.com",
      gmailId: "g2",
      markedAsRead: true,
      receivedAt: Date.now(),
      senderId,
      subject: "Hidden",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Desc",
      emailId: activeEmailId,
      status: "pending",
      title: "Title",
      url: "https://example.com/a",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Desc",
      emailId: hiddenEmailId,
      status: "pending",
      title: "Title",
      url: "https://example.com/b",
    })
  );

  const result = await t.query(listPendingFocus, {});

  expect(result).toHaveLength(1);
  expect(result[0]?.email.id).toBe(activeEmailId);
});

test("listPendingFocus orders items oldest first", async () => {
  const t = convexTest(schema, modules);

  const senderId = await t.run((ctx) =>
    ctx.db.insert("senders", {
      createdAt: Date.now(),
      email: "newsletter@example.com",
    })
  );

  const olderEmailId = await t.run((ctx) =>
    ctx.db.insert("emails", {
      extractionError: false,
      from: "a@example.com",
      gmailId: "g-old",
      markedAsRead: false,
      receivedAt: Date.now() - 10_000,
      senderId,
      subject: "Older",
    })
  );

  const newerEmailId = await t.run((ctx) =>
    ctx.db.insert("emails", {
      extractionError: false,
      from: "a@example.com",
      gmailId: "g-new",
      markedAsRead: false,
      receivedAt: Date.now(),
      senderId,
      subject: "Newer",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Old link",
      emailId: olderEmailId,
      status: "pending",
      title: "Old title",
      url: "https://example.com/old",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "New link",
      emailId: newerEmailId,
      status: "pending",
      title: "New title",
      url: "https://example.com/new",
    })
  );

  const result = await t.query(listPendingFocus, {});

  expect(result.map((item) => item.email.id)).toEqual([
    olderEmailId,
    newerEmailId,
  ]);
});

test("listPendingFocusBatch respects limit", async () => {
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

  await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Desc",
      emailId,
      status: "pending",
      title: "Title",
      url: "https://example.com/a",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Desc 2",
      emailId,
      status: "pending",
      title: "Title 2",
      url: "https://example.com/b",
    })
  );

  const result = await t.query(listPendingFocusBatch, { limit: 1 });

  expect(result).toHaveLength(1);
});

test("listPendingFocusBatch excludes links from excludeIds", async () => {
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

  const linkA = await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Desc",
      emailId,
      status: "pending",
      title: "Title",
      url: "https://example.com/a",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Desc 2",
      emailId,
      status: "pending",
      title: "Title 2",
      url: "https://example.com/b",
    })
  );

  const result = await t.query(listPendingFocusBatch, {
    excludeIds: [linkA],
    limit: 10,
  });

  expect(result.some((item) => item.id === linkA)).toBe(false);
});

test("countPendingFocus excludes links from read emails", async () => {
  const t = convexTest(schema, modules);

  const senderId = await t.run((ctx) =>
    ctx.db.insert("senders", {
      createdAt: Date.now(),
      email: "newsletter@example.com",
    })
  );

  const unreadEmailId = await t.run((ctx) =>
    ctx.db.insert("emails", {
      extractionError: false,
      from: "a@example.com",
      gmailId: "g1",
      markedAsRead: false,
      receivedAt: Date.now(),
      senderId,
      subject: "Unread",
    })
  );

  const readEmailId = await t.run((ctx) =>
    ctx.db.insert("emails", {
      extractionError: false,
      from: "b@example.com",
      gmailId: "g2",
      markedAsRead: true,
      receivedAt: Date.now(),
      senderId,
      subject: "Read",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Desc",
      emailId: unreadEmailId,
      status: "pending",
      title: "Title",
      url: "https://example.com/unread",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Desc",
      emailId: readEmailId,
      status: "pending",
      title: "Title",
      url: "https://example.com/read",
    })
  );

  const count = await t.query(countPendingFocus, {});

  expect(count).toBe(1);
});

test("countPendingFocus excludes links that are not pending", async () => {
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

  await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Desc",
      emailId,
      status: "pending",
      title: "Title",
      url: "https://example.com/pending",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Desc",
      emailId,
      status: "saved",
      title: "Title",
      url: "https://example.com/saved",
    })
  );

  const count = await t.query(countPendingFocus, {});

  expect(count).toBe(1);
});

test("save marks email as read when it saves the last pending link", async () => {
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
      gmailId: "m1",
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
      title: "Title",
      url: "https://example.com/a",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("oauthTokens", {
      accessToken: "raindrop-access",
      type: "raindrop",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("oauthTokens", {
      accessToken: "gmail-access",
      expiresAt: Date.now() + 60_000,
      refreshToken: "refresh",
      type: "google",
    })
  );

  const restoreFetch = withMockFetch((input) => {
    const url = new URL(typeof input === "string" ? input : input.toString());

    if (url.pathname === "/rest/v1/raindrop") {
      return Promise.resolve(
        new Response(JSON.stringify({ item: { _id: 777 } }), {
          headers: { "content-type": "application/json" },
          status: 200,
        })
      );
    }

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
    await t.action(save, { linkId });
    await settleScheduledFunctions(t);
  } finally {
    restoreFetch();
  }

  const email = await t.run((ctx) => ctx.db.get(emailId));
  expect(email?.markedAsRead).toBe(true);
});

test("discard marks email as read when it discards the last pending link", async () => {
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
      gmailId: "m1",
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
      title: "Title",
      url: "https://example.com/a",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("oauthTokens", {
      accessToken: "gmail-access",
      expiresAt: Date.now() + 60_000,
      refreshToken: "refresh",
      type: "google",
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
    await t.action(discard, { linkId });
  } finally {
    restoreFetch();
  }

  const email = await t.run((ctx) => ctx.db.get(emailId));
  expect(email?.markedAsRead).toBe(true);
});

test("discard archives email when setting prefers archive and it discards the last pending link", async () => {
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
      gmailId: "m1",
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
      title: "Title",
      url: "https://example.com/a",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("oauthTokens", {
      accessToken: "gmail-access",
      expiresAt: Date.now() + 60_000,
      refreshToken: "refresh",
      type: "google",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("settings", {
      createdAt: Date.now(),
      key: EMAIL_FINALIZE_ACTION_SETTING_KEY,
      updatedAt: Date.now(),
      value: "archive",
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
    await t.action(discard, { linkId });
  } finally {
    restoreFetch();
  }
});

test("listSaved returns only saved links", async () => {
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

  await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Desc",
      emailId,
      savedAt: Date.now() - 1000,
      status: "saved",
      title: "Saved Link",
      url: "https://example.com/saved",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Desc",
      emailId,
      status: "pending",
      title: "Pending Link",
      url: "https://example.com/pending",
    })
  );

  const result = await t.query(listSaved, { limit: 10, sortOrder: "oldest" });

  expect(result.items).toHaveLength(1);
  expect(result.items[0]?.savedAt).toBeDefined();
});

test("listSaved includes summary fields when present", async () => {
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

  const summaryUpdatedAt = Date.now();
  await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Desc",
      emailId,
      savedAt: Date.now(),
      status: "saved",
      title: "Saved Link",
      url: "https://example.com/saved",
      summaryAttemptCount: 2,
      summaryContentKind: "article",
      summaryCredibility: "high",
      summaryCredibilityReason: "Has citations and author bio",
      summaryExtractedTitle: "Best Title",
      summaryExtractedTitleSource: "h1",
      summaryLongSummary: "Long summary here",
      summaryModel: "gemini-test",
      summaryPromptVersion: "v0",
      summaryStatus: "success",
      summaryTldr: "TL;DR here",
      summaryUpdatedAt,
      summaryWorthReading: "yes",
      summaryWorthReadingReason: "Useful takeaways",
    })
  );

  const result = await t.query(listSaved, { limit: 10, sortOrder: "oldest" });

  expect(result.items).toHaveLength(1);
  expect(result.items[0]?.summaryStatus).toBe("success");
  expect(result.items[0]?.summaryContentKind).toBe("article");
  expect(result.items[0]?.summaryExtractedTitle).toBe("Best Title");
  expect(result.items[0]?.summaryExtractedTitleSource).toBe("h1");
  expect(result.items[0]?.summaryTldr).toBe("TL;DR here");
  expect(result.items[0]?.summaryWorthReading).toBe("yes");
  expect(result.items[0]?.summaryWorthReadingReason).toBe("Useful takeaways");
  expect(result.items[0]?.summaryCredibility).toBe("high");
  expect(result.items[0]?.summaryCredibilityReason).toBe(
    "Has citations and author bio"
  );
  expect(result.items[0]?.summaryLongSummary).toBe("Long summary here");
  expect(result.items[0]?.summaryModel).toBe("gemini-test");
  expect(result.items[0]?.summaryPromptVersion).toBe("v0");
  expect(result.items[0]?.summaryAttemptCount).toBe(2);
  expect(result.items[0]?.summaryUpdatedAt).toBe(summaryUpdatedAt);
});

test("listSaved respects sort order", async () => {
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

  const olderLinkId = await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Desc",
      emailId,
      savedAt: Date.now() - 10_000,
      status: "saved",
      title: "Older Link",
      url: "https://example.com/older",
    })
  );

  const newerLinkId = await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Desc",
      emailId,
      savedAt: Date.now(),
      status: "saved",
      title: "Newer Link",
      url: "https://example.com/newer",
    })
  );

  const oldestFirst = await t.query(listSaved, {
    limit: 10,
    sortOrder: "oldest",
  });
  expect(oldestFirst.items[0]?.id).toBe(olderLinkId);
  expect(oldestFirst.items[1]?.id).toBe(newerLinkId);

  const newestFirst = await t.query(listSaved, {
    limit: 10,
    sortOrder: "newest",
  });
  expect(newestFirst.items[0]?.id).toBe(newerLinkId);
  expect(newestFirst.items[1]?.id).toBe(olderLinkId);
});

test("archive sets status to archived", async () => {
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
      title: "Title",
      url: "https://example.com/a",
    })
  );

  await t.action(archive, { linkId });

  const link = await t.run((ctx) => ctx.db.get(linkId));
  expect(link?.status).toBe("archived");
  expect(link?.archivedAt).toBeDefined();
});

test("archive calls Raindrop DELETE when raindropId exists and sync enabled", async () => {
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
      raindropId: "123",
      savedAt: Date.now(),
      status: "saved",
      title: "Title",
      url: "https://example.com/a",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("oauthTokens", {
      accessToken: "raindrop-access",
      type: "raindrop",
    })
  );

  let deleteCalled = false;
  const restoreFetch = withMockFetch((input) => {
    const url = new URL(typeof input === "string" ? input : input.toString());
    if (url.pathname === "/rest/v1/raindrop/123") {
      deleteCalled = true;
      return Promise.resolve(
        new Response(JSON.stringify({ result: true }), {
          headers: { "content-type": "application/json" },
          status: 200,
        })
      );
    }
    return Promise.resolve(new Response("not found", { status: 404 }));
  });

  try {
    await t.action(archive, { linkId });
    expect(deleteCalled).toBe(true);
  } finally {
    restoreFetch();
  }
});

test("toggleFavoriteAction toggles isFavorite field", async () => {
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
      isFavorite: false,
      status: "saved",
      title: "Title",
      url: "https://example.com/a",
    })
  );

  const result1 = await t.action(toggleFavoriteAction, { linkId });
  expect(result1.isFavorite).toBe(true);

  const link1 = await t.run((ctx) => ctx.db.get(linkId));
  expect(link1?.isFavorite).toBe(true);

  const result2 = await t.action(toggleFavoriteAction, { linkId });
  expect(result2.isFavorite).toBe(false);

  const link2 = await t.run((ctx) => ctx.db.get(linkId));
  expect(link2?.isFavorite).toBe(false);
});

test("save skips Raindrop when sync disabled", async () => {
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
      title: "Title",
      url: "https://example.com/a",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "Desc 2",
      emailId,
      status: "pending",
      title: "Title 2",
      url: "https://example.com/b",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("settings", {
      createdAt: Date.now(),
      key: RAINDROP_SYNC_ENABLED_SETTING_KEY,
      updatedAt: Date.now(),
      value: "false",
    })
  );

  let raindropCalled = false;
  const restoreFetch = withMockFetch(() => {
    raindropCalled = true;
    return Promise.resolve(
      new Response(JSON.stringify({ item: { _id: 777 } }), {
        headers: { "content-type": "application/json" },
        status: 200,
      })
    );
  });

  try {
    const result = await t.action(save, { linkId });
    expect(result.raindropId).toBe(null);
    expect(raindropCalled).toBe(false);
    await settleScheduledFunctions(t);
  } finally {
    restoreFetch();
  }

  const link = await t.run((ctx) => ctx.db.get(linkId));
  expect(link?.status).toBe("saved");
  expect(link?.raindropId).toBeUndefined();
});

test("setSummaryPending clears errors and increments attempt count", async () => {
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
      title: "Saved Link",
      url: "https://example.com/saved",
      summaryAttemptCount: 2,
      summaryErrorMessage: "Old error",
      summaryErrorStage: "llm",
      summaryStatus: "failed",
    })
  );

  await t.mutation(setSummaryPending, { linkId });

  const updated = await t.run((ctx) => ctx.db.get(linkId));
  expect(updated?.summaryStatus).toBe("pending");
  expect(updated?.summaryAttemptCount).toBe(3);
  expect(updated?.summaryErrorStage).toBeUndefined();
  expect(updated?.summaryErrorMessage).toBeUndefined();
  expect(updated?.summaryUpdatedAt).toBeTypeOf("number");
});

test("setSummaryRunning stores metadata and clears errors", async () => {
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
      title: "Saved Link",
      url: "https://example.com/saved",
      summaryErrorMessage: "Old error",
      summaryErrorStage: "fetch",
      summaryStatus: "failed",
    })
  );

  await t.mutation(setSummaryRunning, {
    contentKind: "article",
    linkId,
    model: "gemini-test",
    promptVersion: "v0",
    extractedTitle: "Best Title",
    extractedTitleSource: "h1",
  });

  const updated = await t.run((ctx) => ctx.db.get(linkId));
  expect(updated?.summaryStatus).toBe("running");
  expect(updated?.summaryContentKind).toBe("article");
  expect(updated?.summaryModel).toBe("gemini-test");
  expect(updated?.summaryPromptVersion).toBe("v0");
  expect(updated?.summaryExtractedTitle).toBe("Best Title");
  expect(updated?.summaryExtractedTitleSource).toBe("h1");
  expect(updated?.summaryErrorStage).toBeUndefined();
  expect(updated?.summaryErrorMessage).toBeUndefined();
  expect(updated?.summaryUpdatedAt).toBeTypeOf("number");
});

test("setSummarySuccess stores outputs and clears errors", async () => {
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
      title: "Saved Link",
      url: "https://example.com/saved",
      summaryErrorMessage: "Old error",
      summaryErrorStage: "llm",
      summaryStatus: "failed",
    })
  );

  await t.mutation(setSummarySuccess, {
    contentKind: "article",
    linkId,
    credibility: "high",
    credibilityReason: "Good sourcing",
    extractedTitle: "Best Title",
    extractedTitleSource: "h1",
    longSummary: "Long summary here",
    tldr: "TL;DR here",
    worthReading: "yes",
    worthReadingReason: "Useful takeaways",
  });

  const updated = await t.run((ctx) => ctx.db.get(linkId));
  expect(updated?.summaryStatus).toBe("success");
  expect(updated?.summaryContentKind).toBe("article");
  expect(updated?.summaryExtractedTitle).toBe("Best Title");
  expect(updated?.summaryExtractedTitleSource).toBe("h1");
  expect(updated?.summaryTldr).toBe("TL;DR here");
  expect(updated?.summaryWorthReading).toBe("yes");
  expect(updated?.summaryWorthReadingReason).toBe("Useful takeaways");
  expect(updated?.summaryCredibility).toBe("high");
  expect(updated?.summaryCredibilityReason).toBe("Good sourcing");
  expect(updated?.summaryLongSummary).toBe("Long summary here");
  expect(updated?.summaryErrorStage).toBeUndefined();
  expect(updated?.summaryErrorMessage).toBeUndefined();
  expect(updated?.summaryUpdatedAt).toBeTypeOf("number");
});

test("setSummaryFailed stores error stage/message", async () => {
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
      title: "Saved Link",
      url: "https://example.com/saved",
      summaryStatus: "running",
    })
  );

  await t.mutation(setSummaryFailed, {
    linkId,
    stage: "extract",
    message: "Could not extract content",
  });

  const updated = await t.run((ctx) => ctx.db.get(linkId));
  expect(updated?.summaryStatus).toBe("failed");
  expect(updated?.summaryErrorStage).toBe("extract");
  expect(updated?.summaryErrorMessage).toBe("Could not extract content");
  expect(updated?.summaryUpdatedAt).toBeTypeOf("number");
});
