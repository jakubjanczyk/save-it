import { type FunctionReference, makeFunctionReference } from "convex/server";
import { type GenericId, v } from "convex/values";
import { Effect, pipe } from "effect";

import {
  fetchEmails,
  fetchMessageFull,
  type GmailFullMessage,
  markAsRead as markGmailAsRead,
  type StoredTokens,
  withFreshToken,
} from "../lib/gmail";
import { refreshGoogleAccessToken } from "../lib/google-oauth";
import { extractLinks } from "../lib/link-extractor";
import { summarizeError } from "../lib/logging/error-summary";
import { findSenderId } from "../lib/senders/sender-matcher";
import { parseEmailFetchLimit } from "../lib/settings";

import { EMAIL_FETCH_LIMIT_SETTING_KEY } from "../lib/settings-keys";
import {
  type ActionCtx,
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";

interface SenderDoc {
  _id: GenericId<"senders">;
  email: string;
  name?: string;
  createdAt: number;
}

interface GoogleTokens extends Record<string, unknown> {
  accessToken: string;
  expiresAt: number;
  refreshToken: string;
}

const getTokens: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  GoogleTokens | null
> = makeFunctionReference("googleauth:getTokens");

const saveTokens: FunctionReference<
  "mutation",
  "public",
  GoogleTokens,
  string
> = makeFunctionReference("googleauth:saveTokens");

const listSenders: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  SenderDoc[]
> = makeFunctionReference("senders:listSenders");

const getSetting: FunctionReference<
  "query",
  "public",
  { key: string },
  string | null
> = makeFunctionReference("settings:get");

const storeEmailRef = makeFunctionReference(
  "emails:storeEmail"
) as unknown as FunctionReference<
  "mutation",
  "internal",
  {
    extractionError: boolean;
    from: string;
    gmailId: string;
    receivedAt: number;
    senderId: GenericId<"senders">;
    subject: string;
  },
  { emailId: GenericId<"emails">; inserted: boolean }
>;

const storeLinksRef = makeFunctionReference(
  "emails:storeLinks"
) as unknown as FunctionReference<
  "mutation",
  "internal",
  {
    emailId: GenericId<"emails">;
    links: Array<{ description: string; title: string; url: string }>;
  },
  { inserted: number }
>;

const getEmailRef = makeFunctionReference(
  "emails:getEmail"
) as unknown as FunctionReference<
  "query",
  "internal",
  { emailId: GenericId<"emails"> },
  {
    _id: GenericId<"emails">;
    gmailId: string;
    markedAsRead: boolean;
  } | null
>;

const discardPendingLinksRef = makeFunctionReference(
  "emails:discardPendingLinks"
) as unknown as FunctionReference<
  "mutation",
  "internal",
  { emailId: GenericId<"emails"> },
  { discarded: number }
>;

const markEmailAsReadRef = makeFunctionReference(
  "emails:markEmailAsRead"
) as unknown as FunctionReference<
  "mutation",
  "internal",
  { emailId: GenericId<"emails">; processedAt: number },
  null
>;

const insertSyncLogRef = makeFunctionReference(
  "sync/logs:insert"
) as unknown as FunctionReference<
  "mutation",
  "internal",
  {
    attemptedAt: number;
    emailId: GenericId<"emails">;
    errorMessage?: string;
    errorName?: string;
    errorTag?: string;
    extractedLinkCount: number;
    from: string;
    gmailId: string;
    receivedAt: number;
    status: "success" | "error";
    storedLinkCount: number;
    subject: string;
  },
  null
>;

function createGoogleTokenFlow(ctx: ActionCtx) {
  const loadTokens = async (): Promise<StoredTokens> => {
    const tokens = await ctx.runQuery(getTokens, {});
    if (!tokens) {
      throw new Error("Gmail not connected");
    }
    return {
      accessToken: tokens.accessToken,
      expiresAt: tokens.expiresAt,
      refreshToken: tokens.refreshToken,
    };
  };

  const persistTokens = async (tokens: StoredTokens) => {
    await ctx.runMutation(saveTokens, {
      accessToken: tokens.accessToken,
      expiresAt: tokens.expiresAt,
      refreshToken: tokens.refreshToken,
    });
  };

  const refreshTokens = async (refreshToken: string): Promise<StoredTokens> => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!(clientId && clientSecret)) {
      throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
    }

    return await refreshGoogleAccessToken({
      env: { clientId, clientSecret },
      refreshToken,
    });
  };

  return { loadTokens, persistTokens, refreshTokens };
}

function getErrorFields(error: unknown) {
  const summary = summarizeError(error);

  return {
    errorMessage:
      typeof summary.message === "string" ? summary.message : undefined,
    errorName: typeof summary.name === "string" ? summary.name : undefined,
    errorTag: typeof summary.tag === "string" ? summary.tag : undefined,
  };
}

export const fetchFromGmail = action({
  args: {},
  handler: async (ctx) => {
    const senders = await ctx.runQuery(listSenders, {});
    const senderPatterns = senders.map((sender) => sender.email);

    if (senderPatterns.length === 0) {
      return { fetched: 0 };
    }

    const emailFetchLimit = parseEmailFetchLimit(
      await ctx.runQuery(getSetting, { key: EMAIL_FETCH_LIMIT_SETTING_KEY })
    );

    const { loadTokens, persistTokens, refreshTokens } =
      createGoogleTokenFlow(ctx);

    interface FetchResult {
      extractionError: unknown | null;
      links: Array<{ description: string; title: string; url: string }>;
      message: GmailFullMessage;
    }

    const program: Effect.Effect<FetchResult[], unknown> = withFreshToken(
      loadTokens,
      persistTokens,
      (accessToken) =>
        pipe(
          fetchEmails(accessToken, senderPatterns, {
            maxResults: emailFetchLimit,
          }),
          Effect.flatMap((messages) =>
            Effect.forEach(messages.slice(0, emailFetchLimit), (message) =>
              pipe(
                fetchMessageFull(accessToken, message.id),
                Effect.flatMap((fullMessage) => {
                  return pipe(
                    extractLinks(
                      fullMessage.html,
                      fullMessage.subject,
                      fullMessage.from
                    ),
                    Effect.map(
                      (links): FetchResult => ({
                        extractionError: null,
                        links,
                        message: fullMessage,
                      })
                    ),
                    Effect.catchAll((error) =>
                      Effect.sync(() => {
                        console.error("Link extraction failed", {
                          gmailId: fullMessage.gmailId,
                          from: fullMessage.from,
                          htmlLength: fullMessage.html.length,
                          subject: fullMessage.subject,
                          env: {
                            hasLlmApiKey:
                              typeof process.env
                                .GOOGLE_GENERATIVE_AI_API_KEY === "string",
                            llmModel:
                              process.env.LLM_MODEL ?? "gemini-2.5-flash",
                          },
                          error: summarizeError(error),
                        });

                        return {
                          extractionError: error,
                          links: [],
                          message: fullMessage,
                        } satisfies FetchResult;
                      })
                    )
                  );
                })
              )
            )
          )
        ),
      { refreshTokens }
    );

    const results = await Effect.runPromise(program);

    let inserted = 0;

    for (const item of results) {
      const attemptedAt = Date.now();
      const senderId = findSenderId(senders, item.message.from);
      if (!senderId) {
        continue;
      }

      const storeResult = await ctx.runMutation(storeEmailRef, {
        extractionError: item.extractionError != null,
        from: item.message.from,
        gmailId: item.message.gmailId,
        receivedAt: item.message.receivedAt,
        senderId,
        subject: item.message.subject,
      });

      if (!storeResult.inserted) {
        continue;
      }

      const storeLinksResult = await ctx.runMutation(storeLinksRef, {
        emailId: storeResult.emailId,
        links: item.links,
      });

      await ctx.runMutation(insertSyncLogRef, {
        attemptedAt,
        emailId: storeResult.emailId,
        ...(item.extractionError != null
          ? getErrorFields(item.extractionError)
          : {}),
        extractedLinkCount: item.links.length,
        from: item.message.from,
        gmailId: item.message.gmailId,
        receivedAt: item.message.receivedAt,
        status: item.extractionError == null ? "success" : "error",
        storedLinkCount: storeLinksResult.inserted,
        subject: item.message.subject,
      });

      inserted += 1;
    }

    return { fetched: inserted };
  },
});

export const storeEmail = internalMutation({
  args: {
    extractionError: v.boolean(),
    from: v.string(),
    gmailId: v.string(),
    receivedAt: v.number(),
    senderId: v.id("senders"),
    subject: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("emails")
      .withIndex("by_gmailId", (q) => q.eq("gmailId", args.gmailId))
      .unique();

    if (existing) {
      return { emailId: existing._id, inserted: false };
    }

    const emailId = await ctx.db.insert("emails", {
      extractionError: args.extractionError,
      from: args.from,
      gmailId: args.gmailId,
      markedAsRead: false,
      processedAt: Date.now(),
      receivedAt: args.receivedAt,
      senderId: args.senderId,
      subject: args.subject,
    });

    return { emailId, inserted: true };
  },
});

export const storeLinks = internalMutation({
  args: {
    emailId: v.id("emails"),
    links: v.array(
      v.object({
        description: v.string(),
        title: v.string(),
        url: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    let inserted = 0;

    for (const link of args.links) {
      const existing = await ctx.db
        .query("links")
        .withIndex("by_emailId_url", (q) =>
          q.eq("emailId", args.emailId).eq("url", link.url)
        )
        .unique();

      if (existing) {
        continue;
      }

      await ctx.db.insert("links", {
        description: link.description,
        emailId: args.emailId,
        status: "pending",
        title: link.title,
        url: link.url,
      });

      inserted += 1;
    }

    return { inserted };
  },
});

const getEmailForSyncRef = makeFunctionReference(
  "emails:getEmailForSync"
) as unknown as FunctionReference<
  "query",
  "internal",
  { emailId: GenericId<"emails"> },
  {
    _id: GenericId<"emails">;
    extractionError: boolean;
    from: string;
    gmailId: string;
    receivedAt: number;
    subject: string;
  } | null
>;

const setEmailExtractionErrorRef = makeFunctionReference(
  "emails:setEmailExtractionError"
) as unknown as FunctionReference<
  "mutation",
  "internal",
  { emailId: GenericId<"emails">; extractionError: boolean },
  null
>;

export const getEmailForSync = internalQuery({
  args: { emailId: v.id("emails") },
  handler: async (ctx, args) => {
    const email = await ctx.db.get(args.emailId);
    if (!email) {
      return null;
    }

    return {
      _id: email._id,
      extractionError: email.extractionError,
      from: email.from,
      gmailId: email.gmailId,
      receivedAt: email.receivedAt,
      subject: email.subject,
    };
  },
});

export const setEmailExtractionError = internalMutation({
  args: { emailId: v.id("emails"), extractionError: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.emailId, { extractionError: args.extractionError });
    return null;
  },
});

export const retrySyncEmail = action({
  args: { emailId: v.id("emails") },
  handler: async (ctx, args) => {
    const email = await ctx.runQuery(getEmailForSyncRef, {
      emailId: args.emailId as GenericId<"emails">,
    });

    if (!email) {
      throw new Error("Email not found");
    }

    const attemptedAt = Date.now();
    const { loadTokens, persistTokens, refreshTokens } =
      createGoogleTokenFlow(ctx);

    interface RetryResult {
      extractionError: unknown | null;
      links: Array<{ description: string; title: string; url: string }>;
    }

    const program: Effect.Effect<RetryResult, unknown> = withFreshToken(
      loadTokens,
      persistTokens,
      (accessToken) =>
        pipe(
          fetchMessageFull(accessToken, email.gmailId),
          Effect.flatMap((fullMessage) =>
            pipe(
              extractLinks(
                fullMessage.html,
                fullMessage.subject,
                fullMessage.from
              ),
              Effect.map(
                (links): RetryResult => ({
                  extractionError: null,
                  links,
                })
              ),
              Effect.catchAll((error) =>
                Effect.sync(() => {
                  console.error("Link extraction failed", {
                    gmailId: fullMessage.gmailId,
                    from: fullMessage.from,
                    htmlLength: fullMessage.html.length,
                    subject: fullMessage.subject,
                    env: {
                      hasLlmApiKey:
                        typeof process.env.GOOGLE_GENERATIVE_AI_API_KEY ===
                        "string",
                      llmModel: process.env.LLM_MODEL ?? "gemini-2.5-flash",
                    },
                    error: summarizeError(error),
                  });

                  return {
                    extractionError: error,
                    links: [],
                  } satisfies RetryResult;
                })
              )
            )
          )
        ),
      { refreshTokens }
    );

    const result = await Effect.runPromise(program);

    const storedLinkCount =
      result.extractionError == null
        ? (
            await ctx.runMutation(storeLinksRef, {
              emailId: email._id,
              links: result.links,
            })
          ).inserted
        : 0;

    await ctx.runMutation(setEmailExtractionErrorRef, {
      emailId: email._id,
      extractionError: result.extractionError != null,
    });

    await ctx.runMutation(insertSyncLogRef, {
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
    });

    return {
      status:
        result.extractionError == null
          ? ("success" as const)
          : ("error" as const),
      storedLinkCount,
    };
  },
});

export const listWithPendingLinks = query({
  args: {},
  handler: async (ctx) => {
    const emails = await ctx.db.query("emails").collect();

    const results: Array<{
      _id: GenericId<"emails">;
      extractionError: boolean;
      from: string;
      gmailId: string;
      pendingLinkCount: number;
      receivedAt: number;
      subject: string;
    }> = [];

    for (const email of emails) {
      if (email.markedAsRead) {
        continue;
      }

      const pendingLinks = await ctx.db
        .query("links")
        .withIndex("by_emailId", (q) => q.eq("emailId", email._id))
        .filter((q) => q.eq(q.field("status"), "pending"))
        .collect();

      const pendingLinkCount = pendingLinks.length;

      if (!email.extractionError && pendingLinkCount === 0) {
        const hasAnyLinks = await ctx.db
          .query("links")
          .withIndex("by_emailId", (q) => q.eq("emailId", email._id))
          .take(1);

        if (hasAnyLinks.length === 0) {
          continue;
        }
      }

      results.push({
        _id: email._id,
        extractionError: email.extractionError,
        from: email.from,
        gmailId: email.gmailId,
        pendingLinkCount,
        receivedAt: email.receivedAt,
        subject: email.subject,
      });
    }

    results.sort((a, b) => b.receivedAt - a.receivedAt);
    return results;
  },
});

export const getEmail = internalQuery({
  args: { emailId: v.id("emails") },
  handler: async (ctx, args) => {
    const email = await ctx.db.get(args.emailId);
    if (!email) {
      return null;
    }

    return {
      _id: email._id,
      gmailId: email.gmailId,
      markedAsRead: email.markedAsRead,
    };
  },
});

export const discardPendingLinks = internalMutation({
  args: { emailId: v.id("emails") },
  handler: async (ctx, args) => {
    const pendingLinks = await ctx.db
      .query("links")
      .withIndex("by_emailId", (q) => q.eq("emailId", args.emailId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    for (const link of pendingLinks) {
      await ctx.db.patch(link._id, { status: "discarded" });
    }

    return { discarded: pendingLinks.length };
  },
});

export const markEmailAsRead = internalMutation({
  args: { emailId: v.id("emails"), processedAt: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.emailId, {
      markedAsRead: true,
      processedAt: args.processedAt,
    });

    return null;
  },
});

export const markAsRead = action({
  args: { emailId: v.id("emails") },
  handler: async (ctx, args) => {
    const email = await ctx.runQuery(getEmailRef, {
      emailId: args.emailId as GenericId<"emails">,
    });

    if (!email) {
      throw new Error("Email not found");
    }

    if (email.markedAsRead) {
      return { discarded: 0 };
    }

    const { loadTokens, persistTokens, refreshTokens } =
      createGoogleTokenFlow(ctx);

    const program = withFreshToken(
      loadTokens,
      persistTokens,
      (accessToken) => markGmailAsRead(accessToken, email.gmailId),
      { refreshTokens }
    );

    await Effect.runPromise(program);

    const discardResult = await ctx.runMutation(discardPendingLinksRef, {
      emailId: args.emailId as GenericId<"emails">,
    });

    await ctx.runMutation(markEmailAsReadRef, {
      emailId: args.emailId as GenericId<"emails">,
      processedAt: Date.now(),
    });

    return { discarded: discardResult.discarded };
  },
});
