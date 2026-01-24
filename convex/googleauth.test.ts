import type { FunctionReference } from "convex/server";
import { makeFunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

interface GoogleTokens extends Record<string, unknown> {
  accessToken: string;
  expiresAt: number;
  refreshToken: string;
}

interface OAuthTokenDoc extends Record<string, unknown> {
  accessToken: string;
  expiresAt?: number;
  refreshToken?: string;
  type: string;
}

const saveTokens: FunctionReference<
  "mutation",
  "public",
  GoogleTokens,
  string
> = makeFunctionReference("googleauth:saveTokens");

const getTokens: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  GoogleTokens | null
> = makeFunctionReference("googleauth:getTokens");

const clearTokens: FunctionReference<
  "mutation",
  "public",
  Record<string, never>,
  null
> = makeFunctionReference("googleauth:clearTokens");

interface ConnectionStatus extends Record<string, unknown> {
  connected: boolean;
  errorAt: number | null;
  errorMessage: string | null;
  errorTag: string | null;
}

const getConnectionStatus: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  ConnectionStatus
> = makeFunctionReference("googleauth:getConnectionStatus");

const setConnectionError: FunctionReference<
  "mutation",
  "public",
  { errorMessage?: string; errorTag?: string },
  string | null
> = makeFunctionReference("googleauth:setConnectionError");

const isTokenExpired: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  boolean
> = makeFunctionReference("googleauth:isTokenExpired");

test("getTokens returns null when no tokens are stored", async () => {
  const t = convexTest(schema, modules);

  const result = await t.query(getTokens, {});

  expect(result).toBeNull();
});

test("saveTokens stores access token", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(saveTokens, {
    accessToken: "access",
    expiresAt: Date.now() + 60_000,
    refreshToken: "refresh",
  });
  const result = await t.query(getTokens, {});

  expect(result?.accessToken).toBe("access");
});

test("saveTokens stores refresh token", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(saveTokens, {
    accessToken: "access",
    expiresAt: Date.now() + 60_000,
    refreshToken: "refresh",
  });
  const result = await t.query(getTokens, {});

  expect(result?.refreshToken).toBe("refresh");
});

test("saveTokens stores expiresAt", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(saveTokens, {
    accessToken: "access",
    expiresAt: 123,
    refreshToken: "refresh",
  });
  const result = await t.query(getTokens, {});

  expect(result?.expiresAt).toBe(123);
});

test("saveTokens stores type google", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(saveTokens, {
    accessToken: "access",
    expiresAt: 123,
    refreshToken: "refresh",
  });

  const tokens = await t.run((ctx) => ctx.db.query("oauthTokens").collect());

  expect((tokens[0] as OAuthTokenDoc | undefined)?.type).toBe("google");
});

test("clearTokens removes stored tokens", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(saveTokens, {
    accessToken: "access",
    expiresAt: Date.now() + 60_000,
    refreshToken: "refresh",
  });

  await t.mutation(clearTokens, {});
  const result = await t.query(getTokens, {});

  expect(result).toBeNull();
});

test("getConnectionStatus reports disconnected without errors by default", async () => {
  const t = convexTest(schema, modules);

  const result = await t.query(getConnectionStatus, {});

  expect(result).toEqual({
    connected: false,
    errorAt: null,
    errorMessage: null,
    errorTag: null,
  });
});

test("setConnectionError stores error details", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(saveTokens, {
    accessToken: "access",
    expiresAt: Date.now() + 60_000,
    refreshToken: "refresh",
  });

  await t.mutation(setConnectionError, {
    errorMessage: "Access token expired",
    errorTag: "GmailTokenExpired",
  });

  const result = await t.query(getConnectionStatus, {});

  expect(result.connected).toBe(true);
  expect(result.errorMessage).toBe("Access token expired");
  expect(result.errorTag).toBe("GmailTokenExpired");
  expect(typeof result.errorAt).toBe("number");
});

test("saveTokens clears connection error", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(saveTokens, {
    accessToken: "access",
    expiresAt: Date.now() + 60_000,
    refreshToken: "refresh",
  });

  await t.mutation(setConnectionError, {
    errorMessage: "Access token expired",
    errorTag: "GmailTokenExpired",
  });

  await t.mutation(saveTokens, {
    accessToken: "access-2",
    expiresAt: Date.now() + 60_000,
    refreshToken: "refresh-2",
  });

  const result = await t.query(getConnectionStatus, {});

  expect(result.errorMessage).toBeNull();
  expect(result.errorTag).toBeNull();
  expect(result.errorAt).toBeNull();
});

test("isTokenExpired returns true when no tokens are stored", async () => {
  const t = convexTest(schema, modules);

  const result = await t.query(isTokenExpired, {});

  expect(result).toBe(true);
});

test("isTokenExpired returns false when token is not expired", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(saveTokens, {
    accessToken: "access",
    expiresAt: Date.now() + 60_000,
    refreshToken: "refresh",
  });

  const result = await t.query(isTokenExpired, {});

  expect(result).toBe(false);
});

test("isTokenExpired returns true when token is expired", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(saveTokens, {
    accessToken: "access",
    expiresAt: Date.now() - 1,
    refreshToken: "refresh",
  });

  const result = await t.query(isTokenExpired, {});

  expect(result).toBe(true);
});
