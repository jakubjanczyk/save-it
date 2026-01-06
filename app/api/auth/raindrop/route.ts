import { NextResponse } from "next/server";

const RAINDROP_OAUTH_AUTHORIZE_URL = "https://raindrop.io/oauth/authorize";

export interface RaindropOAuthAuthorizeEnv {
  clientId: string;
  redirectUri: string;
}

export function buildRaindropAuthorizeUrl(params: {
  env: RaindropOAuthAuthorizeEnv;
}) {
  const url = new URL(RAINDROP_OAUTH_AUTHORIZE_URL);
  url.searchParams.set("client_id", params.env.clientId);
  url.searchParams.set("redirect_uri", params.env.redirectUri);
  return url.toString();
}

export function GET() {
  const clientId = process.env.RAINDROP_CLIENT_ID;
  const redirectUri = process.env.RAINDROP_REDIRECT_URI;

  if (!(clientId && redirectUri)) {
    return NextResponse.json(
      { error: "Missing RAINDROP_CLIENT_ID or RAINDROP_REDIRECT_URI" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(
    buildRaindropAuthorizeUrl({ env: { clientId, redirectUri } })
  );
}
