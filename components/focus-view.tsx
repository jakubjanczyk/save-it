"use client";

import { useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface FocusViewItem {
  id: string;
  title: string;
  description: string;
  url: string;
  email: {
    id: string;
    subject: string;
    from: string;
    receivedAt: number;
  };
}

export interface FocusViewProps {
  item: FocusViewItem;
  position: number;
  total: number;
  busy?: boolean;
  onSave: () => Promise<void> | void;
  onDiscard: () => Promise<void> | void;
}

export function FocusView({
  busy = false,
  item,
  onDiscard,
  onSave,
  position,
  total,
}: FocusViewProps) {
  const swipeState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);

  const progressLabel = useMemo(() => {
    const safeTotal = Math.max(1, total);
    const safePosition = Math.min(Math.max(1, position), safeTotal);
    return `${safePosition} of ${safeTotal}`;
  }, [position, total]);

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="leading-snug">{item.email.subject}</CardTitle>
          <span className="rounded bg-muted px-2 py-1 font-medium text-xs">
            {progressLabel}
          </span>
        </div>
        <div className="text-muted-foreground text-sm">{item.email.from}</div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div
          className="grid gap-2"
          onPointerDown={(event) => {
            if (busy) {
              return;
            }

            const target = event.target;
            if (target instanceof HTMLElement) {
              const tagName = target.tagName.toLowerCase();
              if (tagName === "button" || tagName === "a") {
                return;
              }
            }

            swipeState.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
            };
          }}
          onPointerUp={async (event) => {
            const state = swipeState.current;
            swipeState.current = null;

            if (!state || busy) {
              return;
            }

            if (event.pointerId !== state.pointerId) {
              return;
            }

            const dx = event.clientX - state.startX;
            const dy = event.clientY - state.startY;

            if (Math.abs(dx) < 90 || Math.abs(dx) < Math.abs(dy)) {
              return;
            }

            if (dx > 0) {
              await onSave();
              return;
            }

            await onDiscard();
          }}
        >
          <div className="font-semibold text-lg leading-snug">{item.title}</div>
          <a
            className="truncate text-muted-foreground text-sm underline underline-offset-2"
            href={item.url}
            rel="noreferrer"
            target="_blank"
          >
            {item.url}
          </a>
          <div className="text-sm">{item.description}</div>
          <div className="text-muted-foreground text-xs">
            Swipe left to discard, right to save.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={busy}
            onClick={async () => {
              await onSave();
            }}
          >
            Save
          </Button>
          <Button
            disabled={busy}
            onClick={async () => {
              await onDiscard();
            }}
            variant="secondary"
          >
            Discard
          </Button>
          <Button asChild className="ml-auto" variant="outline">
            <a href={item.url} rel="noreferrer" target="_blank">
              Open
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
