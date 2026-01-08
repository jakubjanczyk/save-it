"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export interface OAuthConnectionProps {
  serviceName: string;
  connected: boolean;
  connectHref: string;
  disabled?: boolean;
  onDisconnect: () => Promise<void> | void;
}

export function OAuthConnection({
  serviceName,
  connected,
  connectHref,
  disabled,
  onDisconnect,
}: OAuthConnectionProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="font-medium">{serviceName}</div>
        <div className="text-muted-foreground text-sm">
          {connected ? "Connected" : "Not connected"}
        </div>
      </div>

      {connected ? (
        <Button
          disabled={disabled}
          onClick={async () => {
            await onDisconnect();
          }}
          variant="outline"
        >
          Disconnect
        </Button>
      ) : (
        <Button asChild disabled={disabled}>
          <Link href={connectHref}>Connect</Link>
        </Button>
      )}
    </div>
  );
}
