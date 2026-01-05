import { expect, test, vi } from "vitest";

import { handleGoogleOAuthCallback } from "./callback/route";
import { createGoogleAuthorizeRedirect } from "./route";

function getCookieValueFromSetCookieHeader(
  setCookieHeader: string,
  name: string
): string | null {
  const prefix = `${name}=`;

  const cookiePart = setCookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!cookiePart) {
    return null;
  }

  return cookiePart.slice(prefix.length) || null;
}

test("oauth initiation stores state that appears in the authorize url", () => {
  const response = createGoogleAuthorizeRedirect({
    env: { clientId: "client", redirectUri: "https://app.test/callback" },
    isSecure: true,
    state: "state",
  });

  const setCookieHeader = response.headers.get("set-cookie") ?? "";
  const cookieState = getCookieValueFromSetCookieHeader(
    setCookieHeader,
    "google_oauth_state"
  );
  const location = response.headers.get("location") ?? "";
  const authorizeState = new URL(location).searchParams.get("state");

  expect(authorizeState).toBe(cookieState);
});

test("oauth callback stores tokens and redirects to settings", async () => {
  const saveTokens = vi.fn(async () => "id");
  const tokenStore = {
    getTokens: async () => null,
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

  expect(saveTokens).toHaveBeenCalledWith({
    accessToken: "access",
    expiresAt: 8000,
    refreshToken: "refresh",
  });
  expect(response.headers.get("location")).toBe("https://app.test/settings");
});

test("oauth callback clears oauth state cookie on success", async () => {
  const tokenStore = {
    getTokens: async () => null,
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
    redirectTo: "https://app.test/settings",
    state: "state",
    tokenStore,
  });

  const setCookieHeader = response.headers.get("set-cookie") ?? "";

  expect(setCookieHeader).toContain("google_oauth_state=");
  expect(setCookieHeader).toContain("Path=/");
});
