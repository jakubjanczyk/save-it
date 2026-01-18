import { type GenericId, v } from "convex/values";
import { Effect } from "effect";

import {
  archive as archiveGmail,
  markAsRead as markGmailAsRead,
} from "../lib/gmail";
import {
  parseBackgroundSyncEnabled,
  parseBackgroundSyncLocalHour,
  parseBackgroundSyncTimeZone,
} from "../lib/settings";
import {
  BACKGROUND_SYNC_ENABLED_SETTING_KEY,
  BACKGROUND_SYNC_LOCAL_HOUR_SETTING_KEY,
  BACKGROUND_SYNC_TIME_ZONE_SETTING_KEY,
} from "../lib/settings-keys";
import { api, internal } from "./_generated/api";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { finalizeEmailInGmail } from "./emailsGmailHelpers";
import {
  fetchFromGmailProgram,
  type RetrySyncEmailResult,
  retrySyncEmailProgram,
} from "./emailsProcessingHelpers";

function hourInTimeZone(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(now);

  const hour = parts.find((part) => part.type === "hour")?.value;
  return hour ? Number.parseInt(hour, 10) : 0;
}

export const fetchFromGmail = action({
  args: {},
  handler: (ctx): Promise<{ fetched: number }> =>
    Effect.runPromise(fetchFromGmailProgram(ctx)),
});

export const fetchFromGmailInternal = internalAction({
  args: {},
  handler: (ctx): Promise<{ fetched: number }> =>
    Effect.runPromise(fetchFromGmailProgram(ctx)),
});

export const backgroundSyncTick = internalAction({
  args: {},
  handler: async (ctx) => {
    const [enabledRaw, localHourRaw, timeZoneRaw] = await Promise.all([
      ctx.runQuery(api.settings.get, {
        key: BACKGROUND_SYNC_ENABLED_SETTING_KEY,
      }),
      ctx.runQuery(api.settings.get, {
        key: BACKGROUND_SYNC_LOCAL_HOUR_SETTING_KEY,
      }),
      ctx.runQuery(api.settings.get, {
        key: BACKGROUND_SYNC_TIME_ZONE_SETTING_KEY,
      }),
    ]);

    const enabled = parseBackgroundSyncEnabled(enabledRaw);
    const timeZone = parseBackgroundSyncTimeZone(timeZoneRaw);
    const localHour = parseBackgroundSyncLocalHour(localHourRaw);
    const nowLocalHour = hourInTimeZone(new Date(), timeZone);

    if (!enabled) {
      return { tag: "disabled" as const, localHour, nowLocalHour, timeZone };
    }

    if (nowLocalHour !== localHour) {
      return { tag: "notDue" as const, localHour, nowLocalHour, timeZone };
    }

    try {
      const result = await Effect.runPromise(fetchFromGmailProgram(ctx));
      return {
        fetched: result.fetched,
        tag: "ran" as const,
        localHour,
        nowLocalHour,
        timeZone,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Sync already in progress"
      ) {
        return {
          tag: "alreadyRunning" as const,
          localHour,
          nowLocalHour,
          timeZone,
        };
      }

      if (error instanceof Error && error.message === "Gmail not connected") {
        return {
          tag: "gmailNotConnected" as const,
          localHour,
          nowLocalHour,
          timeZone,
        };
      }

      throw error;
    }
  },
});

export const startFetchFromGmail = action({
  args: {},
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(0, internal.emails.fetchFromGmailInternal, {});
    return null;
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
      const [existingByUrl, existingByTitle] = await Promise.all([
        ctx.db
          .query("links")
          .withIndex("by_url", (q) => q.eq("url", link.url))
          .first(),
        ctx.db
          .query("links")
          .withIndex("by_title", (q) => q.eq("title", link.title))
          .first(),
      ]);

      if (existingByUrl || existingByTitle) {
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
  handler: (ctx, args): Promise<RetrySyncEmailResult> =>
    Effect.runPromise(
      retrySyncEmailProgram(ctx, args.emailId as GenericId<"emails">)
    ),
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
        .filter((q) =>
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "processing")
          )
        )
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
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "processing")
        )
      )
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
  handler: async (ctx, args): Promise<{ discarded: number }> => {
    return await finalizeEmailInGmail(
      ctx,
      args.emailId as GenericId<"emails">,
      (accessToken, gmailId) => markGmailAsRead(accessToken, gmailId)
    );
  },
});

export const archive = action({
  args: { emailId: v.id("emails") },
  handler: async (ctx, args): Promise<{ discarded: number }> => {
    return await finalizeEmailInGmail(
      ctx,
      args.emailId as GenericId<"emails">,
      (accessToken, gmailId) => archiveGmail(accessToken, gmailId)
    );
  },
});
