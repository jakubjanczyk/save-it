"use client";

import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

import {
  FocusActions,
  FocusHeader,
  FocusLinkDetails,
} from "@/components/focus/focus-parts";
import {
  isInteractiveTarget,
  SWIPE_THRESHOLD_PX,
} from "@/components/focus/focus-swipe";
import type { FocusAction } from "@/components/focus/types";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { FocusItem } from "./focus-item";

const EXIT_DISTANCE_PX = 2000;
const MAX_BLUR_PX = 10;
const EXIT_DURATION_S = 0.45;

function exitX(action: FocusAction) {
  return action === "save" ? EXIT_DISTANCE_PX : -EXIT_DISTANCE_PX;
}

export function FocusDeck(props: {
  dismissing: { action: FocusAction; item: FocusItem; startX: number } | null;
  peekItem: FocusItem | null;
  onDismissAnimationComplete: () => void;
  onDiscard: (startX?: number) => void;
  onSave: (startX?: number) => void;
  remainingCount: number;
  shownItem: FocusItem | null;
}) {
  const x = useMotionValue(0);
  const dragControls = useDragControls();

  const rotate = useTransform(x, [-240, 240], [-4, 4]);
  const saveOpacity = useTransform(x, [0, SWIPE_THRESHOLD_PX], [0, 1]);
  const discardOpacity = useTransform(x, [0, -SWIPE_THRESHOLD_PX], [0, 1]);
  const blurFilter = useTransform(x, (value) => {
    const abs = Math.min(Math.abs(value), SWIPE_THRESHOLD_PX);
    const blur = (abs / SWIPE_THRESHOLD_PX) * MAX_BLUR_PX;
    return `blur(${blur.toFixed(2)}px)`;
  });

  const activeItem = props.dismissing?.item ?? props.shownItem;
  const underItem = props.dismissing ? props.shownItem : props.peekItem;

  const dismissingAction = props.dismissing?.action ?? null;

  const lastDismissedIdRef = useRef<FocusItem["id"] | null>(null);

  useEffect(() => {
    if (!props.dismissing) {
      return;
    }

    const dismissingId = props.dismissing.item.id;
    if (lastDismissedIdRef.current === dismissingId) {
      return;
    }

    lastDismissedIdRef.current = dismissingId;

    x.set(props.dismissing.startX);
    animate(x, exitX(props.dismissing.action), {
      duration: EXIT_DURATION_S,
      ease: "easeOut",
    }).then(() => {
      props.onDismissAnimationComplete();
    });
  }, [props.dismissing, props.onDismissAnimationComplete, x]);

  useLayoutEffect(() => {
    if (props.dismissing) {
      return;
    }

    lastDismissedIdRef.current = null;
    x.set(0);
  }, [props.dismissing, x]);

  const onDragEnd = useCallback(() => {
    if (props.dismissing) {
      return;
    }

    const dx = x.get();
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) {
      animate(x, 0, { damping: 28, stiffness: 300, type: "spring" });
      return;
    }

    if (dx > 0) {
      props.onSave(dx);
      return;
    }

    props.onDiscard(dx);
  }, [props.dismissing, props.onDiscard, props.onSave, x]);

  if (!activeItem) {
    return null;
  }

  return (
    <div className="relative">
      {underItem ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        >
          <Card className="relative h-full">
            <FocusHeader
              from={underItem.email.from}
              progress={
                <>
                  <span className="sm:hidden">{props.remainingCount}</span>
                  <span className="hidden sm:inline">
                    {props.remainingCount} remaining
                  </span>
                </>
              }
              subject={underItem.email.subject}
            />
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <FocusLinkDetails
                  description={underItem.description}
                  title={underItem.title}
                  url={underItem.url}
                />
              </div>

              <FocusActions
                disabled={true}
                onDiscard={() => undefined}
                onSave={() => undefined}
                url={underItem.url}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}

      <motion.div
        className="relative"
        drag={props.dismissing ? false : "x"}
        dragControls={dragControls}
        dragElastic={0.18}
        dragListener={false}
        onDragEnd={onDragEnd}
        onPointerDown={(event) => {
          if (props.dismissing) {
            return;
          }

          if (isInteractiveTarget(event.target)) {
            return;
          }

          dragControls.start(event);
        }}
        style={{ rotate, x }}
      >
        <Card className="relative">
          <motion.div style={{ filter: blurFilter }}>
            <FocusHeader
              from={activeItem.email.from}
              progress={
                <>
                  <span className="sm:hidden">{props.remainingCount}</span>
                  <span className="hidden sm:inline">
                    {props.remainingCount} remaining
                  </span>
                </>
              }
              subject={activeItem.email.subject}
            />
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <FocusLinkDetails
                  description={activeItem.description}
                  title={activeItem.title}
                  url={activeItem.url}
                />
              </div>

              <FocusActions
                disabled={Boolean(props.dismissing)}
                onDiscard={props.onDiscard}
                onSave={props.onSave}
                url={activeItem.url}
              />
            </CardContent>
          </motion.div>

          <div className="pointer-events-none absolute inset-0">
            <motion.div
              className={cn(
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                "rounded-full border px-6 py-3 font-semibold text-lg shadow-sm",
                "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              )}
              style={{
                opacity: dismissingAction === "save" ? 1 : saveOpacity,
              }}
            >
              Save
            </motion.div>
            <motion.div
              className={cn(
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                "rounded-full border px-6 py-3 font-semibold text-lg shadow-sm",
                "border-destructive/60 bg-destructive/25 text-red-400"
              )}
              style={{
                opacity: dismissingAction === "discard" ? 1 : discardOpacity,
              }}
            >
              Discard
            </motion.div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
