"use client";

import { useMutation, useQuery } from "convex/react";
import { type FunctionReference, makeFunctionReference } from "convex/server";

import { GmailConnection } from "@/components/gmail-connection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gmail</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Set <code className="font-mono text-xs">NEXT_PUBLIC_CONVEX_URL</code>{" "}
          to enable Gmail connection.
        </CardContent>
      </Card>
    );
  }

  return <GmailConnectionCardWithConvex />;
}

function GmailConnectionCardWithConvex() {
  const tokens = useQuery(getTokens, {});
  const disconnect = useMutation(clearTokens);

  if (tokens === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gmail</CardTitle>
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
        <CardTitle>Gmail</CardTitle>
      </CardHeader>
      <CardContent>
        <GmailConnection
          connected={connected}
          connectHref="/api/auth/google"
          onDisconnect={async () => {
            await disconnect({});
          }}
        />
      </CardContent>
    </Card>
  );
}
