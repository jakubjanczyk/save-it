import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { verifySessionToken } from "@/lib/auth";

export const SESSION_COOKIE_NAME = "nlm_session";
export const LOGIN_PATHNAME = "/login";

export type AuthDecision =
  | { type: "next" }
  | { type: "redirect"; pathname: string };

export async function getAuthDecision(params: {
  pathname: string;
  token: string | undefined;
  secret: string | undefined;
}): Promise<AuthDecision> {
  if (params.pathname === LOGIN_PATHNAME) {
    return { type: "next" };
  }

  if (!params.secret) {
    return { type: "redirect", pathname: LOGIN_PATHNAME };
  }
  if (!params.token) {
    return { type: "redirect", pathname: LOGIN_PATHNAME };
  }

  try {
    await verifySessionToken({ secret: params.secret, token: params.token });
    return { type: "next" };
  } catch {
    return { type: "redirect", pathname: LOGIN_PATHNAME };
  }
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const decision = await getAuthDecision({
    pathname: request.nextUrl.pathname,
    token,
    secret: process.env.JWT_SECRET,
  });

  if (decision.type === "next") {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = decision.pathname;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export default middleware