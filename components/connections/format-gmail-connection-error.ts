import type { GoogleConnectionStatus } from "./convex-refs";

export function formatGmailConnectionError(
  status: GoogleConnectionStatus
): string | null {
  if (!(status.errorMessage || status.errorTag)) {
    return null;
  }

  if (status.errorTag === "GmailTokenExpired") {
    return "Connection expired. Reconnect to continue.";
  }

  if (status.errorTag === "GmailTokenRefreshFailed") {
    return "Token refresh failed. Reconnect to continue.";
  }

  return status.errorMessage ?? "Connection error. Reconnect to continue.";
}
