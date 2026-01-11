import { describe, expect, test } from "vitest";

import schema from "./schema";

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
});
