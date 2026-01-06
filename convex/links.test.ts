import type { FunctionReference } from "convex/server";
import { makeFunctionReference } from "convex/server";
import type { GenericId } from "convex/values";
import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";

import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

interface LinkListItem {
  _id: GenericId<"links">;
  description: string;
  emailId: GenericId<"emails">;
  status: "pending" | "saved" | "discarded";
  title: string;
  url: string;
}

const listByEmail: FunctionReference<
  "query",
  "public",
  { emailId: GenericId<"emails"> },
  LinkListItem[]
> = makeFunctionReference("links:listByEmail");

const discard: FunctionReference<
  "mutation",
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

  await t.mutation(discard, { linkId });

  const links = await t.run((ctx) => ctx.db.query("links").collect());
  expect(links[0]?.status).toBe("discarded");
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
