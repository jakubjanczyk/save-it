"use client";

import { useMutation, useQuery } from "convex/react";
import { type FunctionReference, makeFunctionReference } from "convex/server";

import { OAuthConnection } from "@/components/connections/oauth-connection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type Tokens = Record<string, unknown>;

const getGoogleTokens: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  Tokens | null
> = makeFunctionReference("googleauth:getTokens");

const clearGoogleTokens: FunctionReference<
  "mutation",
  "public",
  Record<string, never>,
  null
> = makeFunctionReference("googleauth:clearTokens");

const getRaindropTokens: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  Tokens | null
> = makeFunctionReference("raindropauth:getTokens");

const clearRaindropTokens: FunctionReference<
  "mutation",
  "public",
  Record<string, never>,
  null
> = makeFunctionReference("raindropauth:clearTokens");

export function ConnectionsCard() {
  const googleTokens = useQuery(getGoogleTokens, {});
  const raindropTokens = useQuery(getRaindropTokens, {});

  const disconnectGoogle = useMutation(clearGoogleTokens);
  const disconnectRaindrop = useMutation(clearRaindropTokens);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connections</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {googleTokens === undefined ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <div data-service="gmail">
            <OAuthConnection
              connected={googleTokens !== null}
              connectHref="/api/auth/google"
              onDisconnect={async () => {
                await disconnectGoogle({});
              }}
              serviceName="Gmail"
            />
          </div>
        )}

        <Separator />

        {raindropTokens === undefined ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <div data-service="raindrop">
            <OAuthConnection
              connected={raindropTokens !== null}
              connectHref="/api/auth/raindrop"
              onDisconnect={async () => {
                await disconnectRaindrop({});
              }}
              serviceName="Raindrop"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
