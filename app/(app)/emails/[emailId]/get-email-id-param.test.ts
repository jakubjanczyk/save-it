import type { GenericId } from "convex/values";
import { expect, test } from "vitest";

import { getEmailIdParam } from "./get-email-id-param";

test("getEmailIdParam returns string params", () => {
  const value = getEmailIdParam("e1");
  expect(value).toBe("e1" as GenericId<"emails">);
});

test("getEmailIdParam returns the first element for array params", () => {
  const value = getEmailIdParam(["e1"]);
  expect(value).toBe("e1" as GenericId<"emails">);
});

test("getEmailIdParam returns null for invalid values", () => {
  expect(getEmailIdParam(null)).toBeNull();
});
