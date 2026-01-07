"use client";

import {
  motion,
  type TargetAndTransition,
  type Transition,
  useReducedMotion,
} from "framer-motion";
import { Check, X } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const feedbackDurationMs = 1200;

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
  feedbackAction?: "save" | "discard" | null;
  onSave: () => Promise<void> | void;
  onDiscard: () => Promise<void> | void;
  onFeedbackComplete?: () => void;
}

export function FocusView({
  busy = false,
  feedbackAction = null,
  item,
  onDiscard,
  onFeedbackComplete,
  onSave,
  position,
  total,
}: FocusViewProps) {
  const reducedMotion = useReducedMotion();
  const swipeState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);

  const feedbackCompleteRef = useRef(false);
  const prevFeedbackActionRef = useRef<FocusViewProps["feedbackAction"]>(null);
  const prevItemIdRef = useRef(item.id);

  if (prevFeedbackActionRef.current !== feedbackAction) {
    prevFeedbackActionRef.current = feedbackAction;
    feedbackCompleteRef.current = false;
  }

  if (prevItemIdRef.current !== item.id) {
    prevItemIdRef.current = item.id;
    feedbackCompleteRef.current = false;
  }

  useEffect(() => {
    if (!(feedbackAction && reducedMotion)) {
      return;
    }

    const timer = setTimeout(() => {
      if (feedbackCompleteRef.current) {
        return;
      }

      feedbackCompleteRef.current = true;
      onFeedbackComplete?.();
    }, feedbackDurationMs);

    return () => {
      clearTimeout(timer);
    };
  }, [feedbackAction, onFeedbackComplete, reducedMotion]);

  const progressLabel = useMemo(() => {
    const safeTotal = Math.max(1, total);
    const safePosition = Math.min(Math.max(1, position), safeTotal);
    return `${safePosition} of ${safeTotal}`;
  }, [position, total]);

  let overlay: null | { className: string; icon: ReactNode; label: string } =
    null;

  if (feedbackAction === "save") {
    overlay = {
      className:
        "border-emerald-500/40 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
      icon: <Check className="h-5 w-5" />,
      label: "Saved",
    };
  } else if (feedbackAction === "discard") {
    overlay = {
      className: "border-destructive/40 bg-destructive/20 text-destructive",
      icon: <X className="h-5 w-5" />,
      label: "Discarded",
    };
  }

  let animate: TargetAndTransition = { opacity: 1, rotate: 0, x: 0 };
  let transition: Transition = {
    duration: 0.22,
    ease: "easeInOut",
  };
  if (feedbackAction && !reducedMotion) {
    if (feedbackAction === "save") {
      animate = {
        opacity: [1, 1, 0],
        rotate: [0, 0, 2],
        x: [0, 0, 260],
      };
    } else {
      animate = {
        opacity: [1, 1, 0],
        rotate: [0, 0, -2],
        x: [0, 0, -260],
      };
    }

    transition = {
      duration: feedbackDurationMs / 1000,
      ease: "easeInOut",
      times: [0, 0.7, 1],
    };
  }

  return (
    <motion.div
      animate={animate}
      onAnimationComplete={() => {
        if (!feedbackAction || reducedMotion) {
          return;
        }

        if (feedbackCompleteRef.current) {
          return;
        }

        feedbackCompleteRef.current = true;
        onFeedbackComplete?.();
      }}
      transition={transition}
    >
      <Card className={cn(overlay ? "relative" : undefined)}>
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
              if (busy || feedbackAction) {
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

              if (!state || busy || feedbackAction) {
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
            <div className="font-semibold text-lg leading-snug">
              {item.title}
            </div>
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
              disabled={busy || Boolean(feedbackAction)}
              onClick={async () => {
                await onSave();
              }}
            >
              Save
            </Button>
            <Button
              disabled={busy || Boolean(feedbackAction)}
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
        {overlay ? (
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
        ) : null}
      </Card>
    </motion.div>
  );
}
