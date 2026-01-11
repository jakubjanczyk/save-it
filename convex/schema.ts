import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  settings: defineTable({
    key: v.string(),
    value: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

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
    .index("by_emailId_url", ["emailId", "url"])
    .index("by_title", ["title"])
    .index("by_url", ["url"])
    .index("by_status", ["status"]),

  oauthTokens: defineTable({
    type: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  }).index("by_type", ["type"]),

  syncLogs: defineTable({
    emailId: v.id("emails"),
    gmailId: v.string(),
    from: v.string(),
    receivedAt: v.number(),
    subject: v.string(),
    attemptedAt: v.number(),
    status: v.union(v.literal("success"), v.literal("error")),
    extractedLinkCount: v.number(),
    storedLinkCount: v.number(),
    errorMessage: v.optional(v.string()),
    errorName: v.optional(v.string()),
    errorTag: v.optional(v.string()),
  })
    .index("by_attemptedAt", ["attemptedAt"])
    .index("by_status_attemptedAt", ["status", "attemptedAt"])
    .index("by_emailId_attemptedAt", ["emailId", "attemptedAt"]),
});
