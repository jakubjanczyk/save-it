import type { FunctionReference } from "convex/server";
import { makeFunctionReference } from "convex/server";
import type { GenericId } from "convex/values";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

interface SenderDoc {
  _id: GenericId<"senders">;
  email: string;
  name?: string;
  createdAt: number;
}

const addSender: FunctionReference<
  "mutation",
  "public",
  { email: string; name?: string },
  GenericId<"senders">
> = makeFunctionReference("senders:addSender");

const listSenders: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  SenderDoc[]
> = makeFunctionReference("senders:listSenders");

const removeSender: FunctionReference<
  "mutation",
  "public",
  { senderId: GenericId<"senders"> },
  null
> = makeFunctionReference("senders:removeSender");

test("listSenders returns empty array when there are no senders", async () => {
  const t = convexTest(schema, modules);

  const result = await t.query(listSenders, {});

  expect(result).toEqual([]);
});

test("addSender returns an id for a new sender", async () => {
  const t = convexTest(schema, modules);

  const id = await t.mutation(addSender, {
    email: "a@example.com",
  });

  expect(typeof id).toBe("string");
});

test("listSenders includes a sender after it is added", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(addSender, { email: "a@example.com" });
  const result = await t.query(listSenders, {});

  expect(result).toHaveLength(1);
});

test("addSender trims whitespace from email", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(addSender, { email: "  a@example.com  " });
  const result = await t.query(listSenders, {});

  expect(result[0]?.email).toBe("a@example.com");
});

test("addSender rejects duplicate email", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(addSender, { email: "a@example.com" });
  const secondAdd = t.mutation(addSender, { email: "a@example.com" });

  await expect(secondAdd).rejects.toThrow("Sender already exists");
});

test("addSender rejects duplicate email after trimming", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(addSender, { email: "a@example.com" });
  const secondAdd = t.mutation(addSender, { email: "  a@example.com  " });

  await expect(secondAdd).rejects.toThrow("Sender already exists");
});

test("addSender stores provided name", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(addSender, { email: "a@example.com", name: "Alpha" });
  const result = await t.query(listSenders, {});

  expect(result[0]?.name).toBe("Alpha");
});

test("addSender leaves name empty when not provided", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(addSender, { email: "a@example.com" });
  const result = await t.query(listSenders, {});

  expect(result[0]?.name).toBeUndefined();
});

test("addSender sets createdAt timestamp", async () => {
  const t = convexTest(schema, modules);

  const before = Date.now();
  await t.mutation(addSender, { email: "a@example.com" });
  const after = Date.now();

  const result = await t.query(listSenders, {});
  const createdAt = result[0]?.createdAt ?? 0;

  expect(createdAt >= before && createdAt <= after).toBe(true);
});

test("removeSender removes a sender", async () => {
  const t = convexTest(schema, modules);

  const id = await t.mutation(addSender, { email: "a@example.com" });

  await t.mutation(removeSender, { senderId: id });
  const result = await t.query(listSenders, {});

  expect(result).toEqual([]);
});

test("removeSender returns null", async () => {
  const t = convexTest(schema, modules);

  const id = await t.mutation(addSender, { email: "a@example.com" });
  const result = await t.mutation(removeSender, { senderId: id });

  expect(result).toBe(null);
});
