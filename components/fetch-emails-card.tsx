"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function formatFetchedMessage(fetched: number) {
  return `Fetched ${fetched} new ${fetched === 1 ? "email" : "emails"}.`;
}

export function FetchEmailsCard(props: {
  disabled?: boolean;
  disabledLabel?: string;
  onFetch: () => Promise<{ fetched: number }>;
}) {
  const [status, setStatus] = useState<
    { tag: "idle" } | { tag: "loading" } | { tag: "error"; message: string }
  >({ tag: "idle" });

  const disabled = status.tag === "loading" || (props.disabled ?? false);
  let label = "Fetch new emails";

  if (props.disabled) {
    label = props.disabledLabel ?? "Sync in progress…";
  }

  if (status.tag === "loading") {
    label = "Fetching…";
  }

  return (
    <Card className="gap-3 py-4">
      <CardContent className="grid gap-2 px-4">
        {status.tag === "error" ? (
          <div className="text-destructive text-sm" role="alert">
            {status.message}
          </div>
        ) : null}

        <Button
          disabled={disabled}
          onClick={async () => {
            if (props.disabled) {
              return;
            }
            setStatus({ tag: "loading" });
            try {
              const result = await props.onFetch();
              toast.success(formatFetchedMessage(result.fetched));
              setStatus({ tag: "idle" });
            } catch (error) {
              setStatus({
                message:
                  error instanceof Error ? error.message : "Fetch failed",
                tag: "error",
              });
            }
          }}
          size="sm"
        >
          {label}
        </Button>
      </CardContent>
    </Card>
  );
}
