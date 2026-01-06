"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
          disabled={actionDisabled}
          onClick={async () => {
            await onSave();
          }}
        >
          Save
        </Button>
        <Button
          disabled={actionDisabled}
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
