import { expect, test } from "vitest";

import { refreshGoogleAccessToken } from "./google-oauth";

test("refreshGoogleAccessToken returns new access token", async () => {
  const fetcher: typeof fetch = () =>
    Promise.resolve(
      new Response(JSON.stringify({ access_token: "new", expires_in: 10 }), {
        headers: { "content-type": "application/json" },
        status: 200,
      })
    );

  const result = await refreshGoogleAccessToken({
    env: { clientId: "id", clientSecret: "secret" },
    fetcher,
    now: () => 1000,
    refreshToken: "refresh",
  });

  expect(result).toEqual({
    accessToken: "new",
    expiresAt: 11_000,
    refreshToken: "refresh",
  });
});
