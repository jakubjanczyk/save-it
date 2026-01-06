"use client";

import { useMutation, useQuery } from "convex/react";
import { type FunctionReference, makeFunctionReference } from "convex/server";

import { RaindropConnection } from "@/components/raindrop-connection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Raindrop</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Set <code className="font-mono text-xs">NEXT_PUBLIC_CONVEX_URL</code>{" "}
          to enable Raindrop connection.
        </CardContent>
      </Card>
    );
  }

  return <RaindropConnectionCardWithConvex />;
}

function RaindropConnectionCardWithConvex() {
  const tokens = useQuery(getTokens, {});
  const disconnect = useMutation(clearTokens);

  if (tokens === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Raindrop</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  const connected = tokens !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Raindrop</CardTitle>
      </CardHeader>
      <CardContent>
        <RaindropConnection
          connected={connected}
          connectHref="/api/auth/raindrop"
          onDisconnect={async () => {
            await disconnect({});
          }}
        />
      </CardContent>
    </Card>
  );
}
