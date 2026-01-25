"use client";

import { animate } from "framer-motion";
import { useEffect, useLayoutEffect, useRef } from "react";

import { SWIPE_THRESHOLD_PX } from "@/components/focus/focus-swipe";
import type { SavedLinkItem } from "../convex-refs";
import {
  CLICK_ARCHIVE_BLUR_DURATION_S,
  CLICK_ARCHIVE_DELAY_S,
  CLICK_ARCHIVE_DURATION_S,
  EXIT_DURATION_S,
  exitX,
} from "./deck-constants";
import type { DeckMotion } from "./deck-motion";
import { resetNavigationMotion } from "./reset-navigation-motion";

export function useDeckDismissAnimation(params: {
  motion: DeckMotion;
  dismissing: { item: SavedLinkItem; startX: number } | null;
  onDismissAnimationComplete: () => void;
}) {
  const lastDismissedIdRef = useRef<SavedLinkItem["id"] | null>(null);

  useEffect(() => {
    if (!params.dismissing) {
      return;
    }

    const dismissingId = params.dismissing.item.id;
    if (lastDismissedIdRef.current === dismissingId) {
      return;
    }

    lastDismissedIdRef.current = dismissingId;

    resetNavigationMotion({
      motion: params.motion,
    });

    params.motion.transitionOpacity.set(1);
    params.motion.transitionScale.set(1);
    params.motion.dismissBlur.set(0);

    if (params.dismissing.startX === 0) {
      params.motion.x.set(0);

      Promise.all([
        animate(params.motion.dismissBlur, SWIPE_THRESHOLD_PX, {
          duration: CLICK_ARCHIVE_BLUR_DURATION_S,
          ease: "easeOut",
        }),
        animate(params.motion.transitionOpacity, 0, {
          delay: CLICK_ARCHIVE_DELAY_S,
          duration: CLICK_ARCHIVE_DURATION_S,
          ease: "easeOut",
        }),
        animate(params.motion.transitionScale, 0.98, {
          delay: CLICK_ARCHIVE_DELAY_S,
          duration: CLICK_ARCHIVE_DURATION_S,
          ease: "easeOut",
        }),
      ]).then(() => {
        params.onDismissAnimationComplete();
      });
      return;
    }

    params.motion.x.set(params.dismissing.startX);
    animate(params.motion.x, exitX(params.dismissing.startX), {
      duration: EXIT_DURATION_S,
      ease: "easeOut",
    }).then(() => {
      params.onDismissAnimationComplete();
    });
  }, [params.dismissing, params.motion, params.onDismissAnimationComplete]);

  useLayoutEffect(() => {
    if (params.dismissing) {
      return;
    }

    lastDismissedIdRef.current = null;
    params.motion.x.set(0);
    params.motion.dismissBlur.set(0);
    params.motion.transitionOpacity.set(1);
    params.motion.transitionScale.set(1);
  }, [params.dismissing, params.motion]);
}
