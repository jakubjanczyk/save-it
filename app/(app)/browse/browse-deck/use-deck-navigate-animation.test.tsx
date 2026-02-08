import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import type { SavedLinkItem } from "../convex-refs";
import type { DeckNavigating } from "../deck/browse-deck-state";
import { useDeckNavigateAnimation } from "./use-deck-navigate-animation";

vi.mock("framer-motion", () => ({
  animate: vi.fn(() => Promise.resolve()),
}));

function createMockItem(id: string): SavedLinkItem {
  return {
    description: "Test description",
    id: id as SavedLinkItem["id"],
    isFavorite: false,
    savedAt: Date.now(),
    title: `Link ${id}`,
    url: `https://example.com/${id}`,
  };
}

function createMotionValue(initial: number) {
  let value = initial;
  return {
    get: () => value,
    set: vi.fn((next: number) => {
      value = next;
    }),
  };
}

function createDeckMotion(params: {
  x: ReturnType<typeof createMotionValue>;
  y: ReturnType<typeof createMotionValue>;
}) {
  return {
    activeNavOpacity: createMotionValue(1),
    activeNavScale: createMotionValue(1),
    dismissBlur: createMotionValue(0),
    nextOpacity: createMotionValue(1),
    nextScale: createMotionValue(1),
    prevOpacity: createMotionValue(1),
    prevScale: createMotionValue(1),
    transitionOpacity: createMotionValue(1),
    transitionScale: createMotionValue(1),
    x: params.x,
    y: params.y,
  };
}

function TestHarness(props: {
  heightPx: number;
  motion: ReturnType<typeof createDeckMotion>;
  navigating: DeckNavigating | null;
}) {
  useDeckNavigateAnimation({
    heightRef: { current: props.heightPx },
    // Hook code only needs MotionValue-like objects (get/set); tests mock `animate`.
    motion: props.motion as unknown as Parameters<
      typeof useDeckNavigateAnimation
    >[0]["motion"],
    navigating: props.navigating,
    onNavigateAnimationComplete: () => undefined,
  });

  return null;
}

afterEach(() => {
  cleanup();
});

test("keeps the dragged Y offset when starting navigation", async () => {
  const current = createMockItem("1");
  const navigating: DeckNavigating = {
    direction: "next",
    startY: -200,
    window: {
      current,
      next: createMockItem("2"),
      nextNext: null,
      prev: null,
      prevPrev: null,
    },
  };

  const x = createMotionValue(0);
  const y = createMotionValue(-200);
  const motion = createDeckMotion({ x, y });

  render(
    <TestHarness heightPx={520} motion={motion} navigating={navigating} />
  );

  await waitFor(() => expect(y.set).toHaveBeenCalled());
  expect(y.set.mock.calls[0]?.[0]).toBe(-200);
});

test("does not snap dragged Y to the target position on large swipes", async () => {
  const current = createMockItem("1");
  const navigating: DeckNavigating = {
    direction: "next",
    startY: -900,
    window: {
      current,
      next: createMockItem("2"),
      nextNext: null,
      prev: null,
      prevPrev: null,
    },
  };

  const x = createMotionValue(0);
  const y = createMotionValue(-900);
  const motion = createDeckMotion({ x, y });

  render(
    <TestHarness heightPx={520} motion={motion} navigating={navigating} />
  );

  await waitFor(() => expect(y.set).toHaveBeenCalled());
  expect(y.set.mock.calls[0]?.[0]).toBe(-900);
});
