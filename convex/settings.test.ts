import type { FunctionReference } from "convex/server";
import { makeFunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const getSetting: FunctionReference<
  "query",
  "public",
  { key: string },
  string | null
> = makeFunctionReference("settings:get");

const setSetting: FunctionReference<
  "mutation",
  "public",
  { key: string; value: string },
  null
> = makeFunctionReference("settings:set");

test("get returns null when missing", async () => {
  const t = convexTest(schema, modules);

  const result = await t.query(getSetting, { key: "missing" });

  expect(result).toBeNull();
});

test("set writes value for key", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(setSetting, { key: "k", value: "v" });

  const result = await t.query(getSetting, { key: "k" });
  expect(result).toBe("v");
});

test("set updates existing key", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(setSetting, { key: "k", value: "v1" });
  await t.mutation(setSetting, { key: "k", value: "v2" });

  const result = await t.query(getSetting, { key: "k" });
  expect(result).toBe("v2");
});
