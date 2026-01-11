import type { GenericId } from "convex/values";
import { expect, test } from "vitest";

import {
  createInitialFocusDeckState,
  focusDeckReducer,
} from "./focus-deck-reducer";
import type { FocusItem } from "./focus-item";

test("init rotates the queue when requestedLinkId is present", () => {
  const items: FocusItem[] = [
    {
      description: "d1",
      email: {
        from: "f",
        id: "e1" as GenericId<"emails">,
        receivedAt: 0,
        subject: "s",
      },
      id: "l1" as GenericId<"links">,
      title: "t1",
      url: "u1",
    },
    {
      description: "d2",
      email: {
        from: "f",
        id: "e1" as GenericId<"emails">,
        receivedAt: 0,
        subject: "s",
      },
      id: "l2" as GenericId<"links">,
      title: "t2",
      url: "u2",
    },
  ];

  const state = focusDeckReducer(createInitialFocusDeckState(), {
    items,
    remainingCount: 2,
    requestedLinkId: "l2" as GenericId<"links">,
    tag: "init",
  });

  expect(state.queue.map((item) => item.id)).toEqual([
    "l2" as GenericId<"links">,
    "l1" as GenericId<"links">,
  ]);
});

test("startDismiss sets dismissing for the top item", () => {
  const items: FocusItem[] = [
    {
      description: "d1",
      email: {
        from: "f",
        id: "e1" as GenericId<"emails">,
        receivedAt: 0,
        subject: "s",
      },
      id: "l1" as GenericId<"links">,
      title: "t1",
      url: "u1",
    },
  ];

  const state = focusDeckReducer(createInitialFocusDeckState(), {
    items,
    remainingCount: 1,
    requestedLinkId: null,
    tag: "init",
  });

  const dismissed = focusDeckReducer(state, {
    action: "save",
    startX: 12,
    tag: "startDismiss",
  });

  expect(dismissed.dismissing?.action).toBe("save");
  expect(dismissed.dismissing?.item.id).toBe("l1" as GenericId<"links">);
});

test("startDismiss removes the top item from the queue", () => {
  const items: FocusItem[] = [
    {
      description: "d1",
      email: {
        from: "f",
        id: "e1" as GenericId<"emails">,
        receivedAt: 0,
        subject: "s",
      },
      id: "l1" as GenericId<"links">,
      title: "t1",
      url: "u1",
    },
    {
      description: "d2",
      email: {
        from: "f",
        id: "e1" as GenericId<"emails">,
        receivedAt: 0,
        subject: "s",
      },
      id: "l2" as GenericId<"links">,
      title: "t2",
      url: "u2",
    },
  ];

  const state = focusDeckReducer(createInitialFocusDeckState(), {
    items,
    remainingCount: 2,
    requestedLinkId: null,
    tag: "init",
  });

  const dismissing = focusDeckReducer(state, {
    action: "discard",
    startX: 0,
    tag: "startDismiss",
  });

  expect(dismissing.queue.map((item) => item.id)).toEqual([
    "l2" as GenericId<"links">,
  ]);
});

test("startDismiss increments processedCount", () => {
  const items: FocusItem[] = [
    {
      description: "d1",
      email: {
        from: "f",
        id: "e1" as GenericId<"emails">,
        receivedAt: 0,
        subject: "s",
      },
      id: "l1" as GenericId<"links">,
      title: "t1",
      url: "u1",
    },
  ];

  const state = focusDeckReducer(createInitialFocusDeckState(), {
    items,
    remainingCount: 1,
    requestedLinkId: null,
    tag: "init",
  });

  const dismissing = focusDeckReducer(state, {
    action: "save",
    startX: 0,
    tag: "startDismiss",
  });

  expect(dismissing.processedCount).toBe(1);
});

test("finishDismiss clears dismissing", () => {
  const items: FocusItem[] = [
    {
      description: "d1",
      email: {
        from: "f",
        id: "e1" as GenericId<"emails">,
        receivedAt: 0,
        subject: "s",
      },
      id: "l1" as GenericId<"links">,
      title: "t1",
      url: "u1",
    },
  ];

  const state = focusDeckReducer(createInitialFocusDeckState(), {
    items,
    remainingCount: 1,
    requestedLinkId: null,
    tag: "init",
  });

  const dismissing = focusDeckReducer(state, {
    action: "save",
    startX: 0,
    tag: "startDismiss",
  });

  const finished = focusDeckReducer(dismissing, { tag: "finishDismiss" });
  expect(finished.dismissing).toBeNull();
});

test("requeueItem appends when missing", () => {
  const items: FocusItem[] = [
    {
      description: "d1",
      email: {
        from: "f",
        id: "e1" as GenericId<"emails">,
        receivedAt: 0,
        subject: "s",
      },
      id: "l1" as GenericId<"links">,
      title: "t1",
      url: "u1",
    },
  ];

  const state = focusDeckReducer(createInitialFocusDeckState(), {
    items,
    remainingCount: 1,
    requestedLinkId: null,
    tag: "init",
  });

  const next = focusDeckReducer(state, {
    item: {
      description: "d2",
      email: {
        from: "f",
        id: "e1" as GenericId<"emails">,
        receivedAt: 0,
        subject: "s",
      },
      id: "l2" as GenericId<"links">,
      title: "t2",
      url: "u2",
    },
    tag: "requeueItem",
  });

  expect(next.queue.map((item) => item.id)).toEqual([
    "l1" as GenericId<"links">,
    "l2" as GenericId<"links">,
  ]);
});

test("startDismiss decrements remainingCount", () => {
  const items: FocusItem[] = [
    {
      description: "d1",
      email: {
        from: "f",
        id: "e1" as GenericId<"emails">,
        receivedAt: 0,
        subject: "s",
      },
      id: "l1" as GenericId<"links">,
      title: "t1",
      url: "u1",
    },
  ];

  const state = focusDeckReducer(createInitialFocusDeckState(), {
    items,
    remainingCount: 1,
    requestedLinkId: null,
    tag: "init",
  });

  const dismissing = focusDeckReducer(state, {
    action: "save",
    startX: 0,
    tag: "startDismiss",
  });

  expect(dismissing.remainingCount).toBe(0);
});

test("requeueItem increments remainingCount when it adds an item", () => {
  const items: FocusItem[] = [
    {
      description: "d1",
      email: {
        from: "f",
        id: "e1" as GenericId<"emails">,
        receivedAt: 0,
        subject: "s",
      },
      id: "l1" as GenericId<"links">,
      title: "t1",
      url: "u1",
    },
  ];

  const state = focusDeckReducer(createInitialFocusDeckState(), {
    items,
    remainingCount: 1,
    requestedLinkId: null,
    tag: "init",
  });

  const next = focusDeckReducer(state, {
    item: {
      description: "d2",
      email: {
        from: "f",
        id: "e1" as GenericId<"emails">,
        receivedAt: 0,
        subject: "s",
      },
      id: "l2" as GenericId<"links">,
      title: "t2",
      url: "u2",
    },
    tag: "requeueItem",
  });

  expect(next.remainingCount).toBe(2);
});
