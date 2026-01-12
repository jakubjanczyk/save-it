import type { FocusAction } from "./types";

export const SWIPE_THRESHOLD_PX = 90;

export function isInteractiveTarget(target: unknown) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest("button,a"));
}

export function getSwipeAction(
  dx: number,
  dy: number,
  thresholdPx: number = SWIPE_THRESHOLD_PX
): FocusAction | null {
  if (Math.abs(dx) < thresholdPx || Math.abs(dx) < Math.abs(dy)) {
    return null;
  }

  return dx > 0 ? "save" : "discard";
}
