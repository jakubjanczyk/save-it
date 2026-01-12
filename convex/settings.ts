import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    return existing?.value ?? null;
  },
});

export const set = mutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (!existing) {
      await ctx.db.insert("settings", {
        createdAt: now,
        key: args.key,
        updatedAt: now,
        value: args.value,
      });

      return null;
    }

    await ctx.db.patch(existing._id, {
      updatedAt: now,
      value: args.value,
    });

    return null;
  },
});

export const setMany = mutation({
  args: { entries: v.array(v.object({ key: v.string(), value: v.string() })) },
  handler: async (ctx, args) => {
    const now = Date.now();

    const latestByKey = new Map<string, string>();
    for (const entry of args.entries) {
      latestByKey.set(entry.key, entry.value);
    }

    for (const [key, value] of latestByKey) {
      const existing = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();

      if (!existing) {
        await ctx.db.insert("settings", {
          createdAt: now,
          key,
          updatedAt: now,
          value,
        });
        continue;
      }

      await ctx.db.patch(existing._id, { updatedAt: now, value });
    }

    return null;
  },
});
