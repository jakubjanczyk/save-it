import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

const tokenType = "google";

export const saveTokens = mutation({
  args: {
    accessToken: v.string(),
    expiresAt: v.number(),
    refreshToken: v.string(),
  },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("oauthTokens")
      .withIndex("by_type", (q) => q.eq("type", tokenType))
      .collect();
    const [doc, ...rest] = docs;

    for (const extra of rest) {
      await ctx.db.delete(extra._id);
    }

    if (doc) {
      await ctx.db.patch(doc._id, {
        accessToken: args.accessToken,
        expiresAt: args.expiresAt,
        refreshToken: args.refreshToken,
        errorAt: undefined,
        errorMessage: undefined,
        errorTag: undefined,
        type: tokenType,
      });
      return doc._id;
    }

    return await ctx.db.insert("oauthTokens", {
      accessToken: args.accessToken,
      expiresAt: args.expiresAt,
      refreshToken: args.refreshToken,
      type: tokenType,
    });
  },
});

export const getTokens = query({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db
      .query("oauthTokens")
      .withIndex("by_type", (q) => q.eq("type", tokenType))
      .first();

    if (!doc) {
      return null;
    }

    if (!(doc.refreshToken && doc.expiresAt)) {
      return null;
    }

    return {
      accessToken: doc.accessToken,
      expiresAt: doc.expiresAt,
      refreshToken: doc.refreshToken,
    };
  },
});

export const getConnectionStatus = query({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db
      .query("oauthTokens")
      .withIndex("by_type", (q) => q.eq("type", tokenType))
      .first();

    const connected = Boolean(doc?.refreshToken && doc?.expiresAt);

    return {
      connected,
      errorAt: doc?.errorAt ?? null,
      errorMessage: doc?.errorMessage ?? null,
      errorTag: doc?.errorTag ?? null,
    };
  },
});

export const setConnectionError = mutation({
  args: {
    errorMessage: v.optional(v.string()),
    errorTag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("oauthTokens")
      .withIndex("by_type", (q) => q.eq("type", tokenType))
      .first();

    if (!doc) {
      return null;
    }

    await ctx.db.patch(doc._id, {
      errorAt: Date.now(),
      errorMessage: args.errorMessage,
      errorTag: args.errorTag,
    });

    return doc._id;
  },
});

export const clearTokens = mutation({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db
      .query("oauthTokens")
      .withIndex("by_type", (q) => q.eq("type", tokenType))
      .collect();

    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }

    return null;
  },
});

export const isTokenExpired = query({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db
      .query("oauthTokens")
      .withIndex("by_type", (q) => q.eq("type", tokenType))
      .first();

    if (!doc?.expiresAt) {
      return true;
    }

    return doc.expiresAt <= Date.now();
  },
});
