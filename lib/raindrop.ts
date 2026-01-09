import { type Duration, Effect, pipe, Schedule } from "effect";

import {
  RaindropAuthError,
  RaindropNetworkError,
  RaindropRateLimited,
  RaindropSaveFailed,
} from "./errors";
import type { Fetcher } from "./http/fetch-json";
import { fetchJson } from "./http/fetch-json";
import { isRecord } from "./type-guards/is-record";

export type RaindropError =
  | RaindropAuthError
  | RaindropNetworkError
  | RaindropRateLimited
  | RaindropSaveFailed;

interface ParsedHttpError {
  body?: string;
  retryAfter?: number;
  status: number;
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

export function mapRaindropError(error: unknown, url?: string) {
  const httpError = parseHttpError(error);

  if (!httpError) {
    return new RaindropNetworkError({
      cause: error,
      message: "Raindrop request failed",
    });
  }

  if (httpError.status === 401 || httpError.status === 403) {
    return new RaindropAuthError({
      message: httpError.body ?? "Raindrop authorization failed",
    });
  }

  if (httpError.status === 429) {
    return new RaindropRateLimited({ retryAfter: httpError.retryAfter });
  }

  if (url) {
    return new RaindropSaveFailed({
      message:
        httpError.body ?? `Raindrop request failed (${httpError.status})`,
      url,
    });
  }

  return new RaindropNetworkError({
    cause: error,
    message: httpError.body ?? `Raindrop request failed (${httpError.status})`,
  });
}

interface RaindropOptions {
  baseUrl?: string;
  fetcher?: Fetcher;
  retryBase?: Duration.DurationInput;
  retryFactor?: number;
  retryMaxRetries?: number;
}

const defaultRaindropBaseUrl = "https://api.raindrop.io";

function getFetcher(options?: RaindropOptions): Fetcher {
  if (options?.fetcher) {
    return options.fetcher;
  }
  if (typeof fetch === "function") {
    return fetch;
  }
  throw new Error("Missing fetch implementation");
}

function getBaseUrl(options?: RaindropOptions): string {
  return options?.baseUrl ?? defaultRaindropBaseUrl;
}

function isRaindropRateLimitedError(error: unknown): boolean {
  return (
    isRecord(error) &&
    (error as { _tag?: unknown })._tag === "RaindropRateLimited"
  );
}

function createRateLimitRetrySchedule(options?: RaindropOptions) {
  const retryBase: Duration.DurationInput = options?.retryBase ?? "1 second";
  const retryFactor = options?.retryFactor ?? 2;
  const retryMaxRetries = options?.retryMaxRetries ?? 3;

  return pipe(
    Schedule.exponential(retryBase, retryFactor),
    Schedule.intersect(Schedule.recurs(retryMaxRetries)),
    Schedule.whileInput(isRaindropRateLimitedError)
  );
}

function parseCreatedId(json: unknown): string | null {
  if (!isRecord(json)) {
    return null;
  }

  const record = json as { item?: unknown };
  if (!isRecord(record.item)) {
    return null;
  }

  const item = record.item as { _id?: unknown; id?: unknown };
  if (typeof item._id === "number") {
    return String(item._id);
  }
  if (typeof item._id === "string") {
    return item._id;
  }
  if (typeof item.id === "number") {
    return String(item.id);
  }
  if (typeof item.id === "string") {
    return item.id;
  }

  return null;
}

export function createRaindropBookmark(
  accessToken: string,
  input: { url: string; title: string; description?: string },
  options?: RaindropOptions
): Effect.Effect<string, RaindropError> {
  const fetcher = getFetcher(options);
  const baseUrl = getBaseUrl(options);
  const retrySchedule = createRateLimitRetrySchedule(options);

  const url = new URL("/rest/v1/raindrop", baseUrl);

  const request = Effect.tryPromise({
    try: async () => {
      const json = await fetchJson(fetcher, url.toString(), {
        body: JSON.stringify({
          collection: { $id: -1 },
          excerpt: input.description,
          link: input.url,
          title: input.title,
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        method: "POST",
      });

      const id = parseCreatedId(json);
      if (!id) {
        throw new Error("Invalid Raindrop response");
      }

      return id;
    },
    catch: (error) => mapRaindropError(error, input.url),
  });

  return pipe(request, Effect.retry(retrySchedule));
}
