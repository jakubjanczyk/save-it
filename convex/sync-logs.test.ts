import type { FunctionReference } from "convex/server";
import { makeFunctionReference } from "convex/server";
import type { GenericId } from "convex/values";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

interface SyncLogRow {
  _id: GenericId<"syncLogs">;
  attemptedAt: number;
  emailId: GenericId<"emails">;
  savedLinkCount: number;
  status: "success" | "error";
  subject: string;
}

const listSyncLogs: FunctionReference<
  "query",
  "public",
  { status?: "success" | "error" },
  SyncLogRow[]
> = makeFunctionReference("sync/logs:list");

test("sync/logs:list returns only the latest entry per email", async () => {
  const t = convexTest(schema, modules);

  const senderId = await t.run((ctx) =>
    ctx.db.insert("senders", { createdAt: 0, email: "newsletter@example.com" })
  );

  const emailA = await t.run((ctx) =>
    ctx.db.insert("emails", {
      extractionError: false,
      from: "newsletter@example.com",
      gmailId: "mA",
      markedAsRead: false,
      receivedAt: 1,
      senderId,
      subject: "A",
    })
  );

  const emailB = await t.run((ctx) =>
    ctx.db.insert("emails", {
      extractionError: false,
      from: "newsletter@example.com",
      gmailId: "mB",
      markedAsRead: false,
      receivedAt: 2,
      senderId,
      subject: "B",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("syncLogs", {
      attemptedAt: 1,
      emailId: emailA,
      extractedLinkCount: 0,
      from: "newsletter@example.com",
      gmailId: "mA",
      receivedAt: 1,
      status: "error",
      storedLinkCount: 0,
      subject: "A",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("syncLogs", {
      attemptedAt: 2,
      emailId: emailA,
      extractedLinkCount: 1,
      from: "newsletter@example.com",
      gmailId: "mA",
      receivedAt: 1,
      status: "success",
      storedLinkCount: 1,
      subject: "A",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("syncLogs", {
      attemptedAt: 3,
      emailId: emailB,
      extractedLinkCount: 0,
      from: "newsletter@example.com",
      gmailId: "mB",
      receivedAt: 2,
      status: "error",
      storedLinkCount: 0,
      subject: "B",
    })
  );

  const result = await t.query(listSyncLogs, {});

  expect(result).toHaveLength(2);
  expect(result.map((row) => row.emailId).sort()).toEqual(
    [emailA, emailB].sort()
  );
});

test("sync/logs:list filters by latest status", async () => {
  const t = convexTest(schema, modules);

  const senderId = await t.run((ctx) =>
    ctx.db.insert("senders", { createdAt: 0, email: "newsletter@example.com" })
  );

  const emailA = await t.run((ctx) =>
    ctx.db.insert("emails", {
      extractionError: false,
      from: "newsletter@example.com",
      gmailId: "mA",
      markedAsRead: false,
      receivedAt: 1,
      senderId,
      subject: "A",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("syncLogs", {
      attemptedAt: 1,
      emailId: emailA,
      extractedLinkCount: 0,
      from: "newsletter@example.com",
      gmailId: "mA",
      receivedAt: 1,
      status: "error",
      storedLinkCount: 0,
      subject: "A",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("syncLogs", {
      attemptedAt: 2,
      emailId: emailA,
      extractedLinkCount: 1,
      from: "newsletter@example.com",
      gmailId: "mA",
      receivedAt: 1,
      status: "success",
      storedLinkCount: 1,
      subject: "A",
    })
  );

  const result = await t.query(listSyncLogs, { status: "error" });
  expect(result).toHaveLength(0);
});

test("sync/logs:list returns savedLinkCount based on current links", async () => {
  const t = convexTest(schema, modules);

  const senderId = await t.run((ctx) =>
    ctx.db.insert("senders", { createdAt: 0, email: "newsletter@example.com" })
  );

  const emailId = await t.run((ctx) =>
    ctx.db.insert("emails", {
      extractionError: false,
      from: "newsletter@example.com",
      gmailId: "m1",
      markedAsRead: false,
      receivedAt: 1,
      senderId,
      subject: "Hello",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "d1",
      emailId,
      status: "saved",
      title: "t1",
      url: "https://example.com/1",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "d2",
      emailId,
      status: "pending",
      title: "t2",
      url: "https://example.com/2",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("links", {
      description: "d3",
      emailId,
      status: "saved",
      title: "t3",
      url: "https://example.com/3",
    })
  );

  await t.run((ctx) =>
    ctx.db.insert("syncLogs", {
      attemptedAt: 1,
      emailId,
      extractedLinkCount: 3,
      from: "newsletter@example.com",
      gmailId: "m1",
      receivedAt: 1,
      status: "success",
      storedLinkCount: 3,
      subject: "Hello",
    })
  );

  const result = await t.query(listSyncLogs, {});
  expect(result).toHaveLength(1);
  expect(result[0]?.savedLinkCount).toBe(2);
});
