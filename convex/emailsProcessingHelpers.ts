import type { GenericId } from "convex/values";
import { Effect, pipe, Ref, Schedule } from "effect";
import type { Scope } from "effect/Scope";

import {
  buildGmailSearchQuery,
  type GmailFullMessage,
  type GmailMessage,
} from "../lib/gmail";
import { extractLinks } from "../lib/link-extractor";
import type { ExtractedLink } from "../lib/llm-extractor";
import { summarizeError } from "../lib/logging/error-summary";
import { findSenderId, parseEmailAddress } from "../lib/senders/sender-matcher";
import { parseEmailFetchLimit } from "../lib/settings";
import { EMAIL_FETCH_LIMIT_SETTING_KEY } from "../lib/settings-keys";

import { api, internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import { createGmailClient, type GmailClient } from "./emailsGmailHelpers";
import {
  finishSyncRun,
  getErrorFields,
  type SyncProgress,
  startSyncRun,
} from "./emailsSyncRunHelpers";

interface SyncRunHeartbeatArgs {
  progress: SyncProgress;
  runId: GenericId<"syncRuns">;
}

function fromPromise<A>(
  thunk: () => Promise<A>
): Effect.Effect<A, unknown, never> {
  return Effect.tryPromise({ try: thunk, catch: (error) => error });
}

export interface SenderForMatch {
  _id: GenericId<"senders">;
  email: string;
}

export interface StoredEmailResult {
  emailId: GenericId<"emails">;
  inserted: boolean;
}

export interface StoredLinksResult {
  inserted: number;
}

export interface ExtractionResult {
  extractionError: unknown | null;
  links: ExtractedLink[];
}

export function extractLinksWithLogging(
  message: GmailFullMessage
): Effect.Effect<ExtractionResult, unknown, never> {
  return pipe(
    extractLinks(message.html, message.subject, message.from),
    Effect.map(
      (links): ExtractionResult => ({
        extractionError: null,
        links,
      })
    ),
    Effect.catchAll((error) =>
      Effect.sync(() => {
        console.error("Link extraction failed", {
          gmailId: message.gmailId,
          from: message.from,
          htmlLength: message.html.length,
          subject: message.subject,
          env: {
            hasLlmApiKey:
              typeof process.env.GOOGLE_GENERATIVE_AI_API_KEY === "string",
            llmModel: process.env.LLM_MODEL ?? "gemini-2.5-flash",
          },
          error: summarizeError(error),
        });

        return { extractionError: error, links: [] };
      })
    )
  );
}

function logFetchedGmailMessage(message: GmailFullMessage) {
  return Effect.sync(() => {
    console.info("Fetched Gmail message", {
      from: parseEmailAddress(message.from),
      gmailId: message.gmailId,
      subject: message.subject,
    });
  });
}

function bumpProcessedEmails(progressRef: Ref.Ref<SyncProgress>) {
  return Ref.update(progressRef, (progress) => ({
    ...progress,
    processedEmails: progress.processedEmails + 1,
  }));
}

function bumpInsertedAndStoredLinks(
  progressRef: Ref.Ref<SyncProgress>,
  insertedLinkCount: number
) {
  return Ref.update(progressRef, (progress) => ({
    ...progress,
    insertedEmails: progress.insertedEmails + 1,
    storedLinks: progress.storedLinks + insertedLinkCount,
  }));
}

function storeEmailIfNew(
  ctx: ActionCtx,
  senderId: GenericId<"senders">,
  message: GmailFullMessage,
  extraction: ExtractionResult
) {
  return fromPromise<StoredEmailResult>(() =>
    ctx.runMutation(internal.emails.storeEmail, {
      extractionError: extraction.extractionError != null,
      from: message.from,
      gmailId: message.gmailId,
      receivedAt: message.receivedAt,
      senderId,
      subject: message.subject,
    })
  );
}

function storeExtractedLinks(
  ctx: ActionCtx,
  emailId: GenericId<"emails">,
  links: readonly ExtractedLink[]
) {
  return fromPromise<StoredLinksResult>(() =>
    ctx.runMutation(internal.emails.storeLinks, {
      emailId,
      links: [...links],
    })
  );
}

function insertSyncLogRow(
  ctx: ActionCtx,
  attemptedAt: number,
  emailId: GenericId<"emails">,
  extraction: ExtractionResult,
  message: GmailFullMessage,
  storedLinkCount: number
) {
  return fromPromise(() =>
    ctx.runMutation(internal.sync.logs.insert, {
      attemptedAt,
      emailId,
      ...(extraction.extractionError != null
        ? getErrorFields(extraction.extractionError)
        : {}),
      extractedLinkCount: extraction.links.length,
      from: message.from,
      gmailId: message.gmailId,
      receivedAt: message.receivedAt,
      status: extraction.extractionError == null ? "success" : "error",
      storedLinkCount,
      subject: message.subject,
    })
  );
}

export function processFetchedGmailMessage(
  ctx: ActionCtx,
  gmail: GmailClient,
  senders: readonly SenderForMatch[],
  progressRef: Ref.Ref<SyncProgress>,
  message: GmailMessage
): Effect.Effect<void, unknown, never> {
  return Effect.gen(function* () {
    const fullMessage = yield* gmail.getMessage(message.id);

    yield* logFetchedGmailMessage(fullMessage);

    const extraction = yield* extractLinksWithLogging(fullMessage);

    yield* bumpProcessedEmails(progressRef);

    const senderId = findSenderId(senders, fullMessage.from);
    if (!senderId) {
      return;
    }

    const attemptedAt = Date.now();
    const storeResult = yield* storeEmailIfNew(
      ctx,
      senderId,
      fullMessage,
      extraction
    );

    if (!storeResult.inserted) {
      return;
    }

    const storeLinksResult = yield* storeExtractedLinks(
      ctx,
      storeResult.emailId,
      extraction.links
    );

    yield* insertSyncLogRow(
      ctx,
      attemptedAt,
      storeResult.emailId,
      extraction,
      fullMessage,
      storeLinksResult.inserted
    );

    yield* bumpInsertedAndStoredLinks(progressRef, storeLinksResult.inserted);
  });
}

export function fetchFromGmailProgram(
  ctx: ActionCtx
): Effect.Effect<{ fetched: number }, unknown, never> {
  const program: Effect.Effect<{ fetched: number }, unknown, Scope> =
    Effect.gen(function* () {
      const senders = yield* fromPromise<SenderForMatch[]>(() =>
        ctx.runQuery(api.senders.listSenders, {})
      );
      const senderPatterns = senders.map((sender) => sender.email);

      if (senderPatterns.length === 0) {
        return { fetched: 0 };
      }

      const emailFetchLimitRaw = yield* fromPromise<string | null>(() =>
        ctx.runQuery(api.settings.get, { key: EMAIL_FETCH_LIMIT_SETTING_KEY })
      );
      const emailFetchLimit = parseEmailFetchLimit(emailFetchLimitRaw);

      const progressRef = yield* Ref.make<SyncProgress>({
        fetchedEmails: 0,
        insertedEmails: 0,
        processedEmails: 0,
        storedLinks: 0,
      });

      const runId = yield* Effect.acquireRelease(
        startSyncRun(ctx),
        (runId, exit) => finishSyncRun(ctx, runId, progressRef, exit)
      );

      const heartbeat = pipe(
        Ref.get(progressRef),
        Effect.flatMap((progress) =>
          fromPromise(() =>
            ctx.runMutation(internal.syncruns.heartbeat, {
              progress,
              runId,
            } satisfies SyncRunHeartbeatArgs)
          )
        )
      );

      yield* Effect.forkScoped(
        Effect.repeat(heartbeat, Schedule.fixed("30 seconds"))
      );

      const gmail = createGmailClient(ctx);

      const selectedMessages = yield* gmail.listMessages(
        senderPatterns,
        emailFetchLimit
      );

      yield* Ref.update(progressRef, (progress) => ({
        ...progress,
        fetchedEmails: selectedMessages.length,
      }));

      yield* Effect.sync(() => {
        console.info("Fetched Gmail message list", {
          query: buildGmailSearchQuery(senderPatterns),
          requested: emailFetchLimit,
          returned: selectedMessages.length,
        });
      });

      yield* Effect.forEach(
        selectedMessages,
        (message) =>
          processFetchedGmailMessage(ctx, gmail, senders, progressRef, message),
        { concurrency: 1 }
      );

      const progress = yield* Ref.get(progressRef);
      return { fetched: progress.insertedEmails };
    });

  return Effect.scoped(program);
}

interface EmailForSync {
  _id: GenericId<"emails">;
  from: string;
  gmailId: string;
  receivedAt: number;
  subject: string;
}

export interface RetrySyncEmailResult {
  status: "success" | "error";
  storedLinkCount: number;
}

export function retrySyncEmailProgram(
  ctx: ActionCtx,
  emailId: GenericId<"emails">
): Effect.Effect<RetrySyncEmailResult, unknown, never> {
  return Effect.gen(function* () {
    const email = yield* fromPromise<EmailForSync | null>(() =>
      ctx.runQuery(internal.emails.getEmailForSync, { emailId })
    );

    if (!email) {
      return yield* Effect.fail(new Error("Email not found"));
    }

    const attemptedAt = Date.now();
    const gmail = createGmailClient(ctx);

    const fullMessage = yield* gmail.getMessage(email.gmailId);
    const result = yield* extractLinksWithLogging(fullMessage);

    const storedLinkCount =
      result.extractionError == null
        ? (yield* fromPromise<StoredLinksResult>(() =>
            ctx.runMutation(internal.emails.storeLinks, {
              emailId: email._id,
              links: [...result.links],
            })
          )).inserted
        : 0;

    yield* fromPromise(() =>
      ctx.runMutation(internal.emails.setEmailExtractionError, {
        emailId: email._id,
        extractionError: result.extractionError != null,
      })
    );

    yield* fromPromise(() =>
      ctx.runMutation(internal.sync.logs.insert, {
        attemptedAt,
        emailId: email._id,
        ...(result.extractionError != null
          ? getErrorFields(result.extractionError)
          : {}),
        extractedLinkCount: result.links.length,
        from: email.from,
        gmailId: email.gmailId,
        receivedAt: email.receivedAt,
        status: result.extractionError == null ? "success" : "error",
        storedLinkCount,
        subject: email.subject,
      })
    );

    return {
      status: result.extractionError == null ? "success" : "error",
      storedLinkCount,
    };
  });
}
