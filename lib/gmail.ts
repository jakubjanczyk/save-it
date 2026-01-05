import { type Duration, Effect, pipe, Schedule } from "effect";

import {
  GmailMessageNotFound,
  GmailNetworkError,
  GmailRateLimited,
  GmailTokenExpired,
  GmailTokenRefreshFailed,
} from "./errors";

interface ParsedHttpError {
  body?: string;
  retryAfter?: number;
  status: number;
}

export interface GmailMessage {
  id: string;
  threadId?: string;
}

export interface StoredTokens {
  accessToken: string;
  expiresAt: number;
  refreshToken: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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

interface FetchFailure {
  body?: string;
  retryAfter?: number;
  status: number;
}

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

interface GmailListMessagesResponse {
  messages?: GmailMessage[];
}

interface GmailOptions {
  baseUrl?: string;
  fetcher?: Fetcher;
  retryBase?: Duration.DurationInput;
  retryFactor?: number;
  retryMaxRetries?: number;
}

const defaultGmailBaseUrl = "https://gmail.googleapis.com";

function parseRetryAfter(headerValue: string | null): number | undefined {
  if (!headerValue) {
    return undefined;
  }

  const parsed = Number.parseInt(headerValue, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function fetchJson(fetcher: Fetcher, url: string, init: RequestInit) {
  const response = await fetcher(url, init);

  if (!response.ok) {
    let body: string | undefined;
    try {
      body = await response.text();
    } catch {
      body = undefined;
    }

    const failure: FetchFailure = {
      body,
      retryAfter: parseRetryAfter(response.headers.get("retry-after")),
      status: response.status,
    }

    throw failure;
  }

  return await response.json();
}

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

export function fetchEmails(
  accessToken: string,
  senderPatterns: readonly string[],
  options?: GmailOptions
) {
  const fetcher = getFetcher(options);
  const baseUrl = getBaseUrl(options);
  const retryBase: Duration.DurationInput = options?.retryBase ?? "1 second";
  const retryFactor = options?.retryFactor ?? 2;
  const retryMaxRetries = options?.retryMaxRetries ?? 3;

  const retrySchedule = pipe(
    Schedule.exponential(retryBase, retryFactor),
    Schedule.intersect(Schedule.recurs(retryMaxRetries)),
    Schedule.whileInput(isGmailRateLimitedError)
  );

  const listUrl = new URL("/gmail/v1/users/me/messages", baseUrl);
  listUrl.searchParams.set("q", buildGmailQuery(senderPatterns));

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
