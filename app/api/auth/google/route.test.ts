import { expect, test } from "vitest";

import {
  buildGoogleAuthorizeUrl,
  createGoogleAuthorizeRedirect,
} from "./route";

test("buildGoogleAuthorizeUrl sets access_type=offline", () => {
  const url = new URL(
    buildGoogleAuthorizeUrl({
      env: { clientId: "client", redirectUri: "https://app.test/callback" },
      state: "state",
    })
  );

  expect(url.searchParams.get("access_type")).toBe("offline");
});

test("buildGoogleAuthorizeUrl sets prompt=consent", () => {
  const url = new URL(
    buildGoogleAuthorizeUrl({
      env: { clientId: "client", redirectUri: "https://app.test/callback" },
      state: "state",
    })
  );

  expect(url.searchParams.get("prompt")).toBe("consent");
});

test("buildGoogleAuthorizeUrl includes state", () => {
  const url = new URL(
    buildGoogleAuthorizeUrl({
      env: { clientId: "client", redirectUri: "https://app.test/callback" },
      state: "state",
    })
  );

  expect(url.searchParams.get("state")).toBe("state");
});

test("createGoogleAuthorizeRedirect sets google oauth state cookie", () => {
  const response = createGoogleAuthorizeRedirect({
    env: { clientId: "client", redirectUri: "https://app.test/callback" },
    isSecure: true,
    state: "state",
  });

  expect(response.headers.get("set-cookie")).toContain(
    "google_oauth_state=state"
  );
});

test("createGoogleAuthorizeRedirect redirects to Google authorize URL", () => {
  const response = createGoogleAuthorizeRedirect({
    env: { clientId: "client", redirectUri: "https://app.test/callback" },
    isSecure: true,
    state: "state",
  });

  expect(response.headers.get("location")).toContain(
    "https://accounts.google.com/o/oauth2/v2/auth"
  );
});
