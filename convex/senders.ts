import {v} from "convex/values"

import {mutation, query} from "./_generated/server"

export const addSender = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim();

    const existing = await ctx.db
      .query("senders")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) {
      throw new Error("Sender already exists");
    }

    return await ctx.db.insert("senders", {
      email,
      name: args.name,
      createdAt: Date.now(),
    });
  },
});

export const listSenders = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("senders").collect();
  },
});

export const removeSender = mutation({
  args: {
    senderId: v.id("senders"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.senderId);
    return null;
  },
});
