"use client";

import { animate } from "framer-motion";
import { useEffect, useLayoutEffect, useRef } from "react";
import type { DeckNavigating } from "../deck/browse-deck-state";
import {
  CARD_GAP_PX,
  clamp,
  NAV_DURATION_S,
  PEEK_OPACITY,
  PEEK_SCALE,
  VERTICAL_SWIPE_THRESHOLD_PX,
} from "./deck-constants";
import type { DeckMotion } from "./deck-motion";
import { resetNavigationMotion } from "./reset-navigation-motion";

export function useDeckNavigateAnimation(params: {
  heightRef: React.RefObject<number>;
  motion: DeckMotion;
  navigating: DeckNavigating | null;
  onNavigateAnimationComplete: () => void;
}) {
  const lastNavigatedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!params.navigating) {
      return;
    }

    const key = `${params.navigating.direction}:${params.navigating.window.current.id}`;
    if (lastNavigatedKeyRef.current === key) {
      return;
    }

    lastNavigatedKeyRef.current = key;

    const height = params.heightRef.current + CARD_GAP_PX;
    const targetY = params.navigating.direction === "next" ? -height : height;
    const initialY = clamp(
      params.navigating.startY,
      -VERTICAL_SWIPE_THRESHOLD_PX,
      VERTICAL_SWIPE_THRESHOLD_PX
    );

    params.motion.x.set(0);
    params.motion.y.set(initialY);
    params.motion.dismissBlur.set(0);
    params.motion.transitionOpacity.set(1);
    params.motion.transitionScale.set(1);

    params.motion.activeNavOpacity.set(1);
    params.motion.activeNavScale.set(1);
    params.motion.prevOpacity.set(PEEK_OPACITY);
    params.motion.prevScale.set(PEEK_SCALE);
    params.motion.nextOpacity.set(PEEK_OPACITY);
    params.motion.nextScale.set(PEEK_SCALE);

    const incomingIsNext = params.navigating.direction === "next";

    Promise.all([
      animate(params.motion.y, targetY, {
        duration: NAV_DURATION_S,
        ease: "easeInOut",
      }),
      animate(params.motion.activeNavOpacity, PEEK_OPACITY, {
        duration: NAV_DURATION_S,
        ease: "easeInOut",
      }),
      animate(params.motion.activeNavScale, PEEK_SCALE, {
        duration: NAV_DURATION_S,
        ease: "easeInOut",
      }),
      incomingIsNext
        ? animate(params.motion.nextOpacity, 1, {
            duration: NAV_DURATION_S,
            ease: "easeInOut",
          })
        : animate(params.motion.prevOpacity, 1, {
            duration: NAV_DURATION_S,
            ease: "easeInOut",
          }),
      incomingIsNext
        ? animate(params.motion.nextScale, 1, {
            duration: NAV_DURATION_S,
            ease: "easeInOut",
          })
        : animate(params.motion.prevScale, 1, {
            duration: NAV_DURATION_S,
            ease: "easeInOut",
          }),
    ]).then(() => {
      params.onNavigateAnimationComplete();
    });
  }, [
    params.heightRef,
    params.motion,
    params.navigating,
    params.onNavigateAnimationComplete,
  ]);

  useLayoutEffect(() => {
    if (params.navigating) {
      return;
    }

    lastNavigatedKeyRef.current = null;
    resetNavigationMotion({
      motion: params.motion,
    });
  }, [params.motion, params.navigating]);
}
