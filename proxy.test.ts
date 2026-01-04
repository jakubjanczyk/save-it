/* @vitest-environment node */

import { expect, test } from "vitest";

import { signSessionToken } from "@/lib/auth";
import { getAuthDecision, LOGIN_PATHNAME } from "./proxy";

test("getAuthDecision allows /login", async () => {
  expect(
    await getAuthDecision({
      pathname: LOGIN_PATHNAME,
      token: undefined,
      secret: undefined,
    })
  ).toEqual({ type: "next" });
});

test("getAuthDecision redirects when secret missing", async () => {
  expect(
    await getAuthDecision({
      pathname: "/",
      token: "token",
      secret: undefined,
    })
  ).toEqual({ type: "redirect", pathname: LOGIN_PATHNAME });
});

test("getAuthDecision redirects when token missing", async () => {
  expect(
    await getAuthDecision({
      pathname: "/",
      token: undefined,
      secret: "secret",
    })
  ).toEqual({ type: "redirect", pathname: LOGIN_PATHNAME });
});

test("getAuthDecision allows when token is valid", async () => {
  const token = await signSessionToken({
    secret: "secret",
    claims: { sub: "user" },
    expiresInSeconds: 60,
  });

  expect(
    await getAuthDecision({
      pathname: "/",
      token,
      secret: "secret",
    })
  ).toEqual({ type: "next" });
});

test("getAuthDecision redirects when token invalid", async () => {
  expect(
    await getAuthDecision({
      pathname: "/",
      token: "not-a-jwt",
      secret: "secret",
    })
  ).toEqual({ type: "redirect", pathname: LOGIN_PATHNAME });
});
