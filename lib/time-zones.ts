import {
  DEFAULT_BACKGROUND_SYNC_TIME_ZONE,
  parseBackgroundSyncTimeZone,
} from "./settings";

const COMMON_TIME_ZONES = [
  "UTC",
  "Etc/GMT+12",
  "Pacific/Pago_Pago",
  "Pacific/Honolulu",
  "Pacific/Marquesas",
  "Pacific/Gambier",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Regina",
  "America/Bogota",
  "America/Caracas",
  "America/Argentina/Buenos_Aires",
  "Atlantic/South_Georgia",
  "Atlantic/Cape_Verde",
  "Europe/London",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Africa/Nairobi",
  "Asia/Tehran",
  "Asia/Dubai",
  "Asia/Kabul",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Kathmandu",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Darwin",
  "Australia/Brisbane",
  "Pacific/Noumea",
  "Pacific/Tarawa",
  "Pacific/Chatham",
  "Pacific/Apia",
  "Pacific/Kiritimati",
] as const;

export function detectTimeZone(): string {
  return (
    Intl.DateTimeFormat().resolvedOptions().timeZone ??
    DEFAULT_BACKGROUND_SYNC_TIME_ZONE
  );
}

export function buildTimeZoneOptions(
  detectedTimeZone: string,
  storedTimeZone: string
): string[] {
  const normalized = new Set<string>();

  for (const timeZone of COMMON_TIME_ZONES) {
    normalized.add(parseBackgroundSyncTimeZone(timeZone));
  }

  normalized.add(parseBackgroundSyncTimeZone(detectedTimeZone));
  normalized.add(parseBackgroundSyncTimeZone(storedTimeZone));

  return Array.from(normalized).sort();
}
