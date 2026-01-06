import { fetchMutation } from "convex/nextjs";
import { type FunctionReference, makeFunctionReference } from "convex/server";
import { NextResponse } from "next/server";

const RAINDROP_OAUTH_TOKEN_URL = "https://raindrop.io/oauth/access_token";

interface RaindropAuthTokens extends Record<string, unknown> {
  accessToken: string;
  expiresAt?: number;
  refreshToken?: string;
}

const saveTokens: FunctionReference<
  "mutation",
  "public",
  RaindropAuthTokens,
  string
> = makeFunctionReference("raindropauth:saveTokens");

export interface RaindropOAuthCallbackEnv {
  clientId: string;
  clientSecret: string;
  convexUrl: string;
  redirectUri: string;
}

interface RaindropTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseTokenResponse(value: unknown): RaindropTokenResponse | null {
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

export async function exchangeRaindropCodeForTokens(params: {
  code: string;
  env: Pick<
    RaindropOAuthCallbackEnv,
    "clientId" | "clientSecret" | "redirectUri"
  >;
  fetcher?: typeof fetch;
}) {
  const fetcher = params.fetcher ?? fetch;

  const response = await fetcher(RAINDROP_OAUTH_TOKEN_URL, {
    body: JSON.stringify({
      client_id: params.env.clientId,
      client_secret: params.env.clientSecret,
      code: params.code,
      grant_type: "authorization_code",
      redirect_uri: params.env.redirectUri,
    }),
    headers: { "content-type": "application/json" },
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

interface RaindropAuthTokenStore {
  saveTokens(tokens: RaindropAuthTokens): Promise<string>;
}

function createConvexTokenStore(convexUrl: string): RaindropAuthTokenStore {
  return {
    async saveTokens(tokens) {
      return await fetchMutation(saveTokens, tokens, { url: convexUrl });
    },
  };
}

export async function handleRaindropOAuthCallback(params: {
  code: string | null;
  error: string | null;
  env: RaindropOAuthCallbackEnv;
  redirectTo: string;
  fetcher?: typeof fetch;
  now?: () => number;
  tokenStore?: RaindropAuthTokenStore;
}) {
  if (params.error) {
    return NextResponse.json({ error: params.error }, { status: 400 });
  }

  if (!params.code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const now = params.now ?? Date.now;
  const tokenStore =
    params.tokenStore ?? createConvexTokenStore(params.env.convexUrl);

  const tokenResult = await exchangeRaindropCodeForTokens({
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

  const expiresAt = now() + tokenResult.value.expires_in * 1000;
  await tokenStore.saveTokens({
    accessToken: tokenResult.value.access_token,
    expiresAt,
    refreshToken: tokenResult.value.refresh_token,
  });

  return NextResponse.redirect(params.redirectTo);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  const clientId = process.env.RAINDROP_CLIENT_ID;
  const clientSecret = process.env.RAINDROP_CLIENT_SECRET;
  const redirectUri = process.env.RAINDROP_REDIRECT_URI;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!(clientId && clientSecret && redirectUri && convexUrl)) {
    return NextResponse.json(
      {
        error:
          "Missing RAINDROP_CLIENT_ID, RAINDROP_CLIENT_SECRET, RAINDROP_REDIRECT_URI, or NEXT_PUBLIC_CONVEX_URL",
      },
      { status: 500 }
    );
  }

  return await handleRaindropOAuthCallback({
    code,
    env: { clientId, clientSecret, convexUrl, redirectUri },
    error,
    redirectTo: new URL("/settings", request.url).toString(),
  });
}
