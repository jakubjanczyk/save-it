import { describe, expect, test } from "vitest";

import schema from "./schema";

describe("convex schema", () => {
  test("exports expected tables", () => {
    expect(Object.keys(schema.tables).sort()).toEqual(
      ["emails", "googleAuth", "links", "senders"].sort()
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
});
