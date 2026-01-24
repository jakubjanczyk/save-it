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
  isInteractiveTarget,
  SWIPE_THRESHOLD_PX,
} from "@/components/focus/focus-swipe";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { BrowseCard } from "./browse-card";
import type { SavedLinkItem } from "./convex-refs";

const EXIT_DISTANCE_PX = 2000;
const NAV_EXIT_PX = 90;
const MAX_BLUR_PX = 10;
const EXIT_DURATION_S = 0.45;
const NAV_DURATION_S = 0.18;

function exitX(startX: number) {
  return startX >= 0 ? EXIT_DISTANCE_PX : -EXIT_DISTANCE_PX;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function BrowseDeck(props: {
  dismissing: { item: SavedLinkItem; startX: number } | null;
  navigating: {
    direction: "next" | "previous";
    item: SavedLinkItem;
    startY: number;
  } | null;
  onArchive: (startX?: number) => void;
  onDismissAnimationComplete: () => void;
  onNavigateAnimationComplete: () => void;
  onNextCard: (startY?: number) => boolean;
  onFavorite: () => void;
  onPreviousCard: (startY?: number) => boolean;
  onSendToRaindrop?: () => void;
  peekItem: SavedLinkItem | null;
  remainingCount: number;
  showSendToRaindrop: boolean;
  shownItem: SavedLinkItem | null;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const transitionOpacity = useMotionValue(1);
  const transitionScale = useMotionValue(1);
  const dragControls = useDragControls();

  const rotate = useTransform(x, [-240, 240], [-4, 4]);
  const archiveOpacity = useTransform(
    x,
    [-SWIPE_THRESHOLD_PX, 0, SWIPE_THRESHOLD_PX],
    [1, 0, 1]
  );
  const blurFilter = useTransform(x, (value) => {
    const abs = Math.min(Math.abs(value), SWIPE_THRESHOLD_PX);
    const blur = (abs / SWIPE_THRESHOLD_PX) * MAX_BLUR_PX;
    return `blur(${blur.toFixed(2)}px)`;
  });

  const activeItem =
    props.dismissing?.item ?? props.navigating?.item ?? props.shownItem;
  const isTransitioning = Boolean(props.dismissing || props.navigating);
  const underItem = isTransitioning ? props.shownItem : props.peekItem;

  const isDismissing = props.dismissing !== null;

  const lastDismissedIdRef = useRef<SavedLinkItem["id"] | null>(null);
  const lastNavigatedKeyRef = useRef<string | null>(null);

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
    animate(x, exitX(props.dismissing.startX), {
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

  useEffect(() => {
    if (!props.navigating) {
      return;
    }

    const key = `${props.navigating.direction}:${props.navigating.item.id}`;
    if (lastNavigatedKeyRef.current === key) {
      return;
    }

    lastNavigatedKeyRef.current = key;

    const isUp = props.navigating.startY < 0;
    const initialY = isUp
      ? clamp(props.navigating.startY, -NAV_EXIT_PX, 0)
      : clamp(props.navigating.startY, 0, NAV_EXIT_PX);
    const targetY = isUp ? -NAV_EXIT_PX : NAV_EXIT_PX;

    y.set(initialY);
    transitionOpacity.set(1);
    transitionScale.set(1);

    Promise.all([
      animate(y, targetY, {
        duration: NAV_DURATION_S,
        ease: "easeOut",
      }),
      animate(transitionOpacity, 0, {
        duration: NAV_DURATION_S,
        ease: "easeOut",
      }),
      animate(transitionScale, 0.98, {
        duration: NAV_DURATION_S,
        ease: "easeOut",
      }),
    ]).then(() => {
      props.onNavigateAnimationComplete();
    });
  }, [
    props.navigating,
    props.onNavigateAnimationComplete,
    transitionOpacity,
    transitionScale,
    y,
  ]);

  useLayoutEffect(() => {
    if (props.navigating) {
      return;
    }

    lastNavigatedKeyRef.current = null;
    y.set(0);
    transitionOpacity.set(1);
    transitionScale.set(1);
  }, [props.navigating, transitionOpacity, transitionScale, y]);

  const onDragEnd = useCallback(() => {
    if (props.dismissing || props.navigating) {
      return;
    }

    const dx = x.get();
    const dy = y.get();

    if (
      Math.abs(dx) < SWIPE_THRESHOLD_PX &&
      Math.abs(dy) < SWIPE_THRESHOLD_PX
    ) {
      animate(x, 0, { damping: 28, stiffness: 300, type: "spring" });
      animate(y, 0, { damping: 28, stiffness: 300, type: "spring" });
      return;
    }

    if (Math.abs(dx) >= Math.abs(dy)) {
      if (Math.abs(dx) < SWIPE_THRESHOLD_PX) {
        animate(x, 0, { damping: 28, stiffness: 300, type: "spring" });
        animate(y, 0, { damping: 28, stiffness: 300, type: "spring" });
        return;
      }

      y.set(0);
      props.onArchive(dx);
      return;
    }

    if (Math.abs(dy) < SWIPE_THRESHOLD_PX) {
      animate(x, 0, { damping: 28, stiffness: 300, type: "spring" });
      animate(y, 0, { damping: 28, stiffness: 300, type: "spring" });
      return;
    }

    x.set(0);
    if (dy < 0) {
      const started = props.onNextCard(dy);
      if (!started) {
        animate(y, 0, { damping: 28, stiffness: 300, type: "spring" });
      }
      return;
    }

    const started = props.onPreviousCard(dy);
    if (!started) {
      animate(y, 0, { damping: 28, stiffness: 300, type: "spring" });
    }
  }, [
    props.dismissing,
    props.navigating,
    props.onArchive,
    props.onNextCard,
    props.onPreviousCard,
    x,
    y,
  ]);

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
            <div className="flex items-center justify-between gap-2 border-b p-4">
              <span className="font-medium text-sm">Saved Links</span>
              <span className="shrink-0 rounded bg-primary/20 px-2 py-1 font-medium text-foreground text-xs">
                {props.remainingCount} remaining
              </span>
            </div>
            <BrowseCard
              disabled={true}
              item={underItem}
              onArchive={() => undefined}
              onFavorite={() => undefined}
              showSendToRaindrop={props.showSendToRaindrop}
            />
          </Card>
        </div>
      ) : null}

      <motion.div
        className="relative"
        drag={!(props.dismissing || props.navigating)}
        dragControls={dragControls}
        dragElastic={0.18}
        dragListener={false}
        onDragEnd={onDragEnd}
        onPointerDown={(event) => {
          if (props.dismissing || props.navigating) {
            return;
          }

          if (isInteractiveTarget(event.target)) {
            return;
          }

          dragControls.start(event);
        }}
        style={{
          opacity: transitionOpacity,
          rotate,
          scale: transitionScale,
          touchAction: "none",
          x,
          y,
        }}
      >
        <Card className="relative">
          <motion.div style={{ filter: blurFilter }}>
            <div className="flex items-center justify-between gap-2 border-b p-4">
              <span className="font-medium text-sm">Saved Links</span>
              <span className="shrink-0 rounded bg-primary/20 px-2 py-1 font-medium text-foreground text-xs">
                {props.remainingCount} remaining
              </span>
            </div>
            <BrowseCard
              disabled={false}
              item={activeItem}
              onArchive={props.onArchive}
              onFavorite={props.onFavorite}
              onSendToRaindrop={props.onSendToRaindrop}
              showSendToRaindrop={props.showSendToRaindrop}
            />
          </motion.div>

          <div className="pointer-events-none absolute inset-0">
            <motion.div
              className={cn(
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                "rounded-full border px-6 py-3 font-semibold text-lg shadow-sm",
                "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300"
              )}
              style={{
                opacity: isDismissing ? 1 : archiveOpacity,
              }}
            >
              Archive
            </motion.div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
