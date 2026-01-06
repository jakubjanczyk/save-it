"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FetchEmailsCard(props: {
  onFetch: () => Promise<{ fetched: number }>;
}) {
  const [status, setStatus] = useState<
    | { tag: "idle" }
    | { tag: "loading" }
    | { tag: "success"; fetched: number }
    | { tag: "error"; message: string }
  >({ tag: "idle" });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email fetching</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {status.tag === "error" ? (
          <div className="text-destructive text-sm" role="alert">
            {status.message}
          </div>
        ) : null}

        {status.tag === "success" ? (
          <div className="text-muted-foreground text-sm">
            Fetched {status.fetched} new emails.
          </div>
        ) : null}

        <Button
          disabled={status.tag === "loading"}
          onClick={async () => {
            setStatus({ tag: "loading" });
            try {
              const result = await props.onFetch();
              setStatus({ fetched: result.fetched, tag: "success" });
            } catch (error) {
              setStatus({
                message:
                  error instanceof Error ? error.message : "Fetch failed",
                tag: "error",
              });
            }
          }}
        >
          {status.tag === "loading" ? "Fetching…" : "Fetch new emails"}
        </Button>
      </CardContent>
    </Card>
  );
}
