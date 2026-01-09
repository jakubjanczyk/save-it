const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

interface GoogleRefreshResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

import { isRecord } from "./type-guards/is-record";

function parseRefreshResponse(value: unknown): GoogleRefreshResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  const record = value as {
    access_token?: unknown;
    expires_in?: unknown;
    refresh_token?: unknown;
  };

  if (
    typeof record.access_token !== "string" ||
    typeof record.expires_in !== "number"
  ) {
    return null;
  }

  return {
    access_token: record.access_token,
    expires_in: record.expires_in,
    refresh_token:
      typeof record.refresh_token === "string"
        ? record.refresh_token
        : undefined,
  };
}

export async function refreshGoogleAccessToken(params: {
  refreshToken: string;
  env: { clientId: string; clientSecret: string };
  fetcher?: typeof fetch;
  now?: () => number;
}): Promise<{ accessToken: string; expiresAt: number; refreshToken: string }> {
  const now = params.now ?? Date.now;
  const fetcher = params.fetcher ?? fetch;

  const body = new URLSearchParams({
    client_id: params.env.clientId,
    client_secret: params.env.clientSecret,
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
  });

  const response = await fetcher(GOOGLE_OAUTH_TOKEN_URL, {
    body,
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Google token refresh failed (${response.status})`);
  }

  const json = parseRefreshResponse(await response.json());
  if (!json) {
    throw new Error("Google token refresh returned invalid JSON");
  }

  const expiresAt = now() + json.expires_in * 1000;

  return {
    accessToken: json.access_token,
    expiresAt,
    refreshToken: json.refresh_token ?? params.refreshToken,
  };
}
