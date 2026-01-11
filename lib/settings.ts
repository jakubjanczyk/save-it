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
