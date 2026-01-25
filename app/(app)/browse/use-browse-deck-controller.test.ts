import { expect, test } from "vitest";
import type { SavedLinkItem } from "./convex-refs";
import {
  type BrowseDeckState,
  browseDeckReducer,
  createInitialBrowseDeckState,
  type DeckNavigationWindow,
} from "./deck/browse-deck-state";

function createMockItem(
  id: string,
  overrides: Partial<SavedLinkItem> = {}
): SavedLinkItem {
  return {
    description: "Test description",
    id: id as SavedLinkItem["id"],
    isFavorite: false,
    savedAt: Date.now(),
    title: `Link ${id}`,
    url: `https://example.com/${id}`,
    ...overrides,
  };
}

function createWindow(params: {
  current: SavedLinkItem;
  next?: SavedLinkItem | null;
  nextNext?: SavedLinkItem | null;
  prev?: SavedLinkItem | null;
  prevPrev?: SavedLinkItem | null;
}): DeckNavigationWindow {
  return {
    current: params.current,
    next: params.next ?? null,
    nextNext: params.nextNext ?? null,
    prev: params.prev ?? null,
    prevPrev: params.prevPrev ?? null,
  };
}

test("syncSaved merges new ids with queue", () => {
  const item1 = createMockItem("1");
  const item2 = createMockItem("2");

  const state: BrowseDeckState = {
    ...createInitialBrowseDeckState(),
    queueIds: [item1.id],
  };

  const nextState = browseDeckReducer(state, {
    ids: [item1.id, item2.id],
    tag: "syncSaved",
  });

  expect(nextState.queueIds).toEqual([item1.id, item2.id]);
});

test("syncSaved prunes missing ids but keeps archiving snapshot", () => {
  const item1 = createMockItem("1");
  const item2 = createMockItem("2");
  const item3 = createMockItem("3");

  const state: BrowseDeckState = {
    ...createInitialBrowseDeckState(),
    archiving: { item: item1, startX: 0 },
    historyIds: [item3.id],
    queueIds: [item2.id],
  };

  const nextState = browseDeckReducer(state, {
    ids: [item2.id],
    tag: "syncSaved",
  });

  expect(nextState.archiving?.item.id).toBe(item1.id);
  expect(nextState.queueIds).toEqual([item2.id]);
  expect(nextState.historyIds).toEqual([]);
});

test("startArchive removes id from queue", () => {
  const item1 = createMockItem("1");
  const item2 = createMockItem("2");

  const state: BrowseDeckState = {
    ...createInitialBrowseDeckState(),
    queueIds: [item1.id, item2.id],
  };

  const nextState = browseDeckReducer(state, {
    item: item1,
    startX: 100,
    tag: "startArchive",
  });

  expect(nextState.archiving?.item.id).toBe(item1.id);
  expect(nextState.queueIds).toEqual([item2.id]);
});

test("startArchive falls back to previous when at end", () => {
  const item1 = createMockItem("1");
  const item2 = createMockItem("2");

  const state: BrowseDeckState = {
    ...createInitialBrowseDeckState(),
    historyIds: [item1.id],
    queueIds: [item2.id],
  };

  const nextState = browseDeckReducer(state, {
    item: item2,
    startX: 100,
    tag: "startArchive",
  });

  expect(nextState.archiving?.item.id).toBe(item2.id);
  expect(nextState.historyIds).toEqual([]);
  expect(nextState.queueIds).toEqual([item1.id]);
});

test("finishArchive clears archiving state", () => {
  const item = createMockItem("1");

  const state: BrowseDeckState = {
    ...createInitialBrowseDeckState(),
    archiving: { item, startX: 100 },
  };

  const nextState = browseDeckReducer(state, { tag: "finishArchive" });

  expect(nextState.archiving).toBeNull();
});

test("requeueId appends failed id back", () => {
  const item1 = createMockItem("1");
  const item2 = createMockItem("2");

  const state: BrowseDeckState = {
    ...createInitialBrowseDeckState(),
    queueIds: [item1.id],
  };

  const nextState = browseDeckReducer(state, {
    id: item2.id,
    tag: "requeueId",
  });

  expect(nextState.queueIds).toEqual([item1.id, item2.id]);
});

test("requeueId does not duplicate if id already in queue", () => {
  const item = createMockItem("1");

  const state: BrowseDeckState = {
    ...createInitialBrowseDeckState(),
    queueIds: [item.id],
  };

  const nextState = browseDeckReducer(state, {
    id: item.id,
    tag: "requeueId",
  });

  expect(nextState.queueIds).toEqual([item.id]);
});

test("startNavigate next shifts to next id without looping", () => {
  const item1 = createMockItem("1");
  const item2 = createMockItem("2");
  const item3 = createMockItem("3");

  const state: BrowseDeckState = {
    ...createInitialBrowseDeckState(),
    queueIds: [item1.id, item2.id, item3.id],
  };

  const nextState = browseDeckReducer(state, {
    direction: "next",
    startY: 0,
    tag: "startNavigate",
    window: createWindow({ current: item1, next: item2, nextNext: item3 }),
  });

  expect(nextState.historyIds).toEqual([item1.id]);
  expect(nextState.queueIds).toEqual([item2.id, item3.id]);
  expect(nextState.navigating?.direction).toBe("next");
  expect(nextState.navigating?.window.current.id).toBe(item1.id);
});

test("startNavigate next does nothing when already at last id", () => {
  const item1 = createMockItem("1");

  const state: BrowseDeckState = {
    ...createInitialBrowseDeckState(),
    historyIds: [createMockItem("0").id],
    queueIds: [item1.id],
  };

  const nextState = browseDeckReducer(state, {
    direction: "next",
    startY: 0,
    tag: "startNavigate",
    window: createWindow({ current: item1 }),
  });

  expect(nextState).toEqual(state);
});

test("startNavigate previous shifts to previous id without looping", () => {
  const item1 = createMockItem("1");
  const item2 = createMockItem("2");
  const item3 = createMockItem("3");

  const state: BrowseDeckState = {
    ...createInitialBrowseDeckState(),
    historyIds: [item1.id],
    queueIds: [item2.id, item3.id],
  };

  const nextState = browseDeckReducer(state, {
    direction: "previous",
    startY: 0,
    tag: "startNavigate",
    window: createWindow({ current: item2, prev: item1, next: item3 }),
  });

  expect(nextState.historyIds).toEqual([]);
  expect(nextState.queueIds).toEqual([item1.id, item2.id, item3.id]);
  expect(nextState.navigating?.direction).toBe("previous");
});

test("finishNavigate clears navigating state", () => {
  const item1 = createMockItem("1");
  const item2 = createMockItem("2");

  const state: BrowseDeckState = {
    ...createInitialBrowseDeckState(),
    navigating: {
      direction: "next",
      startY: 0,
      window: createWindow({ current: item1, next: item2 }),
    },
    queueIds: [item2.id],
  };

  const nextState = browseDeckReducer(state, { tag: "finishNavigate" });

  expect(nextState.navigating).toBeNull();
});
