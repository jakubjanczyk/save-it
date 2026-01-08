"use client";

import { type FunctionReference, makeFunctionReference } from "convex/server";

import { OAuthConnectionCard } from "@/components/connections/oauth-connection-card";

interface GoogleAuthTokens extends Record<string, unknown> {
  accessToken: string;
  expiresAt: number;
  refreshToken: string;
}

const getTokens: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  GoogleAuthTokens | null
> = makeFunctionReference("googleauth:getTokens");

const clearTokens: FunctionReference<
  "mutation",
  "public",
  Record<string, never>,
  null
> = makeFunctionReference("googleauth:clearTokens");

export function GmailConnectionCard() {
  return (
    <OAuthConnectionCard
      clearTokens={clearTokens}
      connectHref="/api/auth/google"
      getTokens={getTokens}
      title="Gmail"
    />
  );
}
