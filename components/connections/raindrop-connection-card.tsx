"use client";

import { type FunctionReference, makeFunctionReference } from "convex/server";

import { OAuthConnectionCard } from "@/components/connections/oauth-connection-card";

interface RaindropAuthTokens extends Record<string, unknown> {
  accessToken: string;
  expiresAt?: number;
  refreshToken?: string;
}

const getTokens: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  RaindropAuthTokens | null
> = makeFunctionReference("raindropauth:getTokens");

const clearTokens: FunctionReference<
  "mutation",
  "public",
  Record<string, never>,
  null
> = makeFunctionReference("raindropauth:clearTokens");

export function RaindropConnectionCard() {
  return (
    <OAuthConnectionCard
      clearTokens={clearTokens}
      connectHref="/api/auth/raindrop"
      getTokens={getTokens}
      title="Raindrop"
    />
  );
}
