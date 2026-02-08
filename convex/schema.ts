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
      v.literal("processing"),
      v.literal("saved"),
      v.literal("discarded"),
      v.literal("archived")
    ),
    savedAt: v.optional(v.number()),
    raindropId: v.optional(v.string()),
    isFavorite: v.optional(v.boolean()),
    archivedAt: v.optional(v.number()),
    summaryStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("success"),
        v.literal("failed")
      )
    ),
    summaryContentKind: v.optional(
      v.union(v.literal("article"), v.literal("github"), v.literal("other"))
    ),
    summaryExtractedTitle: v.optional(v.string()),
    summaryExtractedTitleSource: v.optional(
      v.union(
        v.literal("h1"),
        v.literal("og"),
        v.literal("twitter"),
        v.literal("title"),
        v.literal("llm")
      )
    ),
    summaryTldr: v.optional(v.string()),
    summaryWorthReading: v.optional(
      v.union(v.literal("yes"), v.literal("maybe"), v.literal("no"))
    ),
    summaryWorthReadingReason: v.optional(v.string()),
    summaryCredibility: v.optional(
      v.union(
        v.literal("high"),
        v.literal("medium"),
        v.literal("low"),
        v.literal("unknown")
      )
    ),
    summaryCredibilityReason: v.optional(v.string()),
    summaryLongSummary: v.optional(v.string()),
    summaryModel: v.optional(v.string()),
    summaryPromptVersion: v.optional(v.string()),
    summaryUpdatedAt: v.optional(v.number()),
    summaryAttemptCount: v.optional(v.number()),
    summaryErrorStage: v.optional(
      v.union(
        v.literal("fetch"),
        v.literal("extract"),
        v.literal("llm"),
        v.literal("parse")
      )
    ),
    summaryErrorMessage: v.optional(v.string()),
  })
    .index("by_emailId", ["emailId"])
    .index("by_emailId_url", ["emailId", "url"])
    .index("by_title", ["title"])
    .index("by_url", ["url"])
    .index("by_status", ["status"])
    .index("by_status_savedAt", ["status", "savedAt"]),

  oauthTokens: defineTable({
    type: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    errorTag: v.optional(v.string()),
    errorAt: v.optional(v.number()),
  }).index("by_type", ["type"]),

  syncRuns: defineTable({
    status: v.union(
      v.literal("running"),
      v.literal("success"),
      v.literal("error"),
      v.literal("aborted")
    ),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    lastHeartbeatAt: v.number(),
    progress: v.object({
      fetchedEmails: v.number(),
      processedEmails: v.number(),
      insertedEmails: v.number(),
      storedLinks: v.number(),
    }),
    errorMessage: v.optional(v.string()),
    errorName: v.optional(v.string()),
    errorTag: v.optional(v.string()),
  })
    .index("by_status_startedAt", ["status", "startedAt"])
    .index("by_startedAt", ["startedAt"]),

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
