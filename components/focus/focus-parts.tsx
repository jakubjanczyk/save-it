"use client";

import { Check, X } from "lucide-react";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { FocusAction } from "./types";

export function FocusHeader(props: {
  subject: string;
  from: string;
  progress: React.ReactNode;
}) {
  return (
    <CardHeader className="gap-2">
      <div className="flex items-start justify-between gap-2">
        <CardTitle
          className={cn(
            "min-w-0 leading-snug",
            "min-h-[2lh] overflow-hidden [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [display:-webkit-box]",
            "sm:min-h-[1lh] sm:truncate sm:whitespace-nowrap sm:[display:block]"
          )}
        >
          {props.subject}
        </CardTitle>
        <span className="shrink-0 rounded bg-muted px-2 py-1 font-medium text-xs">
          {props.progress}
        </span>
      </div>
      <div className="min-h-[1lh] truncate text-muted-foreground text-sm">
        {props.from}
      </div>
    </CardHeader>
  );
}

export function FocusLinkDetails(props: {
  title: string;
  url: string;
  description: string;
}) {
  return (
    <>
      <div
        className={cn(
          "font-semibold text-lg leading-snug",
          "min-h-[2lh] overflow-hidden [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [display:-webkit-box]",
          "sm:min-h-[1lh] sm:truncate sm:whitespace-nowrap sm:[display:block]"
        )}
      >
        {props.title}
      </div>
      <a
        className="block min-h-[1lh] truncate text-muted-foreground text-sm underline underline-offset-2"
        href={props.url}
        rel="noreferrer noopener"
        target="_blank"
      >
        {props.url}
      </a>
      <div
        className={cn(
          "text-sm",
          "min-h-[10lh] overflow-hidden [-webkit-box-orient:vertical] [-webkit-line-clamp:10] [display:-webkit-box]",
          "sm:min-h-[3lh] sm:[-webkit-line-clamp:3]"
        )}
      >
        {props.description}
      </div>
      <div className="min-h-[1lh] truncate text-muted-foreground text-xs">
        Swipe left to discard, right to save.
      </div>
    </>
  );
}

export function FocusActions(props: {
  disabled: boolean;
  url: string;
  onSave: () => Promise<void> | void;
  onDiscard: () => Promise<void> | void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        className="w-auto"
        disabled={props.disabled}
        onClick={async () => {
          await props.onSave();
        }}
      >
        Save
      </Button>
      <Button
        className="w-auto"
        disabled={props.disabled}
        onClick={async () => {
          await props.onDiscard();
        }}
        variant="secondary"
      >
        Discard
      </Button>
      <Button asChild className="ml-auto w-auto" variant="outline">
        <a href={props.url} rel="noreferrer noopener" target="_blank">
          Open
        </a>
      </Button>
    </div>
  );
}

function overlayConfig(action: FocusAction) {
  if (action === "save") {
    return {
      className:
        "border-emerald-500/40 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
      icon: <Check className="h-5 w-5" />,
      label: "Saved",
    };
  }

  return {
    className: "border-destructive/40 bg-destructive/20 text-destructive",
    icon: <X className="h-5 w-5" />,
    label: "Discarded",
  };
}

export function FocusFeedbackOverlay(props: { action: FocusAction }) {
  const overlay = overlayConfig(props.action);

  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-md bg-black/15 backdrop-blur-2xl dark:bg-black/35">
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border px-4 py-2 font-semibold text-base shadow-sm",
          overlay.className
        )}
      >
        {overlay.icon}
        {overlay.label}
      </div>
    </div>
  );
}
