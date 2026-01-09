import { type Duration, Effect, pipe, Schedule } from "effect";

import {
  GmailMessageNotFound,
  GmailNetworkError,
  GmailRateLimited,
  GmailTokenExpired,
  GmailTokenRefreshFailed,
} from "./errors";
import type { Fetcher } from "./http/fetch-json";
import { fetchJson } from "./http/fetch-json";
import { isRecord } from "./type-guards/is-record";

interface ParsedHttpError {
  body?: string;
  retryAfter?: number;
  status: number;
}

export interface GmailMessage {
  id: string;
  threadId?: string;
}

export interface GmailFullMessage {
  from: string;
  gmailId: string;
  html: string;
  receivedAt: number;
  subject: string;
}

export interface StoredTokens {
  accessToken: string;
  expiresAt: number;
  refreshToken: string;
}

function parseHttpError(error: unknown): ParsedHttpError | null {
  if (!(isRecord(error) && "status" in error)) {
    return null;
  }

  const record = error as Record<string, unknown>;
  const status = record.status;

  if (typeof status !== "number") {
    return null;
  }

  const body = typeof record.body === "string" ? record.body : undefined;
  const retryAfter =
    typeof record.retryAfter === "number" ? record.retryAfter : undefined;

  return { body, retryAfter, status };
}

export function mapGmailError(error: unknown) {
  const httpError = parseHttpError(error);

  if (!httpError) {
    return new GmailNetworkError({
      cause: error,
      message: "Gmail request failed",
    });
  }

  if (httpError.status === 401 || httpError.status === 403) {
    return new GmailTokenExpired({
      message: httpError.body ?? "Access token expired",
    });
  }

  if (httpError.status === 429) {
    return new GmailRateLimited({ retryAfter: httpError.retryAfter });
  }

  return new GmailNetworkError({
    cause: error,
    message: httpError.body ?? `Gmail request failed (${httpError.status})`,
  });
}

interface GmailListMessagesResponse {
  messages?: GmailMessage[];
}

interface GmailOptions {
  baseUrl?: string;
  fetcher?: Fetcher;
  maxResults?: number;
  retryBase?: Duration.DurationInput;
  retryFactor?: number;
  retryMaxRetries?: number;
}

const defaultGmailBaseUrl = "https://gmail.googleapis.com";

function getFetcher(options?: GmailOptions): Fetcher {
  if (options?.fetcher) {
    return options.fetcher;
  }
  if (typeof fetch === "function") {
    return fetch;
  }
  throw new Error("Missing fetch implementation");
}

function getBaseUrl(options?: GmailOptions): string {
  return options?.baseUrl ?? defaultGmailBaseUrl;
}

function senderQuery(senderPatterns: readonly string[]) {
  if (senderPatterns.length === 0) {
    return "";
  }

  if (senderPatterns.length === 1) {
    return `from:${senderPatterns[0]}`;
  }

  return `from:(${senderPatterns.join(" OR ")})`;
}

function buildGmailQuery(senderPatterns: readonly string[]) {
  const unread = "is:unread";
  const senders = senderQuery(senderPatterns);

  if (!senders) {
    return unread;
  }

  return `${unread} ${senders}`;
}

function isGmailRateLimitedError(error: unknown): boolean {
  return (
    isRecord(error) && (error as { _tag?: unknown })._tag === "GmailRateLimited"
  );
}

function createRateLimitRetrySchedule(options?: GmailOptions) {
  const retryBase: Duration.DurationInput = options?.retryBase ?? "1 second";
  const retryFactor = options?.retryFactor ?? 2;
  const retryMaxRetries = options?.retryMaxRetries ?? 3;

  return pipe(
    Schedule.exponential(retryBase, retryFactor),
    Schedule.intersect(Schedule.recurs(retryMaxRetries)),
    Schedule.whileInput(isGmailRateLimitedError)
  );
}

export function fetchEmails(
  accessToken: string,
  senderPatterns: readonly string[],
  options?: GmailOptions
) {
  const fetcher = getFetcher(options);
  const baseUrl = getBaseUrl(options);
  const retrySchedule = createRateLimitRetrySchedule(options);

  const listUrl = new URL("/gmail/v1/users/me/messages", baseUrl);
  listUrl.searchParams.set("q", buildGmailQuery(senderPatterns));
  if (options?.maxResults != null) {
    const maxResults = Math.floor(options.maxResults);
    if (Number.isFinite(maxResults) && maxResults > 0) {
      listUrl.searchParams.set("maxResults", maxResults.toString());
    }
  }

  const request = Effect.tryPromise({
    try: async () => {
      const data = (await fetchJson(fetcher, listUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
        method: "GET",
      })) as GmailListMessagesResponse;

      return data.messages ?? [];
    },
    catch: mapGmailError,
  });

  return pipe(request, Effect.retry(retrySchedule));
}

function mapMarkAsReadError(messageId: string, error: unknown) {
  const httpError = parseHttpError(error);

  if (httpError?.status === 404) {
    return new GmailMessageNotFound({ messageId });
  }

  return mapGmailError(error);
}

interface GmailMessagePayloadPart {
  body?: {
    data?: string;
  };
  mimeType?: string;
  parts?: GmailMessagePayloadPart[];
}

interface GmailMessageResponse {
  id?: string;
  internalDate?: string;
  payload?: {
    body?: { data?: string };
    headers?: Array<{ name?: string; value?: string }>;
    parts?: GmailMessagePayloadPart[];
  };
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");

  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf-8");
  }

  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function getHeaderValue(
  headers: Array<{ name?: string; value?: string }>,
  name: string
) {
  const lower = name.toLowerCase();
  return (
    headers.find((header) => header.name?.toLowerCase() === lower)?.value ??
    null
  );
}

function findHtmlBodyData(part: GmailMessagePayloadPart): string | null {
  const mimeType = part.mimeType?.toLowerCase();
  if (mimeType === "text/html" && typeof part.body?.data === "string") {
    return part.body.data;
  }

  for (const child of part.parts ?? []) {
    const found = findHtmlBodyData(child);
    if (found) {
      return found;
    }
  }

  return null;
}

function parseFullMessage(response: unknown): GmailFullMessage | null {
  if (!isRecord(response)) {
    return null;
  }

  const data = response as GmailMessageResponse;
  const id = data.id;
  const internalDate = data.internalDate;
  const headers = data.payload?.headers ?? [];

  if (typeof id !== "string") {
    return null;
  }

  const from = getHeaderValue(headers, "From") ?? "";
  const subject = getHeaderValue(headers, "Subject") ?? "";
  const receivedAt = Number.parseInt(internalDate ?? "", 10);

  let html = "";
  const rootHtml = data.payload?.body?.data;
  if (typeof rootHtml === "string") {
    html = decodeBase64Url(rootHtml);
  } else {
    for (const part of data.payload?.parts ?? []) {
      const bodyData = findHtmlBodyData(part);
      if (bodyData) {
        html = decodeBase64Url(bodyData);
        break;
      }
    }
  }

  return {
    from,
    gmailId: id,
    html,
    receivedAt: Number.isFinite(receivedAt) ? receivedAt : Date.now(),
    subject,
  };
}

function mapGetMessageError(messageId: string, error: unknown) {
  const httpError = parseHttpError(error);

  if (httpError?.status === 404) {
    return new GmailMessageNotFound({ messageId });
  }

  return mapGmailError(error);
}

export function fetchMessageFull(
  accessToken: string,
  messageId: string,
  options?: GmailOptions
) {
  const fetcher = getFetcher(options);
  const baseUrl = getBaseUrl(options);
  const retrySchedule = createRateLimitRetrySchedule(options);

  const url = new URL(`/gmail/v1/users/me/messages/${messageId}`, baseUrl);
  url.searchParams.set("format", "full");

  const request = Effect.tryPromise({
    try: async () => {
      const json = await fetchJson(fetcher, url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
        method: "GET",
      });

      const parsed = parseFullMessage(json);
      if (!parsed) {
        throw new Error("Invalid Gmail message response");
      }

      return parsed;
    },
    catch: (error) => mapGetMessageError(messageId, error),
  });

  return pipe(request, Effect.retry(retrySchedule));
}

export function markAsRead(
  accessToken: string,
  messageId: string,
  options?: GmailOptions
) {
  const fetcher = getFetcher(options);
  const baseUrl = getBaseUrl(options);

  const url = new URL(
    `/gmail/v1/users/me/messages/${messageId}/modify`,
    baseUrl
  );

  return Effect.tryPromise({
    try: async () => {
      await fetchJson(fetcher, url.toString(), {
        body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        method: "POST",
      });
    },
    catch: (error) => mapMarkAsReadError(messageId, error),
  });
}

function isTokenExpired(tokens: StoredTokens, now: number) {
  return tokens.expiresAt <= now;
}

export function withFreshToken<A, E>(
  getTokens: () => Promise<StoredTokens>,
  saveTokens: (tokens: StoredTokens) => Promise<void>,
  operation: (accessToken: string) => Effect.Effect<A, E>,
  options?: {
    now?: () => number;
    refreshTokens?: (refreshToken: string) => Promise<StoredTokens>;
  }
) {
  const tokensEffect = pipe(
    Effect.promise(() => getTokens()),
    Effect.mapError(
      () => new GmailTokenExpired({ message: "Failed to load tokens" })
    )
  );

  const accessTokenEffect = pipe(
    tokensEffect,
    Effect.flatMap(
      (
        tokens
      ): Effect.Effect<string, GmailTokenExpired | GmailTokenRefreshFailed> => {
        const now = options?.now?.() ?? Date.now();

        if (!isTokenExpired(tokens, now)) {
          return Effect.succeed(tokens.accessToken);
        }

        if (!options?.refreshTokens) {
          return Effect.fail(
            new GmailTokenExpired({ message: "Access token expired" })
          );
        }

        return pipe(
          Effect.tryPromise({
            try: () =>
              options.refreshTokens?.(tokens.refreshToken) ??
              Promise.reject(new Error("Missing refreshTokens")),
            catch: (cause) =>
              new GmailTokenRefreshFailed({
                message: "Token refresh failed",
                cause,
              }),
          }),
          Effect.tap((newTokens) =>
            Effect.promise(() => saveTokens(newTokens))
          ),
          Effect.map((newTokens) => newTokens.accessToken)
        );
      }
    )
  );

  return pipe(accessTokenEffect, Effect.flatMap(operation));
}
