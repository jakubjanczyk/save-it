import type { GenericId } from "convex/values";
import { expect, test } from "vitest";

import {
  getActiveIndex,
  getActiveLinkId,
  getNeighborLinkId,
} from "./focus-queue";

test("getActiveLinkId returns null for empty string", () => {
  expect(getActiveLinkId("")).toBeNull();
});

test("getActiveLinkId returns the id when provided", () => {
  expect(getActiveLinkId("l1")).toBe("l1" as GenericId<"links">);
});

test("getActiveIndex returns -1 when items is undefined", () => {
  expect(getActiveIndex(undefined, null)).toBe(-1);
});

test("getActiveIndex returns 0 when no requestedLinkId", () => {
  const items = [{ id: "l1" as GenericId<"links"> }];
  expect(getActiveIndex(items, null)).toBe(0);
});

test("getNeighborLinkId returns next id when available", () => {
  const items = [
    { id: "l1" as GenericId<"links"> },
    { id: "l2" as GenericId<"links"> },
  ];
  expect(getNeighborLinkId(items, 0)).toBe("l2");
});

test("getNeighborLinkId returns previous id when next is unavailable", () => {
  const items = [
    { id: "l1" as GenericId<"links"> },
    { id: "l2" as GenericId<"links"> },
  ];
  expect(getNeighborLinkId(items, 1)).toBe("l1");
});
