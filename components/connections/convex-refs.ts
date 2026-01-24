import { type FunctionReference, makeFunctionReference } from "convex/server";

type Tokens = Record<string, unknown>;

export interface GoogleConnectionStatus {
  connected: boolean;
  errorAt: number | null;
  errorMessage: string | null;
  errorTag: string | null;
}

export const getGoogleTokens: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  Tokens | null
> = makeFunctionReference("googleauth:getTokens");

export const getGoogleConnectionStatus: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  GoogleConnectionStatus
> = makeFunctionReference("googleauth:getConnectionStatus");

export const clearGoogleTokens: FunctionReference<
  "mutation",
  "public",
  Record<string, never>,
  null
> = makeFunctionReference("googleauth:clearTokens");

export const getRaindropTokens: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  Tokens | null
> = makeFunctionReference("raindropauth:getTokens");

export const clearRaindropTokens: FunctionReference<
  "mutation",
  "public",
  Record<string, never>,
  null
> = makeFunctionReference("raindropauth:clearTokens");
