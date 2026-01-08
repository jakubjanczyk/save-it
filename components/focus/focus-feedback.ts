import type { TargetAndTransition, Transition } from "framer-motion";

import type { FocusFeedbackAction } from "./types";

export const FEEDBACK_DURATION_MS = 1200;

export function formatProgressLabel(position: number, total: number) {
  const safeTotal = Math.max(1, total);
  const safePosition = Math.min(Math.max(1, position), safeTotal);
  return `${safePosition} of ${safeTotal}`;
}

export function getFeedbackKey(
  itemId: string,
  action: FocusFeedbackAction
): string | null {
  return action ? `${itemId}:${action}` : null;
}

export function getMotionForFeedback(props: {
  action: FocusFeedbackAction;
  durationMs?: number;
  reducedMotion: boolean;
}): { animate: TargetAndTransition; transition: Transition } {
  if (!props.action || props.reducedMotion) {
    return {
      animate: { opacity: 1, rotate: 0, x: 0 },
      transition: { duration: 0.22, ease: "easeInOut" },
    };
  }

  const durationMs = props.durationMs ?? FEEDBACK_DURATION_MS;
  const durationSeconds = durationMs / 1000;
  const isSave = props.action === "save";

  return {
    animate: {
      opacity: [1, 1, 0],
      rotate: [0, 0, isSave ? 2 : -2],
      x: [0, 0, isSave ? 260 : -260],
    },
    transition: {
      duration: durationSeconds,
      ease: "easeInOut",
      times: [0, 0.7, 1],
    },
  };
}
