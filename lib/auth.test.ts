/* @vitest-environment node */

import { describe, expect, test } from "vitest";

import { isValidPassword, signSessionToken, verifySessionToken } from "./auth";

describe("signSessionToken", () => {
  test("returns a JWT-like token", async () => {
    const token = await signSessionToken({
      secret: "secret",
      claims: { sub: "user" },
      expiresInSeconds: 60,
    });

    expect(token.split(".")).toHaveLength(3);
  });
});

describe("verifySessionToken", () => {
  test("returns the subject claim", async () => {
    const token = await signSessionToken({
      secret: "secret",
      claims: { sub: "user" },
      expiresInSeconds: 60,
    });

    const claims = await verifySessionToken({ secret: "secret", token });

    expect(claims.sub).toBe("user");
  });

  test("throws on wrong secret", async () => {
    const token = await signSessionToken({
      secret: "secret",
      claims: { sub: "user" },
      expiresInSeconds: 60,
    });

    await expect(
      verifySessionToken({ secret: "other-secret", token })
    ).rejects.toBeInstanceOf(Error);
  });
});

describe("isValidPassword", () => {
  test("returns true for equal strings", () => {
    expect(isValidPassword({ provided: "a", expected: "a" })).toBe(true);
  });

  test("returns false for different strings", () => {
    expect(isValidPassword({ provided: "a", expected: "b" })).toBe(false);
  });
});
