import { expect, test } from "vitest";

import { resolveRequestedLinkId } from "./search-params";

test("resolveRequestedLinkId returns null when params are missing", async () => {
  expect(await resolveRequestedLinkId(undefined)).toBeNull();
});

test("resolveRequestedLinkId returns linkId when it is a string", async () => {
  expect(await resolveRequestedLinkId({ linkId: "l1" })).toBe("l1");
});

test("resolveRequestedLinkId returns first linkId when it is an array", async () => {
  expect(await resolveRequestedLinkId({ linkId: ["l1", "l2"] })).toBe("l1");
});

test("resolveRequestedLinkId handles promised searchParams", async () => {
  expect(await resolveRequestedLinkId(Promise.resolve({ linkId: "l1" }))).toBe(
    "l1"
  );
});
