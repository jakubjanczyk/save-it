import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

describe("convex schema", () => {
  test("exports expected tables", () => {
    expect(Object.keys(schema.tables).sort()).toEqual(
      [
        "emails",
        "links",
        "oauthTokens",
        "senders",
        "settings",
        "syncRuns",
        "syncLogs",
      ].sort()
    );
  });

  test("enables runtime schema validation", () => {
    expect(schema.schemaValidation).toBe(true);
  });

  test("defines senders.by_email index", () => {
    expect(schema.tables.senders[" indexes"]()).toContainEqual({
      indexDescriptor: "by_email",
      fields: ["email"],
    });
  });

  test("defines emails.by_gmailId index", () => {
    expect(schema.tables.emails[" indexes"]()).toContainEqual({
      indexDescriptor: "by_gmailId",
      fields: ["gmailId"],
    });
  });

  test("defines emails.by_senderId index", () => {
    expect(schema.tables.emails[" indexes"]()).toContainEqual({
      indexDescriptor: "by_senderId",
      fields: ["senderId"],
    });
  });

  test("defines links.by_emailId index", () => {
    expect(schema.tables.links[" indexes"]()).toContainEqual({
      indexDescriptor: "by_emailId",
      fields: ["emailId"],
    });
  });

  test("defines links.by_emailId_url index", () => {
    expect(schema.tables.links[" indexes"]()).toContainEqual({
      indexDescriptor: "by_emailId_url",
      fields: ["emailId", "url"],
    });
  });

  test("defines links.by_status index", () => {
    expect(schema.tables.links[" indexes"]()).toContainEqual({
      indexDescriptor: "by_status",
      fields: ["status"],
    });
  });

  test("defines oauthTokens.by_type index", () => {
    expect(schema.tables.oauthTokens[" indexes"]()).toContainEqual({
      indexDescriptor: "by_type",
      fields: ["type"],
    });
  });

  test("defines settings.by_key index", () => {
    expect(schema.tables.settings[" indexes"]()).toContainEqual({
      indexDescriptor: "by_key",
      fields: ["key"],
    });
  });

  test("defines syncLogs.by_attemptedAt index", () => {
    expect(schema.tables.syncLogs[" indexes"]()).toContainEqual({
      indexDescriptor: "by_attemptedAt",
      fields: ["attemptedAt"],
    });
  });

  test("defines syncRuns.by_startedAt index", () => {
    expect(schema.tables.syncRuns[" indexes"]()).toContainEqual({
      indexDescriptor: "by_startedAt",
      fields: ["startedAt"],
    });
  });

  test("defines syncRuns.by_status_startedAt index", () => {
    expect(schema.tables.syncRuns[" indexes"]()).toContainEqual({
      indexDescriptor: "by_status_startedAt",
      fields: ["status", "startedAt"],
    });
  });

  test("allows storing link summary fields", async () => {
    const t = convexTest(schema, modules);

    const senderId = await t.run((ctx) =>
      ctx.db.insert("senders", {
        createdAt: Date.now(),
        email: "newsletter@example.com",
      })
    );

    const emailId = await t.run((ctx) =>
      ctx.db.insert("emails", {
        extractionError: false,
        from: "a@example.com",
        gmailId: "g1",
        markedAsRead: false,
        receivedAt: Date.now(),
        senderId,
        subject: "Hello",
      })
    );

    await t.run((ctx) =>
      ctx.db.insert("links", {
        description: "desc",
        emailId,
        status: "saved",
        title: "Example",
        url: "https://example.com",
        summaryAttemptCount: 1,
        summaryErrorMessage: "Temporary failure",
        summaryErrorStage: "llm",
        summaryExtractedTitle: "Extracted title",
        summaryLongSummary: "Long summary",
        summaryModel: "gemini-test",
        summaryStatus: "failed",
        summaryTldr: "TL;DR",
        summaryUpdatedAt: Date.now(),
        summaryPromptVersion: "v1",
      })
    );
  });
});
