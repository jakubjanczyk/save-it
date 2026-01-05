import { expect, test, vi } from "vitest";

import {
  exchangeGoogleCodeForTokens,
  handleGoogleOAuthCallback,
} from "./route";

test("exchangeGoogleCodeForTokens returns ok=false on non-2xx responses", async () => {
  const fetcher = () => Promise.resolve(new Response("nope", { status: 400 }));

  const result = await exchangeGoogleCodeForTokens({
    code: "code",
    env: {
      clientId: "client",
      clientSecret: "secret",
      redirectUri: "https://app.test/callback",
    },
    fetcher,
  });

  expect(result.ok).toBe(false);
});

test("handleGoogleOAuthCallback returns 400 when code is missing", async () => {
  const response = await handleGoogleOAuthCallback({
    code: null,
    cookieState: "state",
    env: {
      clientId: "client",
      clientSecret: "secret",
      convexUrl: "https://example.convex.cloud",
      redirectUri: "https://app.test/callback",
    },
    redirectTo: "https://app.test/settings",
    state: "state",
  });

  expect(response.status).toBe(400);
});

test("handleGoogleOAuthCallback returns 400 when state does not match cookie", async () => {
  const response = await handleGoogleOAuthCallback({
    code: "code",
    cookieState: "cookie-state",
    env: {
      clientId: "client",
      clientSecret: "secret",
      convexUrl: "https://example.convex.cloud",
      redirectUri: "https://app.test/callback",
    },
    redirectTo: "https://app.test/settings",
    state: "query-state",
  });

  expect(response.status).toBe(400);
});

test("handleGoogleOAuthCallback saves tokens and redirects to settings", async () => {
  const saveTokens = vi.fn(async () => "id");
  const tokenStore = {
    getTokens: async () => ({
      accessToken: "old",
      expiresAt: 1,
      refreshToken: "existing-refresh",
    }),
    saveTokens,
  };

  const fetcher = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({ access_token: "new-access", expires_in: 10 }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        }
      )
    );

  await handleGoogleOAuthCallback({
    code: "code",
    cookieState: "state",
    env: {
      clientId: "client",
      clientSecret: "secret",
      convexUrl: "https://example.convex.cloud",
      redirectUri: "https://app.test/callback",
    },
    fetcher,
    now: () => 1000,
    redirectTo: "https://app.test/settings",
    state: "state",
    tokenStore,
  });

  expect(saveTokens).toHaveBeenCalledWith({
    accessToken: "new-access",
    expiresAt: 11_000,
    refreshToken: "existing-refresh",
  });
});

test("handleGoogleOAuthCallback redirects to settings on success", async () => {
  const saveTokens = vi.fn(async () => "id");
  const tokenStore = {
    getTokens: async () => ({
      accessToken: "old",
      expiresAt: 1,
      refreshToken: "existing-refresh",
    }),
    saveTokens,
  };

  const fetcher = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({ access_token: "new-access", expires_in: 10 }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        }
      )
    );

  const response = await handleGoogleOAuthCallback({
    code: "code",
    cookieState: "state",
    env: {
      clientId: "client",
      clientSecret: "secret",
      convexUrl: "https://example.convex.cloud",
      redirectUri: "https://app.test/callback",
    },
    fetcher,
    now: () => 1000,
    redirectTo: "https://app.test/settings",
    state: "state",
    tokenStore,
  });

  expect(response.headers.get("location")).toBe("https://app.test/settings");
});
