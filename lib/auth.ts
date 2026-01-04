import crypto from "node:crypto";

import { jwtVerify, SignJWT } from "jose";

export interface SessionClaims {
  sub: string;
}

export async function signSessionToken(params: {
  secret: string;
  claims: SessionClaims;
  expiresInSeconds: number;
}): Promise<string> {
  const secretKey = new TextEncoder().encode(params.secret);

  return await new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(params.claims.sub)
    .setExpirationTime(`${params.expiresInSeconds}s`)
    .sign(secretKey);
}

export async function verifySessionToken(params: {
  secret: string;
  token: string;
}): Promise<SessionClaims> {
  const secretKey = new TextEncoder().encode(params.secret);
  const { payload } = await jwtVerify(params.token, secretKey);

  if (payload.authenticated !== true) {
    throw new Error("Invalid session token");
  }

  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("Invalid session token subject");
  }

  return { sub: payload.sub };
}

export function isValidPassword(params: {
  provided: string;
  expected: string;
}): boolean {
  const providedHash = crypto
    .createHash("sha256")
    .update(params.provided)
    .digest();
  const expectedHash = crypto
    .createHash("sha256")
    .update(params.expected)
    .digest();

  return crypto.timingSafeEqual(providedHash, expectedHash);
}

export const SESSION_COOKIE_NAME = "save_it_session";
