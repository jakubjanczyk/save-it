import { NextResponse } from "next/server";

const GOOGLE_OAUTH_AUTHORIZE_URL =
  "https://accounts.google.com/o/oauth2/v2/auth";
const OAUTH_STATE_COOKIE = "google_oauth_state";

export interface GoogleOAuthAuthorizeEnv {
  clientId: string;
  redirectUri: string;
}

export function buildGoogleAuthorizeUrl(params: {
  env: GoogleOAuthAuthorizeEnv;
  state: string;
}) {
  const url = new URL(GOOGLE_OAUTH_AUTHORIZE_URL);
  url.searchParams.set("client_id", params.env.clientId);
  url.searchParams.set("redirect_uri", params.env.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set(
    "scope",
    [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
    ].join(" ")
  );
  url.searchParams.set("state", params.state);
  return url.toString();
}

export function createGoogleAuthorizeRedirect(params: {
  env: GoogleOAuthAuthorizeEnv;
  state: string;
  isSecure: boolean;
}) {
  const location = buildGoogleAuthorizeUrl({
    env: params.env,
    state: params.state,
  });

  const response = NextResponse.redirect(location);
  response.cookies.set({
    httpOnly: true,
    maxAge: 10 * 60,
    name: OAUTH_STATE_COOKIE,
    path: "/",
    sameSite: "lax",
    secure: params.isSecure,
    value: params.state,
  });
  return response;
}

export function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!(clientId && redirectUri)) {
    return NextResponse.json(
      { error: "Missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI" },
      { status: 500 }
    );
  }

  const state = crypto.randomUUID();
  return createGoogleAuthorizeRedirect({
    env: { clientId, redirectUri },
    isSecure: process.env.NODE_ENV === "production",
    state,
  });
}
