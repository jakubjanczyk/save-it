"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export interface OAuthConnectionProps {
  serviceName: string;
  connected: boolean;
  connectHref: string;
  disabled?: boolean;
  onDisconnect: () => Promise<void> | void;
  statusMessage?: string | null;
  statusTone?: "default" | "error";
}

export function OAuthConnection({
  serviceName,
  connected,
  connectHref,
  disabled,
  onDisconnect,
  statusMessage,
  statusTone = "default",
}: OAuthConnectionProps) {
  const statusText =
    statusMessage ?? (connected ? "Connected" : "Not connected");
  const statusClass =
    statusTone === "error" ? "text-destructive" : "text-muted-foreground";
  const connectLabel = statusTone === "error" ? "Reconnect" : "Connect";

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="font-medium">{serviceName}</div>
        <div className={`${statusClass} text-sm`}>{statusText}</div>
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
          <Link href={connectHref}>{connectLabel}</Link>
        </Button>
      )}
    </div>
  );
}
