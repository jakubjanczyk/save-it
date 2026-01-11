"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function FetchEmailsCard(props: {
  isRunning?: boolean;
  onFetch: () => Promise<unknown>;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (props.isRunning) {
      setIsStarting(false)
    }
  }, [props.isRunning])

  const disabled = isStarting || (props.isRunning ?? false);
  let label = "Fetch new emails";

  if (props.isRunning || isStarting) {
    label = "Sync in progress…";
  }

  return (
    <Card className="gap-3 py-4">
      <CardContent className="grid gap-2 px-4">
        {errorMessage ? (
          <div className="text-destructive text-sm" role="alert">
            {errorMessage}
          </div>
        ) : null}

        <Button
          disabled={disabled}
          onClick={() => {
            if (disabled) {
              return;
            }
            setErrorMessage(null);
            setIsStarting(true)
              props.onFetch()
                .then(() => {
                  toast.success("Sync started.");
                }).catch((error: unknown) => {
                  setIsStarting(false)
                  setErrorMessage(
                    error instanceof Error ? error.message : "Fetch failed"
                  );
                })
          }}
          size="sm"
          type="button"
        >
          {label}
        </Button>
      </CardContent>
    </Card>
  );
}
