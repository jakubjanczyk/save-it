export const DEFAULT_EMAIL_FETCH_LIMIT = 10;
export const MAX_EMAIL_FETCH_LIMIT = 50;

export type EmailFinalizeAction = "markAsRead" | "archive";
export const DEFAULT_EMAIL_FINALIZE_ACTION: EmailFinalizeAction = "markAsRead";

export function parseEmailFetchLimit(value: string | null): number {
  if (!value) {
    return DEFAULT_EMAIL_FETCH_LIMIT;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_EMAIL_FETCH_LIMIT;
  }

  if (parsed < 1) {
    return 1;
  }

  return Math.min(parsed, MAX_EMAIL_FETCH_LIMIT);
}

export function parseEmailFinalizeAction(
  value: string | null
): EmailFinalizeAction {
  if (value === "archive") {
    return "archive";
  }

  return DEFAULT_EMAIL_FINALIZE_ACTION;
}

export const DEFAULT_BACKGROUND_SYNC_ENABLED = false;
export const DEFAULT_BACKGROUND_SYNC_LOCAL_HOUR = 9;
export const DEFAULT_BACKGROUND_SYNC_TIME_ZONE = "UTC";

export function parseBackgroundSyncEnabled(value: string | null): boolean {
  return value === "true";
}

export function parseBackgroundSyncLocalHour(value: string | null): number {
  if (!value) {
    return DEFAULT_BACKGROUND_SYNC_LOCAL_HOUR;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_BACKGROUND_SYNC_LOCAL_HOUR;
  }

  return Math.max(0, Math.min(23, parsed));
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function parseBackgroundSyncTimeZone(value: string | null): string {
  const normalized = value?.trim() ?? "";
  if (normalized && isValidTimeZone(normalized)) {
    return normalized;
  }

  return DEFAULT_BACKGROUND_SYNC_TIME_ZONE;
}

export const DEFAULT_RAINDROP_SYNC_ENABLED = true;

export function parseRaindropSyncEnabled(value: string | null): boolean {
  if (value === null) {
    return DEFAULT_RAINDROP_SYNC_ENABLED;
  }
  return value === "true";
}
