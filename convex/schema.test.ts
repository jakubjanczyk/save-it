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

  test("defines expected indexes", () => {
    expect(schema.tables.senders[" indexes"]()).toEqual([
      { indexDescriptor: "by_email", fields: ["email"] },
    ]);

    expect(schema.tables.emails[" indexes"]()).toEqual([
      { indexDescriptor: "by_gmailId", fields: ["gmailId"] },
      { indexDescriptor: "by_senderId", fields: ["senderId"] },
    ]);

    expect(schema.tables.links[" indexes"]()).toEqual([
      { indexDescriptor: "by_emailId", fields: ["emailId"] },
    ]);
  });
});
