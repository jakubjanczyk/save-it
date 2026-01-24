"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";

import {
  clearGoogleTokens,
  clearRaindropTokens,
} from "@/components/connections/convex-refs";
import { OAuthConnection } from "@/components/connections/oauth-connection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function ConnectionsCard(props: {
  gmailConnected: boolean;
  gmailErrorMessage?: string | null;
  raindropConnected: boolean;
}) {
  const router = useRouter();
  const gmailHasError = Boolean(props.gmailErrorMessage);

  const disconnectGoogle = useMutation(clearGoogleTokens);
  const disconnectRaindrop = useMutation(clearRaindropTokens);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connections</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div data-service="gmail">
          <OAuthConnection
            connected={props.gmailConnected && !gmailHasError}
            connectHref="/api/auth/google"
            onDisconnect={async () => {
              await disconnectGoogle({});
              router.refresh();
            }}
            serviceName="Gmail"
            statusMessage={
              gmailHasError ? (props.gmailErrorMessage ?? null) : null
            }
            statusTone={gmailHasError ? "error" : "default"}
          />
        </div>

        <Separator />

        <div data-service="raindrop">
          <OAuthConnection
            connected={props.raindropConnected}
            connectHref="/api/auth/raindrop"
            onDisconnect={async () => {
              await disconnectRaindrop({});
              router.refresh();
            }}
            serviceName="Raindrop"
          />
        </div>
      </CardContent>
    </Card>
  );
}
