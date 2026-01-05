import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const saveTokens = mutation({
  args: {
    accessToken: v.string(),
    expiresAt: v.number(),
    refreshToken: v.string(),
  },
  handler: async (ctx, args) => {
    const docs = await ctx.db.query("googleAuth").collect();
    const [doc, ...rest] = docs;

    for (const extra of rest) {
      await ctx.db.delete(extra._id);
    }

    if (doc) {
      await ctx.db.patch(doc._id, {
        accessToken: args.accessToken,
        expiresAt: args.expiresAt,
        refreshToken: args.refreshToken,
      });
      return doc._id;
    }

    return await ctx.db.insert("googleAuth", {
      accessToken: args.accessToken,
      expiresAt: args.expiresAt,
      refreshToken: args.refreshToken,
    });
  },
});

export const getTokens = query({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db.query("googleAuth").first();

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
    const docs = await ctx.db.query("googleAuth").collect();

    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }

    return null;
  },
});

export const isTokenExpired = query({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db.query("googleAuth").first();

    if (!doc) {
      return true;
    }

    return doc.expiresAt <= Date.now();
  },
});
