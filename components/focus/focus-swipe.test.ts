import { describe, expect, test } from "vitest";

import { getSwipeAction, isInteractiveTarget } from "./focus-swipe";

describe("isInteractiveTarget", () => {
  test("returns true for a button", () => {
    const button = document.createElement("button");
    expect(isInteractiveTarget(button)).toBe(true);
  });

  test("returns true for descendants of a button", () => {
    const button = document.createElement("button");
    const span = document.createElement("span");
    button.append(span);
    expect(isInteractiveTarget(span)).toBe(true);
  });

  test("returns true for descendants of an anchor", () => {
    const anchor = document.createElement("a");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    anchor.append(svg);
    expect(isInteractiveTarget(svg)).toBe(true);
  });

  test("returns false for non-elements", () => {
    expect(isInteractiveTarget(document.createTextNode("text"))).toBe(false);
  });

  test("returns false for regular elements", () => {
    const div = document.createElement("div");
    expect(isInteractiveTarget(div)).toBe(false);
  });
});

describe("getSwipeAction", () => {
  test("returns null when below threshold", () => {
    expect(getSwipeAction(20, 0, 90)).toBeNull();
  });

  test("returns null when vertical dominates", () => {
    expect(getSwipeAction(120, 180, 90)).toBeNull();
  });

  test("returns save for right swipe", () => {
    expect(getSwipeAction(120, 10, 90)).toBe("save");
  });

  test("returns discard for left swipe", () => {
    expect(getSwipeAction(-120, 10, 90)).toBe("discard");
  });
});
