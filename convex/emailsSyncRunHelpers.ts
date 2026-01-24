import type { GenericId } from "convex/values";
import { Cause, Chunk, Effect, Exit, pipe, Ref } from "effect";

import { summarizeError } from "../lib/logging/error-summary";

import { api, internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";

export interface SyncProgress {
  fetchedEmails: number;
  insertedEmails: number;
  processedEmails: number;
  storedLinks: number;
}

interface ErrorFields {
  errorMessage?: string;
  errorName?: string;
  errorTag?: string;
}

interface SyncStartResult {
  runId: GenericId<"syncRuns">;
  started: boolean;
}

function fromPromise<A>(
  thunk: () => Promise<A>
): Effect.Effect<A, unknown, never> {
  return Effect.tryPromise({ try: thunk, catch: (error) => error });
}

export function getErrorFields(error: unknown) {
  const summary = summarizeError(error);

  return {
    errorMessage:
      typeof summary.message === "string" ? summary.message : undefined,
    errorName: typeof summary.name === "string" ? summary.name : undefined,
    errorTag: typeof summary.tag === "string" ? summary.tag : undefined,
  };
}

export function startSyncRun(ctx: ActionCtx) {
  return pipe(
    fromPromise<SyncStartResult>(() =>
      ctx.runMutation(internal.syncruns.start, {})
    ),
    Effect.flatMap((result) =>
      result.started
        ? Effect.succeed(result.runId)
        : Effect.fail(new Error("Sync already in progress"))
    )
  );
}

function errorFieldsFromExit(exit: Exit.Exit<unknown, unknown>): ErrorFields {
  if (!Exit.isFailure(exit)) {
    return {};
  }

  const failures = Chunk.toReadonlyArray(Cause.failures(exit.cause));
  const defects = Chunk.toReadonlyArray(Cause.defects(exit.cause));

  return getErrorFields(failures[0] ?? defects[0] ?? exit.cause);
}

export function finishSyncRun(
  ctx: ActionCtx,
  runId: GenericId<"syncRuns">,
  progressRef: Ref.Ref<SyncProgress>,
  exit: Exit.Exit<unknown, unknown>
): Effect.Effect<void, never, never> {
  return pipe(
    Ref.get(progressRef),
    Effect.flatMap((progress) => {
      const status = Exit.isSuccess(exit) ? "success" : "error";
      const errorFields = errorFieldsFromExit(exit);
      const connectionErrorTag =
        errorFields.errorTag ?? errorFields.errorName ?? null;
      const shouldSetConnectionError =
        connectionErrorTag === "GmailTokenExpired" ||
        connectionErrorTag === "GmailTokenRefreshFailed";

      return pipe(
        fromPromise(() =>
          ctx.runMutation(internal.syncruns.finish, {
            ...errorFields,
            progress,
            runId,
            status,
          })
        ),
        Effect.flatMap(() => {
          if (!shouldSetConnectionError) {
            return Effect.succeed(null);
          }

          return fromPromise(() =>
            ctx.runMutation(api.googleauth.setConnectionError, {
              errorMessage: errorFields.errorMessage,
              errorTag: connectionErrorTag ?? undefined,
            })
          );
        })
      );
    }),
    Effect.catchAll((error) =>
      Effect.sync(() => {
        console.error("Failed to finish sync run", {
          error: summarizeError(error),
          runId,
        });
      })
    ),
    Effect.asVoid
  );
}
