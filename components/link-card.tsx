"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface LinkCardProps {
  title: string;
  description: string;
  url: string;
  status?: "pending" | "saved" | "discarded";
  onSave: () => Promise<void> | void;
  onDiscard: () => Promise<void> | void;
}

export function LinkCard({
  description,
  onDiscard,
  onSave,
  status = "pending",
  title,
  url,
}: LinkCardProps) {
  const actionDisabled = status !== "pending";

  if (status !== "pending") {
    return (
      <Card>
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="leading-snug line-through opacity-70">
              {title}
            </CardTitle>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs",
                status === "saved"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-destructive/15 text-destructive"
              )}
            >
              {status === "saved" ? "Saved" : "Discarded"}
            </span>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="gap-1">
        <CardTitle
          className={
            actionDisabled
              ? "leading-snug line-through opacity-70"
              : "leading-snug"
          }
        >
          {title}
        </CardTitle>
        <a
          className="truncate text-muted-foreground text-sm underline underline-offset-2"
          href={url}
          rel="noreferrer"
          target="_blank"
        >
          {url}
        </a>
      </CardHeader>
      <CardContent className="text-sm">{description}</CardContent>
      <CardFooter className="gap-2">
        <Button
          onClick={async () => {
            await onSave();
          }}
        >
          Save
        </Button>
        <Button
          onClick={async () => {
            await onDiscard();
          }}
          variant="secondary"
        >
          Discard
        </Button>
        <Button asChild className="ml-auto" variant="outline">
          <a href={url} rel="noreferrer" target="_blank">
            Open
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}
