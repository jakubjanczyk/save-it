import type { GenericId } from "convex/values";
import { v } from "convex/values";

import type { QueryCtx } from "../_generated/server";
import { internalMutation, query } from "../_generated/server";

export type SyncLogStatus = "success" | "error";

export interface SyncLogRow {
  _id: GenericId<"syncLogs">;
  attemptedAt: number;
  emailId: GenericId<"emails">;
  extractedLinkCount: number;
  from: string;
  gmailId: string;
  receivedAt: number;
  savedLinkCount: number;
  status: SyncLogStatus;
  storedLinkCount: number;
  subject: string;
}

async function countSavedLinksForEmail(
  ctx: QueryCtx,
  emailId: GenericId<"emails">
) {
  const links = await ctx.db
    .query("links")
    .withIndex("by_emailId", (q) => q.eq("emailId", emailId))
    .collect();

  let savedLinkCount = 0;
  for (const link of links) {
    if (link.status === "saved") {
      savedLinkCount += 1;
    }
  }

  return savedLinkCount;
}

export const insert = internalMutation({
  args: {
    attemptedAt: v.number(),
    emailId: v.id("emails"),
    errorMessage: v.optional(v.string()),
    errorName: v.optional(v.string()),
    errorTag: v.optional(v.string()),
    extractedLinkCount: v.number(),
    from: v.string(),
    gmailId: v.string(),
    receivedAt: v.number(),
    status: v.union(v.literal("success"), v.literal("error")),
    storedLinkCount: v.number(),
    subject: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("syncLogs", {
      attemptedAt: args.attemptedAt,
      emailId: args.emailId,
      errorMessage: args.errorMessage,
      errorName: args.errorName,
      errorTag: args.errorTag,
      extractedLinkCount: args.extractedLinkCount,
      from: args.from,
      gmailId: args.gmailId,
      receivedAt: args.receivedAt,
      status: args.status,
      storedLinkCount: args.storedLinkCount,
      subject: args.subject,
    });

    return null;
  },
});

export const list = query({
  args: {
    status: v.optional(v.union(v.literal("success"), v.literal("error"))),
  },
  handler: async (ctx, args) => {
    const limit = 200;
    const scanLimit = 2000;

    const logs = await ctx.db
      .query("syncLogs")
      .withIndex("by_attemptedAt", (q) => q)
      .order("desc")
      .take(scanLimit);

    const seenEmailIds = new Set<GenericId<"emails">>();
    const results: SyncLogRow[] = [];

    for (const row of logs) {
      if (seenEmailIds.has(row.emailId)) {
        continue;
      }

      seenEmailIds.add(row.emailId);

      if (args.status !== undefined && row.status !== args.status) {
        continue;
      }

      const savedLinkCount = await countSavedLinksForEmail(ctx, row.emailId);
      results.push({
        _id: row._id,
        attemptedAt: row.attemptedAt,
        emailId: row.emailId,
        extractedLinkCount: row.extractedLinkCount,
        from: row.from,
        gmailId: row.gmailId,
        receivedAt: row.receivedAt,
        savedLinkCount,
        status: row.status,
        storedLinkCount: row.storedLinkCount,
        subject: row.subject,
      });

      if (results.length >= limit) {
        break;
      }
    }

    return results;
  },
});
