"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReference } from "convex/server";

import { OAuthConnection } from "@/components/connections/oauth-connection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type TokensQuery<TTokens extends Record<string, unknown>> = FunctionReference<
  "query",
  "public",
  Record<string, never>,
  TTokens | null
>;

type ClearTokensMutation = FunctionReference<
  "mutation",
  "public",
  Record<string, never>,
  null
>;

export interface OAuthConnectionCardProps<
  TTokens extends Record<string, unknown>,
> {
  title: string;
  connectHref: string;
  getTokens: TokensQuery<TTokens>;
  clearTokens: ClearTokensMutation;
}

export function OAuthConnectionCard<TTokens extends Record<string, unknown>>(
  props: OAuthConnectionCardProps<TTokens>
) {
  const tokens = useQuery(props.getTokens, {});
  const disconnect = useMutation(props.clearTokens);

  if (tokens === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{props.title}</CardTitle>
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
        <CardTitle>{props.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <OAuthConnection
          connected={connected}
          connectHref={props.connectHref}
          onDisconnect={async () => {
            await disconnect({});
          }}
          serviceName={props.title}
        />
      </CardContent>
    </Card>
  );
}
