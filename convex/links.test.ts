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

function withMockFetch(impl: typeof fetch) {
  const original = globalThis.fetch;
  vi.stubGlobal("fetch", impl);
  return () => {
    vi.stubGlobal("fetch", original);
  };
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
  } finally {
    restoreFetch();
  }

  const saved = await t.run((ctx) => ctx.db.get(linkId));
  expect(saved?.status).toBe("saved");
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
  } finally {
    restoreFetch();
  }

  const link = await t.run((ctx) => ctx.db.get(linkId));
  expect(link?.status).toBe("saved");
  expect(link?.raindropId).toBeUndefined();
});
