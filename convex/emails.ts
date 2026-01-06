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

import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";

const angleEmailRegex = /<([^>]+)>/;
const tokenEmailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

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
  null
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

function parseEmailAddress(fromHeader: string) {
  const angle = fromHeader.match(angleEmailRegex);
  if (angle?.[1]) {
    return angle[1].trim();
  }

  const token = fromHeader.match(tokenEmailRegex);
  return token?.[0]?.trim() ?? fromHeader.trim();
}

function senderMatches(pattern: string, email: string) {
  const normalizedPattern = pattern.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedPattern.startsWith("*@")) {
    return normalizedEmail.endsWith(normalizedPattern.slice(1));
  }

  return normalizedEmail === normalizedPattern;
}

function findSenderId(senders: SenderDoc[], fromHeader: string) {
  const email = parseEmailAddress(fromHeader);
  return (
    senders.find((sender) => senderMatches(sender.email, email))?._id ?? null
  );
}

function _errorSummary(error: unknown): Record<string, unknown> {
  if (typeof error !== "object" || error === null) {
    return { value: error };
  }

  const record = error as Record<string, unknown>;

  let cause: Record<string, unknown> | undefined;

  if ("cause" in record && record.cause != null) {
    const recordCause = record.cause;

    if (typeof recordCause === "object" && recordCause !== null) {
      const causeRecord = recordCause as { name?: unknown; message?: unknown };

      cause = {
        name:
          typeof causeRecord.name === "string" ? causeRecord.name : undefined,
        message:
          typeof causeRecord.message === "string"
            ? causeRecord.message
            : undefined,
      };
    } else {
      cause = { value: recordCause };
    }
  }

  return {
    name: typeof record.name === "string" ? record.name : undefined,
    tag: typeof record._tag === "string" ? record._tag : undefined,
    message: typeof record.message === "string" ? record.message : undefined,
    cause,
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

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    const refreshTokens = async (
      refreshToken: string
    ): Promise<StoredTokens> => {
      if (!(clientId && clientSecret)) {
        throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
      }

      return await refreshGoogleAccessToken({
        env: { clientId, clientSecret },
        refreshToken,
      });
    };

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
          fetchEmails(accessToken, senderPatterns),
          Effect.flatMap((messages) =>
            // TEMP DEBUG: only fetch 1 email to make it easier to diagnose LLM timeouts.
            Effect.forEach(messages.slice(0, 1), (message) =>
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
                          error: _errorSummary(error),
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

      await ctx.runMutation(storeLinksRef, {
        emailId: storeResult.emailId,
        links: item.links,
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
    for (const link of args.links) {
      await ctx.db.insert("links", {
        description: link.description,
        emailId: args.emailId,
        status: "pending",
        title: link.title,
        url: link.url,
      });
    }

    return null;
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

      if (!(email.extractionError || pendingLinkCount > 0)) {
        continue;
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

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    const refreshTokens = async (
      refreshToken: string
    ): Promise<StoredTokens> => {
      if (!(clientId && clientSecret)) {
        throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
      }

      return await refreshGoogleAccessToken({
        env: { clientId, clientSecret },
        refreshToken,
      });
    };

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
