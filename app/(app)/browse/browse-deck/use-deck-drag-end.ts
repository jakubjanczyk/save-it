"use client";

import { animate } from "framer-motion";
import { useCallback } from "react";

import { SWIPE_THRESHOLD_PX } from "@/components/focus/focus-swipe";

import { VERTICAL_SWIPE_THRESHOLD_PX } from "./deck-constants";
import type { DeckMotion } from "./deck-motion";

export function useDeckDragEnd(params: {
  dismissing: unknown;
  motion: Pick<DeckMotion, "x" | "y">;
  navigating: unknown;
  onArchive: (startX?: number) => void;
  onNextCard: (startY?: number) => boolean;
  onPreviousCard: (startY?: number) => boolean;
}) {
  return useCallback(() => {
    if (params.dismissing || params.navigating) {
      return;
    }

    const dx = params.motion.x.get();
    const dy = params.motion.y.get();

    if (
      Math.abs(dx) < SWIPE_THRESHOLD_PX &&
      Math.abs(dy) < VERTICAL_SWIPE_THRESHOLD_PX
    ) {
      animate(params.motion.x, 0, {
        damping: 28,
        stiffness: 300,
        type: "spring",
      });
      animate(params.motion.y, 0, {
        damping: 28,
        stiffness: 300,
        type: "spring",
      });
      return;
    }

    if (Math.abs(dx) >= Math.abs(dy)) {
      if (Math.abs(dx) < SWIPE_THRESHOLD_PX) {
        animate(params.motion.x, 0, {
          damping: 28,
          stiffness: 300,
          type: "spring",
        });
        animate(params.motion.y, 0, {
          damping: 28,
          stiffness: 300,
          type: "spring",
        });
        return;
      }

      params.motion.y.set(0);
      params.onArchive(dx);
      return;
    }

    if (Math.abs(dy) < VERTICAL_SWIPE_THRESHOLD_PX) {
      animate(params.motion.x, 0, {
        damping: 28,
        stiffness: 300,
        type: "spring",
      });
      animate(params.motion.y, 0, {
        damping: 28,
        stiffness: 300,
        type: "spring",
      });
      return;
    }

    params.motion.x.set(0);
    if (dy < 0) {
      const started = params.onNextCard(dy);
      if (!started) {
        animate(params.motion.y, 0, {
          damping: 28,
          stiffness: 300,
          type: "spring",
        });
      }
      return;
    }

    const started = params.onPreviousCard(dy);
    if (!started) {
      animate(params.motion.y, 0, {
        damping: 28,
        stiffness: 300,
        type: "spring",
      });
    }
  }, [
    params.dismissing,
    params.motion,
    params.navigating,
    params.onArchive,
    params.onNextCard,
    params.onPreviousCard,
  ]);
}
