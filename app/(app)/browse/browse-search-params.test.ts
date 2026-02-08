import { expect, test } from "vitest";

import { parseSortOrder } from "./browse-search-params";

test("parseSortOrder defaults to newest", () => {
  expect(parseSortOrder(null)).toBe("newest");
});

test("parseSortOrder returns oldest when explicitly requested", () => {
  expect(parseSortOrder("oldest")).toBe("oldest");
});

test("parseSortOrder returns newest when explicitly requested", () => {
  expect(parseSortOrder("newest")).toBe("newest");
});
