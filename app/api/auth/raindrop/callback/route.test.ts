import { expect, test, vi } from "vitest";

import {
  exchangeRaindropCodeForTokens,
  handleRaindropOAuthCallback,
} from "./route";

test("exchangeRaindropCodeForTokens returns ok=false on non-2xx responses", async () => {
  const fetcher = () => Promise.resolve(new Response("nope", { status: 400 }));

  const result = await exchangeRaindropCodeForTokens({
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

test("handleRaindropOAuthCallback returns 400 when code is missing", async () => {
  const response = await handleRaindropOAuthCallback({
    code: null,
    env: {
      clientId: "client",
      clientSecret: "secret",
      convexUrl: "https://example.convex.cloud",
      redirectUri: "https://app.test/callback",
    },
    error: null,
    redirectTo: "https://app.test/settings",
  });

  expect(response.status).toBe(400);
});

test("handleRaindropOAuthCallback returns 400 when error is present", async () => {
  const response = await handleRaindropOAuthCallback({
    code: null,
    env: {
      clientId: "client",
      clientSecret: "secret",
      convexUrl: "https://example.convex.cloud",
      redirectUri: "https://app.test/callback",
    },
    error: "access_denied",
    redirectTo: "https://app.test/settings",
  });

  expect(response.status).toBe(400);
});

test("handleRaindropOAuthCallback saves tokens", async () => {
  const saveTokens = vi.fn(async () => "id");
  const tokenStore = {
    saveTokens,
  };

  const fetcher = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          access_token: "access",
          expires_in: 7,
          refresh_token: "refresh",
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        }
      )
    );

  await handleRaindropOAuthCallback({
    code: "code",
    env: {
      clientId: "client",
      clientSecret: "secret",
      convexUrl: "https://example.convex.cloud",
      redirectUri: "https://app.test/callback",
    },
    error: null,
    fetcher,
    now: () => 1000,
    redirectTo: "https://app.test/settings",
    tokenStore,
  });

  expect(saveTokens).toHaveBeenCalledWith({
    accessToken: "access",
    expiresAt: 8000,
    refreshToken: "refresh",
  });
});

test("handleRaindropOAuthCallback redirects to settings on success", async () => {
  const tokenStore = {
    saveTokens: async () => "id",
  };

  const fetcher = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          access_token: "access",
          expires_in: 7,
          refresh_token: "refresh",
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        }
      )
    );

  const response = await handleRaindropOAuthCallback({
    code: "code",
    env: {
      clientId: "client",
      clientSecret: "secret",
      convexUrl: "https://example.convex.cloud",
      redirectUri: "https://app.test/callback",
    },
    error: null,
    fetcher,
    redirectTo: "https://app.test/settings",
    tokenStore,
  });

  expect(response.headers.get("location")).toBe("https://app.test/settings");
});
