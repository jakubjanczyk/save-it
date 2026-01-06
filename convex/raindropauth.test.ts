import type { FunctionReference } from "convex/server";
import { makeFunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

interface RaindropTokens extends Record<string, unknown> {
  accessToken: string;
  expiresAt?: number;
  refreshToken?: string;
}

interface OAuthTokenDoc extends Record<string, unknown> {
  type: string;
}

const saveTokens: FunctionReference<
  "mutation",
  "public",
  RaindropTokens,
  string
> = makeFunctionReference("raindropauth:saveTokens");

const getTokens: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  RaindropTokens | null
> = makeFunctionReference("raindropauth:getTokens");

const clearTokens: FunctionReference<
  "mutation",
  "public",
  Record<string, never>,
  null
> = makeFunctionReference("raindropauth:clearTokens");

const isTokenExpired: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  boolean
> = makeFunctionReference("raindropauth:isTokenExpired");

test("getTokens returns null when no tokens are stored", async () => {
  const t = convexTest(schema, modules);

  const result = await t.query(getTokens, {});

  expect(result).toBeNull();
});

test("saveTokens stores accessToken", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(saveTokens, { accessToken: "access" });
  const result = await t.query(getTokens, {});

  expect(result?.accessToken).toBe("access");
});

test("saveTokens stores refreshToken when provided", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(saveTokens, { accessToken: "access", refreshToken: "ref" });
  const result = await t.query(getTokens, {});

  expect(result?.refreshToken).toBe("ref");
});

test("saveTokens stores expiresAt when provided", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(saveTokens, { accessToken: "access", expiresAt: 123 });
  const result = await t.query(getTokens, {});

  expect(result?.expiresAt).toBe(123);
});

test("saveTokens stores type raindrop", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(saveTokens, { accessToken: "access" });

  const tokens = await t.run((ctx) => ctx.db.query("oauthTokens").collect());

  expect((tokens[0] as OAuthTokenDoc | undefined)?.type).toBe("raindrop");
});

test("clearTokens removes stored tokens", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(saveTokens, { accessToken: "access" });
  await t.mutation(clearTokens, {});

  const result = await t.query(getTokens, {});

  expect(result).toBeNull();
});

test("isTokenExpired returns true when no tokens are stored", async () => {
  const t = convexTest(schema, modules);

  const result = await t.query(isTokenExpired, {});

  expect(result).toBe(true);
});

test("isTokenExpired returns false when expiresAt is not set (test token)", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(saveTokens, { accessToken: "access" });

  const result = await t.query(isTokenExpired, {});

  expect(result).toBe(false);
});

test("isTokenExpired returns false when expiresAt is in the future", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(saveTokens, {
    accessToken: "access",
    expiresAt: Date.now() + 60_000,
  });

  const result = await t.query(isTokenExpired, {});

  expect(result).toBe(false);
});

test("isTokenExpired returns true when expiresAt is in the past", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(saveTokens, {
    accessToken: "access",
    expiresAt: Date.now() - 1,
  });

  const result = await t.query(isTokenExpired, {});

  expect(result).toBe(true);
});
