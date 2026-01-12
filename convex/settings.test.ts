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

const setSettings: FunctionReference<
  "mutation",
  "public",
  { entries: Array<{ key: string; value: string }> },
  null
> = makeFunctionReference("settings:setMany");

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

test("setMany writes multiple settings and updates existing keys", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(setSetting, { key: "k1", value: "v1" });

  await t.mutation(setSettings, {
    entries: [
      { key: "k1", value: "v2" },
      { key: "k2", value: "v3" },
    ],
  });

  await expect(t.query(getSetting, { key: "k1" })).resolves.toBe("v2");
  await expect(t.query(getSetting, { key: "k2" })).resolves.toBe("v3");
});

test("setMany uses the last value when entries contain duplicate keys", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(setSettings, {
    entries: [
      { key: "k", value: "v1" },
      { key: "k", value: "v2" },
    ],
  });

  await expect(t.query(getSetting, { key: "k" })).resolves.toBe("v2");
});
