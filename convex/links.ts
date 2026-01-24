import { type FunctionReference, makeFunctionReference } from "convex/server";
import type { GenericId } from "convex/values";
import { v } from "convex/values";
import { Effect } from "effect";

import {
  createRaindropBookmark,
  deleteRaindropBookmark,
} from "../lib/raindrop";
import {
  parseEmailFinalizeAction,
  parseRaindropSyncEnabled,
} from "../lib/settings";
import {
  EMAIL_FINALIZE_ACTION_SETTING_KEY,
  RAINDROP_SYNC_ENABLED_SETTING_KEY,
} from "../lib/settings-keys";

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
  archivedAt?: number;
  description: string;
  emailId: GenericId<"emails">;
  isFavorite?: boolean;
  raindropId?: string;
  savedAt?: number;
  status: "pending" | "processing" | "saved" | "discarded" | "archived";
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

const markProcessingRef = makeFunctionReference(
  "links:markProcessing"
) as unknown as FunctionReference<
  "mutation",
  "internal",
  { linkId: GenericId<"links"> },
  null
>;

const markPendingRef = makeFunctionReference(
  "links:markPending"
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

const markArchivedRef = makeFunctionReference(
  "links:markArchived"
) as unknown as FunctionReference<
  "mutation",
  "internal",
  { linkId: GenericId<"links">; archivedAt: number },
  null
>;

const markSavedWithoutRaindropRef = makeFunctionReference(
  "links:markSavedWithoutRaindrop"
) as unknown as FunctionReference<
  "mutation",
  "internal",
  { linkId: GenericId<"links">; savedAt: number },
  null
>;

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

    await ctx.runMutation(markProcessingRef, {
      linkId: args.linkId as GenericId<"links">,
    });

    try {
      await ctx.runMutation(discardLinkRef, {
        linkId: args.linkId as GenericId<"links">,
      });
    } catch (error) {
      await ctx.runMutation(markPendingRef, {
        linkId: args.linkId as GenericId<"links">,
      });
      throw error;
    }

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

export const markProcessing = internalMutation({
  args: { linkId: v.id("links") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.linkId, {
      status: "processing",
    });

    return null;
  },
});

export const markPending = internalMutation({
  args: { linkId: v.id("links") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.linkId, {
      status: "pending",
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
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "processing")
        )
      )
      .take(1);

    return pending.length > 0;
  },
});

export const save = action({
  args: { linkId: v.id("links") },
  handler: async (ctx, args) => {
    const storedSyncEnabled = await ctx.runQuery(getSettingRef, {
      key: RAINDROP_SYNC_ENABLED_SETTING_KEY,
    });
    const syncEnabled = parseRaindropSyncEnabled(storedSyncEnabled);

    const link = await ctx.runQuery(getLinkRef, {
      linkId: args.linkId as GenericId<"links">,
    });

    if (!link) {
      throw new Error("Link not found");
    }

    if (link.status !== "pending") {
      return { raindropId: link.raindropId ?? null };
    }

    await ctx.runMutation(markProcessingRef, {
      linkId: args.linkId as GenericId<"links">,
    });

    if (!syncEnabled) {
      try {
        await ctx.runMutation(markSavedWithoutRaindropRef, {
          linkId: args.linkId as GenericId<"links">,
          savedAt: Date.now(),
        });
      } catch (error) {
        await ctx.runMutation(markPendingRef, {
          linkId: args.linkId as GenericId<"links">,
        });
        throw error;
      }

      await finalizeEmailIfDone(ctx, link.emailId);
      return { raindropId: null };
    }

    const tokens = await ctx.runQuery(getRaindropTokens, {});
    if (!tokens) {
      throw new Error("Raindrop not connected");
    }

    let raindropId: string;
    try {
      raindropId = await Effect.runPromise(
        createRaindropBookmark(tokens.accessToken, {
          description: link.description,
          title: link.title,
          url: link.url,
        })
      );
    } catch (error) {
      await ctx.runMutation(markPendingRef, {
        linkId: args.linkId as GenericId<"links">,
      });
      throw error;
    }

    try {
      await ctx.runMutation(markSavedRef, {
        linkId: args.linkId as GenericId<"links">,
        raindropId,
        savedAt: Date.now(),
      });
    } catch (error) {
      await ctx.runMutation(markPendingRef, {
        linkId: args.linkId as GenericId<"links">,
      });
      throw error;
    }

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

export const listSaved = query({
  args: {
    cursor: v.optional(v.string()),
    limit: v.number(),
    sortOrder: v.union(v.literal("oldest"), v.literal("newest")),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit, 100);

    const paginationOpts = {
      cursor: args.cursor ?? null,
      numItems: limit,
    };

    const result = await ctx.db
      .query("links")
      .withIndex("by_status_savedAt", (q) => q.eq("status", "saved"))
      .order(args.sortOrder === "newest" ? "desc" : "asc")
      .paginate(paginationOpts);

    const items: Array<{
      archivedAt?: number;
      description: string;
      id: GenericId<"links">;
      isFavorite: boolean;
      raindropId?: string;
      savedAt?: number;
      title: string;
      url: string;
    }> = [];

    for (const link of result.page) {
      items.push({
        archivedAt: link.archivedAt,
        description: link.description,
        id: link._id,
        isFavorite: link.isFavorite ?? false,
        raindropId: link.raindropId,
        savedAt: link.savedAt,
        title: link.title,
        url: link.url,
      });
    }

    return {
      continueCursor: result.continueCursor,
      isDone: result.isDone,
      items,
    };
  },
});

export const markArchived = internalMutation({
  args: { archivedAt: v.number(), linkId: v.id("links") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.linkId, {
      archivedAt: args.archivedAt,
      status: "archived",
    });

    return null;
  },
});

export const markSavedWithoutRaindrop = internalMutation({
  args: { linkId: v.id("links"), savedAt: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.linkId, {
      savedAt: args.savedAt,
      status: "saved",
    });

    return null;
  },
});

export const archive = action({
  args: { linkId: v.id("links") },
  handler: async (ctx, args) => {
    const link = await ctx.runQuery(getLinkRef, {
      linkId: args.linkId as GenericId<"links">,
    });

    if (!link) {
      throw new Error("Link not found");
    }

    if (link.status !== "saved") {
      return null;
    }

    await ctx.runMutation(markArchivedRef, {
      archivedAt: Date.now(),
      linkId: args.linkId as GenericId<"links">,
    });

    if (link.raindropId) {
      const storedSyncEnabled = await ctx.runQuery(getSettingRef, {
        key: RAINDROP_SYNC_ENABLED_SETTING_KEY,
      });
      const syncEnabled = parseRaindropSyncEnabled(storedSyncEnabled);

      if (syncEnabled) {
        const tokens = await ctx.runQuery(getRaindropTokens, {});
        if (tokens) {
          try {
            await Effect.runPromise(
              deleteRaindropBookmark(tokens.accessToken, link.raindropId)
            );
          } catch {
            // Best-effort delete - don't fail the archive operation
          }
        }
      }
    }

    return null;
  },
});

export const toggleFavorite = internalMutation({
  args: { linkId: v.id("links") },
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.linkId);
    if (!link) {
      throw new Error("Link not found");
    }

    await ctx.db.patch(args.linkId, {
      isFavorite: !link.isFavorite,
    });

    return { isFavorite: !link.isFavorite };
  },
});

export const toggleFavoriteAction = action({
  args: { linkId: v.id("links") },
  handler: async (ctx, args) => {
    const toggleFavoriteRef = makeFunctionReference(
      "links:toggleFavorite"
    ) as unknown as FunctionReference<
      "mutation",
      "internal",
      { linkId: GenericId<"links"> },
      { isFavorite: boolean }
    >;

    return await ctx.runMutation(toggleFavoriteRef, {
      linkId: args.linkId as GenericId<"links">,
    });
  },
});

export const sendToRaindrop = action({
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

    if (link.raindropId) {
      return { raindropId: link.raindropId };
    }

    const raindropId = await Effect.runPromise(
      createRaindropBookmark(tokens.accessToken, {
        description: link.description,
        title: link.title,
        url: link.url,
      })
    );

    const updateRaindropIdRef = makeFunctionReference(
      "links:updateRaindropId"
    ) as unknown as FunctionReference<
      "mutation",
      "internal",
      { linkId: GenericId<"links">; raindropId: string },
      null
    >;

    await ctx.runMutation(updateRaindropIdRef, {
      linkId: args.linkId as GenericId<"links">,
      raindropId,
    });

    return { raindropId };
  },
});

export const updateRaindropId = internalMutation({
  args: { linkId: v.id("links"), raindropId: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.linkId, {
      raindropId: args.raindropId,
    });

    return null;
  },
});
