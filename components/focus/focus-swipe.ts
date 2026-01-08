import type { FocusAction } from "./types";

export const SWIPE_THRESHOLD_PX = 90;

export function isInteractiveTarget(target: unknown) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "button" || tagName === "a";
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
