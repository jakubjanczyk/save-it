import { expect, test } from "vitest";

import { buildRaindropAuthorizeUrl } from "./route";

test("buildRaindropAuthorizeUrl sets client_id", () => {
  const url = new URL(
    buildRaindropAuthorizeUrl({
      env: { clientId: "client", redirectUri: "https://app.test/callback" },
    })
  );

  expect(url.searchParams.get("client_id")).toBe("client");
});

test("buildRaindropAuthorizeUrl sets redirect_uri", () => {
  const url = new URL(
    buildRaindropAuthorizeUrl({
      env: { clientId: "client", redirectUri: "https://app.test/callback" },
    })
  );

  expect(url.searchParams.get("redirect_uri")).toBe(
    "https://app.test/callback"
  );
});
