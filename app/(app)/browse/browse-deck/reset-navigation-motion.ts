"use client";

import { PEEK_OPACITY, PEEK_SCALE } from "./deck-constants";

import type { DeckMotion } from "./deck-motion";

export function resetNavigationMotion(params: {
  motion: Pick<
    DeckMotion,
    | "activeNavOpacity"
    | "activeNavScale"
    | "nextOpacity"
    | "nextScale"
    | "prevOpacity"
    | "prevScale"
    | "y"
  >;
}) {
  params.motion.y.set(0);
  params.motion.activeNavOpacity.set(1);
  params.motion.activeNavScale.set(1);
  params.motion.prevOpacity.set(PEEK_OPACITY);
  params.motion.prevScale.set(PEEK_SCALE);
  params.motion.nextOpacity.set(PEEK_OPACITY);
  params.motion.nextScale.set(PEEK_SCALE);
}
