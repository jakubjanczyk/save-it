import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  senders: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  emails: defineTable({
    gmailId: v.string(),
    senderId: v.id("senders"),
    from: v.string(),
    subject: v.string(),
    receivedAt: v.number(),
    processedAt: v.optional(v.number()),
    markedAsRead: v.boolean(),
    extractionError: v.boolean(),
  })
    .index("by_gmailId", ["gmailId"])
    .index("by_senderId", ["senderId"]),

  links: defineTable({
    emailId: v.id("emails"),
    url: v.string(),
    title: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("saved"),
      v.literal("discarded")
    ),
    savedAt: v.optional(v.number()),
    raindropId: v.optional(v.string()),
  })
    .index("by_emailId", ["emailId"])
    .index("by_status", ["status"]),

  oauthTokens: defineTable({
    type: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  }).index("by_type", ["type"]),
});
