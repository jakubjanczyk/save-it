export const EXIT_DISTANCE_PX = 2000;
export const MAX_BLUR_PX = 10;
export const EXIT_DURATION_S = 0.45;
export const CLICK_ARCHIVE_DELAY_S = 0.45;
export const CLICK_ARCHIVE_DURATION_S = 0.26;
export const CLICK_ARCHIVE_BLUR_DURATION_S = 0.12;

export const CLIP_X_PX = 6000;
export const CARD_GAP_PX = 12;

export const VERTICAL_SWIPE_THRESHOLD_PX = 70;

export const PEEK_PX = 20;
export const PEEK_OPACITY = 0.85;
export const PEEK_SCALE = 0.985;

export const NAV_DURATION_S = 0.34;

export function exitX(startX: number) {
  return startX >= 0 ? EXIT_DISTANCE_PX : -EXIT_DISTANCE_PX;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
