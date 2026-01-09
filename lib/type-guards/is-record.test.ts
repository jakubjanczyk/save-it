import { expect, test } from "vitest";

import { isRecord } from "./is-record";

test("returns true for objects", () => {
  expect(isRecord({})).toBe(true);
});

test("returns false for null", () => {
  expect(isRecord(null)).toBe(false);
});

test("returns false for primitives", () => {
  expect(isRecord("x")).toBe(false);
});
