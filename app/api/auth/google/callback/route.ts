import { fetchMutation, fetchQuery } from "convex/nextjs";
import { type FunctionReference, makeFunctionReference } from "convex/server";
import { NextResponse } from "next/server";

import { isRecord } from "@/lib/type-guards/is-record";

const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const OAUTH_STATE_COOKIE = "google_oauth_state";

interface GoogleAuthTokens extends Record<string, unknown> {
  accessToken: string;
  expiresAt: number;
  refreshToken: string;
}

const saveTokens: FunctionReference<
  "mutation",
  "public",
  GoogleAuthTokens,
  string
> = makeFunctionReference("googleauth:saveTokens");

const getTokens: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  GoogleAuthTokens | null
> = makeFunctionReference("googleauth:getTokens");

export interface GoogleOAuthCallbackEnv {
  clientId: string;
  clientSecret: string;
  convexUrl: string;
  redirectUri: string;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

function parseTokenResponse(value: unknown): GoogleTokenResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  const tokenRecord = value as {
    access_token?: unknown;
    expires_in?: unknown;
    refresh_token?: unknown;
  };

  const accessToken = tokenRecord.access_token;
  const expiresIn = tokenRecord.expires_in;
  const refreshToken = tokenRecord.refresh_token;

  if (typeof accessToken !== "string" || typeof expiresIn !== "number") {
    return null;
  }

  return {
    access_token: accessToken,
    expires_in: expiresIn,
    refresh_token: typeof refreshToken === "string" ? refreshToken : undefined,
  };
}

export async function exchangeGoogleCodeForTokens(params: {
  code: string;
  env: Pick<
    GoogleOAuthCallbackEnv,
    "clientId" | "clientSecret" | "redirectUri"
  >;
  fetcher?: typeof fetch;
}) {
  const body = new URLSearchParams({
    client_id: params.env.clientId,
    client_secret: params.env.clientSecret,
    code: params.code,
    grant_type: "authorization_code",
    redirect_uri: params.env.redirectUri,
  });

  const fetcher = params.fetcher ?? fetch;
  const response = await fetcher(GOOGLE_OAUTH_TOKEN_URL, {
    body,
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  });

  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
    };
  }

  const json = parseTokenResponse(await response.json());
  if (!json) {
    return {
      ok: false as const,
      status: 500,
    };
  }

  return {
    ok: true as const,
    value: json,
  };
}

interface GoogleAuthTokenStore {
  getTokens(): Promise<GoogleAuthTokens | null>;
  saveTokens(tokens: GoogleAuthTokens): Promise<string>;
}

function createConvexTokenStore(convexUrl: string): GoogleAuthTokenStore {
  return {
    async getTokens() {
      return await fetchQuery(getTokens, {}, { url: convexUrl });
    },
    async saveTokens(tokens) {
      return await fetchMutation(saveTokens, tokens, { url: convexUrl });
    },
  };
}

function getCookieValue(cookieHeader: string, name: string): string | null {
  const prefix = `${name}=`;
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!match) {
    return null;
  }

  return match.slice(prefix.length) || null;
}

export async function handleGoogleOAuthCallback(params: {
  code: string | null;
  state: string | null;
  cookieState: string | null;
  env: GoogleOAuthCallbackEnv;
  redirectTo: string;
  fetcher?: typeof fetch;
  now?: () => number;
  tokenStore?: GoogleAuthTokenStore;
}) {
  if (!params.code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const stateMatches =
    params.state && params.cookieState && params.state === params.cookieState;
  if (!stateMatches) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  const now = params.now ?? Date.now;
  const tokenStore =
    params.tokenStore ?? createConvexTokenStore(params.env.convexUrl);

  const tokenResult = await exchangeGoogleCodeForTokens({
    code: params.code,
    env: {
      clientId: params.env.clientId,
      clientSecret: params.env.clientSecret,
      redirectUri: params.env.redirectUri,
    },
    fetcher: params.fetcher,
  });

  if (!tokenResult.ok) {
    return NextResponse.json(
      { error: "Token exchange failed", status: tokenResult.status },
      { status: 500 }
    );
  }

  const existing = await tokenStore.getTokens();
  const refreshToken =
    tokenResult.value.refresh_token ?? existing?.refreshToken;

  if (!refreshToken) {
    return NextResponse.json(
      { error: "Missing refresh token" },
      { status: 500 }
    );
  }

  const expiresAt = now() + tokenResult.value.expires_in * 1000;
  await tokenStore.saveTokens({
    accessToken: tokenResult.value.access_token,
    expiresAt,
    refreshToken,
  });

  const response = NextResponse.redirect(params.redirectTo);
  response.cookies.set({
    maxAge: 0,
    name: OAUTH_STATE_COOKIE,
    path: "/",
    value: "",
  });
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieState = getCookieValue(cookieHeader, OAUTH_STATE_COOKIE);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!(clientId && clientSecret && redirectUri && convexUrl)) {
    return NextResponse.json(
      {
        error:
          "Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, or NEXT_PUBLIC_CONVEX_URL",
      },
      { status: 500 }
    );
  }

  return await handleGoogleOAuthCallback({
    code,
    cookieState,
    env: { clientId, clientSecret, convexUrl, redirectUri },
    redirectTo: new URL("/settings", request.url).toString(),
    state,
  });
}
