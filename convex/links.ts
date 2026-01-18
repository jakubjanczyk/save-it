import { type FunctionReference, makeFunctionReference } from "convex/server";
import type { GenericId } from "convex/values";
import { v } from "convex/values";
import { Effect } from "effect";

import { createRaindropBookmark } from "../lib/raindrop";
import { parseEmailFinalizeAction } from "../lib/settings";
import { EMAIL_FINALIZE_ACTION_SETTING_KEY } from "../lib/settings-keys";

import {
  type ActionCtx,
  action,
  internalMutation,
  internalQuery,
  type QueryCtx,
  query,
} from "./_generated/server";

interface LinkDoc {
  _id: GenericId<"links">;
  description: string;
  emailId: GenericId<"emails">;
  raindropId?: string;
  savedAt?: number;
  status: "pending" | "saved" | "discarded";
  title: string;
  url: string;
}

interface RaindropTokens extends Record<string, unknown> {
  accessToken: string;
  expiresAt?: number;
  refreshToken?: string;
}

const getRaindropTokens: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  RaindropTokens | null
> = makeFunctionReference("raindropauth:getTokens");

const getLinkRef = makeFunctionReference(
  "links:getLink"
) as unknown as FunctionReference<
  "query",
  "internal",
  { linkId: GenericId<"links"> },
  LinkDoc | null
>;

const markSavedRef = makeFunctionReference(
  "links:markSaved"
) as unknown as FunctionReference<
  "mutation",
  "internal",
  { linkId: GenericId<"links">; raindropId: string; savedAt: number },
  null
>;

const discardLinkRef = makeFunctionReference(
  "links:discardLink"
) as unknown as FunctionReference<
  "mutation",
  "internal",
  { linkId: GenericId<"links"> },
  null
>;

const hasPendingLinksByEmailRef = makeFunctionReference(
  "links:hasPendingLinksByEmail"
) as unknown as FunctionReference<
  "query",
  "internal",
  { emailId: GenericId<"emails"> },
  boolean
>;

const markEmailAsReadRef: FunctionReference<
  "action",
  "public",
  { emailId: GenericId<"emails"> },
  { discarded: number }
> = makeFunctionReference("emails:markAsRead");

const archiveEmailRef: FunctionReference<
  "action",
  "public",
  { emailId: GenericId<"emails"> },
  { discarded: number }
> = makeFunctionReference("emails:archive");

const getSettingRef: FunctionReference<
  "query",
  "public",
  { key: string },
  string | null
> = makeFunctionReference("settings:get");

async function finalizeEmailIfDone(
  ctx: ActionCtx,
  emailId: GenericId<"emails">
) {
  const hasPending = await ctx.runQuery(hasPendingLinksByEmailRef, { emailId });

  if (hasPending) {
    return;
  }

  try {
    const storedFinalizeAction = await ctx.runQuery(getSettingRef, {
      key: EMAIL_FINALIZE_ACTION_SETTING_KEY,
    });
    const finalizeAction = parseEmailFinalizeAction(storedFinalizeAction);

    if (finalizeAction === "archive") {
      await ctx.runAction(archiveEmailRef, { emailId });
    } else {
      await ctx.runAction(markEmailAsReadRef, { emailId });
    }
  } catch {
    // Best-effort. If Gmail isn't connected or token refresh fails, keep the email visible for retry.
  }
}

export const listByEmail = query({
  args: { emailId: v.id("emails") },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("links")
      .withIndex("by_emailId", (q) => q.eq("emailId", args.emailId))
      .collect();

    return links;
  },
});

export const discard = action({
  args: { linkId: v.id("links") },
  handler: async (ctx, args) => {
    const link = await ctx.runQuery(getLinkRef, {
      linkId: args.linkId as GenericId<"links">,
    });

    if (!link) {
      throw new Error("Link not found");
    }

    if (link.status !== "pending") {
      return null;
    }

    await ctx.runMutation(discardLinkRef, {
      linkId: args.linkId as GenericId<"links">,
    });

    await finalizeEmailIfDone(ctx, link.emailId);

    return null;
  },
});

export const getLink = internalQuery({
  args: { linkId: v.id("links") },
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.linkId);
    return link ?? null;
  },
});

export const markSaved = internalMutation({
  args: { linkId: v.id("links"), raindropId: v.string(), savedAt: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.linkId, {
      raindropId: args.raindropId,
      savedAt: args.savedAt,
      status: "saved",
    });

    return null;
  },
});

export const discardLink = internalMutation({
  args: { linkId: v.id("links") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.linkId, {
      status: "discarded",
    });

    return null;
  },
});

export const hasPendingLinksByEmail = internalQuery({
  args: { emailId: v.id("emails") },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("links")
      .withIndex("by_emailId", (q) => q.eq("emailId", args.emailId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .take(1);

    return pending.length > 0;
  },
});

export const save = action({
  args: { linkId: v.id("links") },
  handler: async (ctx, args) => {
    const tokens = await ctx.runQuery(getRaindropTokens, {});
    if (!tokens) {
      throw new Error("Raindrop not connected");
    }

    const link = await ctx.runQuery(getLinkRef, {
      linkId: args.linkId as GenericId<"links">,
    });

    if (!link) {
      throw new Error("Link not found");
    }

    if (link.status !== "pending") {
      return { raindropId: link.raindropId ?? null };
    }

    const raindropId = await Effect.runPromise(
      createRaindropBookmark(tokens.accessToken, {
        description: link.description,
        title: link.title,
        url: link.url,
      })
    );

    await ctx.runMutation(markSavedRef, {
      linkId: args.linkId as GenericId<"links">,
      raindropId,
      savedAt: Date.now(),
    });

    await finalizeEmailIfDone(ctx, link.emailId);

    return { raindropId };
  },
});

async function listPendingFocusBatchImpl(
  ctx: QueryCtx,
  args: { excludeIds?: GenericId<"links">[]; limit: number }
) {
  const exclude = new Set(args.excludeIds ?? []);
  const scanLimit = Math.max(args.limit, 2000);

  const links = await ctx.db
    .query("links")
    .withIndex("by_status", (q) => q.eq("status", "pending"))
    .take(scanLimit);

  const items: Array<{
    description: string;
    email: {
      from: string;
      id: GenericId<"emails">;
      receivedAt: number;
      subject: string;
    };
    id: GenericId<"links">;
    title: string;
    url: string;
  }> = [];

  for (const link of links) {
    if (exclude.has(link._id)) {
      continue;
    }

    const email = await ctx.db.get(link.emailId);
    if (!email || email.markedAsRead) {
      continue;
    }

    items.push({
      description: link.description,
      email: {
        from: email.from,
        id: email._id,
        receivedAt: email.receivedAt,
        subject: email.subject,
      },
      id: link._id,
      title: link.title,
      url: link.url,
    });
  }

  items.sort((a, b) => a.email.receivedAt - b.email.receivedAt);
  return items.slice(0, Math.max(0, args.limit));
}

export const listPendingFocus = query({
  args: {},
  handler: async (ctx) => {
    return await listPendingFocusBatchImpl(ctx, { limit: 2000 });
  },
});

export const countPendingFocus = query({
  args: {},
  handler: async (ctx) => {
    const links = await ctx.db
      .query("links")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const emailCache = new Map<
      GenericId<"emails">,
      { markedAsRead: boolean }
    >();

    let count = 0;
    for (const link of links) {
      let email = emailCache.get(link.emailId);
      if (!email) {
        const stored = await ctx.db.get(link.emailId);
        if (!stored) {
          continue;
        }

        email = { markedAsRead: Boolean(stored.markedAsRead) };
        emailCache.set(link.emailId, email);
      }

      if (email.markedAsRead) {
        continue;
      }

      count += 1;
    }

    return count;
  },
});

export const listPendingFocusBatch = query({
  args: {
    excludeIds: v.optional(v.array(v.id("links"))),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    return await listPendingFocusBatchImpl(ctx, {
      excludeIds: args.excludeIds ?? [],
      limit: args.limit,
    });
  },
});
