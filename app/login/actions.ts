"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  isValidPassword,
  SESSION_COOKIE_NAME,
  signSessionToken,
} from "@/lib/auth";

export interface LoginState {
  error?: string;
}

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const providedPassword = String(formData.get("password") ?? "");
  const expectedPassword = process.env.APP_PASSWORD;
  const jwtSecret = process.env.JWT_SECRET;

  if (!(expectedPassword && jwtSecret)) {
    return { error: "Server is missing auth configuration" };
  }

  const ok = isValidPassword({
    provided: providedPassword,
    expected: expectedPassword,
  });

  if (!ok) {
    return { error: "Invalid password" };
  }

  const token = await signSessionToken({
    secret: jwtSecret,
    claims: { sub: "user" },
    expiresInSeconds: 60 * 60 * 24 * 30,
  });

  const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

  const cookiesObject = await cookies();
  cookiesObject.set(SESSION_COOKIE_NAME, token, {
    expires: new Date(Date.now() + sessionMaxAgeSeconds * 1000),
    httpOnly: true,
    maxAge: sessionMaxAgeSeconds,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  redirect("/");

  return {};
}
