import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

const tokenType = "raindrop";

export const saveTokens = mutation({
  args: {
    accessToken: v.string(),
    expiresAt: v.optional(v.number()),
    refreshToken: v.optional(v.string()),
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

    return {
      accessToken: doc.accessToken,
      expiresAt: doc.expiresAt,
      refreshToken: doc.refreshToken,
    };
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

    if (!doc) {
      return true;
    }

    if (!doc.expiresAt) {
      return false;
    }

    return doc.expiresAt <= Date.now();
  },
});
