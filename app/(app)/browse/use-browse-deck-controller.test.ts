import { expect, test } from "vitest";

import type { SavedLinkItem } from "./convex-refs";

// Testing the reducer directly since it's the core logic

interface BrowseDeckState {
  archiving: { item: SavedLinkItem; startX: number } | null;
  navigating: {
    direction: "next" | "previous";
    startY: number;
    window: {
      current: SavedLinkItem;
      next: SavedLinkItem | null;
      nextNext: SavedLinkItem | null;
      prev: SavedLinkItem | null;
      prevPrev: SavedLinkItem | null;
    };
  } | null;
  history: SavedLinkItem[];
  queue: SavedLinkItem[];
}

type BrowseDeckEvent =
  | { tag: "finishArchive" }
  | { tag: "finishNavigate" }
  | { tag: "requeueItem"; item: SavedLinkItem }
  | { tag: "startArchive"; startX: number }
  | { tag: "startNavigate"; direction: "next" | "previous"; startY: number }
  | { tag: "syncSaved"; items: SavedLinkItem[] }
  | { tag: "updateItem"; item: SavedLinkItem };

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

function browseDeckReducer(
  state: BrowseDeckState,
  event: BrowseDeckEvent
): BrowseDeckState {
  if (event.tag === "syncSaved") {
    const byId = new Map(event.items.map((item) => [item.id, item]));

    const updatedQueue = state.queue
      .map((item) => byId.get(item.id))
      .filter((item): item is SavedLinkItem => Boolean(item));

    const updatedHistory = state.history
      .map((item) => byId.get(item.id))
      .filter((item): item is SavedLinkItem => Boolean(item));

    const knownIds = new Set([
      ...updatedQueue.map((item) => item.id),
      ...updatedHistory.map((item) => item.id),
      state.archiving?.item.id,
      state.navigating?.window.current.id,
    ]);

    const newItems = event.items.filter((item) => !knownIds.has(item.id));

    const updatedArchivingItem = state.archiving
      ? byId.get(state.archiving.item.id)
      : undefined;
    const updatedArchiving =
      state.archiving && updatedArchivingItem
        ? { ...state.archiving, item: updatedArchivingItem }
        : state.archiving;

    const updatedNavigatingItem = state.navigating
      ? byId.get(state.navigating.window.current.id)
      : undefined;
    const updatedNavigating =
      state.navigating && updatedNavigatingItem
        ? {
            ...state.navigating,
            window: {
              ...state.navigating.window,
              current: updatedNavigatingItem,
            },
          }
        : state.navigating;

    return {
      ...state,
      archiving: updatedArchiving,
      history: updatedHistory,
      navigating: updatedNavigating,
      queue: [...updatedQueue, ...newItems],
    };
  }

  if (event.tag === "startArchive") {
    const top = state.queue[0];
    if (!top || state.archiving || state.navigating) {
      return state;
    }

    const remainingQueue = state.queue.slice(1);
    if (remainingQueue.length === 0 && state.history.length > 0) {
      const previous = state.history.at(-1);
      if (previous) {
        return {
          ...state,
          archiving: { item: top, startX: event.startX },
          history: state.history.slice(0, -1),
          queue: [previous],
        };
      }
    }

    return {
      ...state,
      archiving: { item: top, startX: event.startX },
      queue: remainingQueue,
    };
  }

  if (event.tag === "finishArchive") {
    if (!state.archiving) {
      return state;
    }

    return {
      ...state,
      archiving: null,
    };
  }

  if (event.tag === "startNavigate") {
    if (state.archiving || state.navigating) {
      return state;
    }

    const current = state.queue[0];
    if (!current) {
      return state;
    }

    const window = {
      current,
      next: state.queue[1] ?? null,
      nextNext: state.queue[2] ?? null,
      prev: state.history.at(-1) ?? null,
      prevPrev: state.history.at(-2) ?? null,
    };

    if (event.direction === "next") {
      if (state.queue.length <= 1) {
        return state;
      }

      return {
        ...state,
        history: [...state.history, current],
        navigating: {
          direction: event.direction,
          startY: event.startY,
          window,
        },
        queue: state.queue.slice(1),
      };
    }

    const previous = state.history.at(-1);
    if (!previous) {
      return state;
    }

    return {
      ...state,
      history: state.history.slice(0, -1),
      navigating: {
        direction: event.direction,
        startY: event.startY,
        window,
      },
      queue: [previous, ...state.queue],
    };
  }

  if (event.tag === "finishNavigate") {
    if (!state.navigating) {
      return state;
    }

    return {
      ...state,
      navigating: null,
    };
  }

  if (event.tag === "requeueItem") {
    const exists =
      state.queue.some((item) => item.id === event.item.id) ||
      state.history.some((item) => item.id === event.item.id);
    if (exists) {
      return state;
    }

    return {
      ...state,
      queue: [...state.queue, event.item],
    };
  }

  if (event.tag === "updateItem") {
    const updatedQueue = state.queue.map((item) =>
      item.id === event.item.id ? event.item : item
    );

    const updatedHistory = state.history.map((item) =>
      item.id === event.item.id ? event.item : item
    );

    const updatedArchiving =
      state.archiving?.item.id === event.item.id
        ? { ...state.archiving, item: event.item }
        : state.archiving;

    const updatedNavigating =
      state.navigating?.window.current.id === event.item.id
        ? {
            ...state.navigating,
            window: { ...state.navigating.window, current: event.item },
          }
        : state.navigating;

    return {
      ...state,
      archiving: updatedArchiving,
      history: updatedHistory,
      navigating: updatedNavigating,
      queue: updatedQueue,
    };
  }

  return state;
}

test("syncSaved merges new items with queue", () => {
  const existingItem = createMockItem("1");
  const newItem = createMockItem("2");

  const state: BrowseDeckState = {
    archiving: null,
    history: [],
    navigating: null,
    queue: [existingItem],
  };

  const nextState = browseDeckReducer(state, {
    items: [existingItem, newItem],
    tag: "syncSaved",
  });

  expect(nextState.queue).toHaveLength(2);
  expect(nextState.queue[0]?.id).toBe("1");
  expect(nextState.queue[1]?.id).toBe("2");
});

test("startArchive removes item from queue", () => {
  const item1 = createMockItem("1");
  const item2 = createMockItem("2");

  const state: BrowseDeckState = {
    archiving: null,
    history: [],
    navigating: null,
    queue: [item1, item2],
  };

  const nextState = browseDeckReducer(state, {
    startX: 100,
    tag: "startArchive",
  });

  expect(nextState.archiving?.item.id).toBe("1");
  expect(nextState.queue).toHaveLength(1);
  expect(nextState.queue[0]?.id).toBe("2");
});

test("startArchive falls back to previous when at end", () => {
  const item1 = createMockItem("1");
  const item2 = createMockItem("2");

  const state: BrowseDeckState = {
    archiving: null,
    history: [item1],
    navigating: null,
    queue: [item2],
  };

  const nextState = browseDeckReducer(state, {
    startX: 100,
    tag: "startArchive",
  });

  expect(nextState.archiving?.item.id).toBe("2");
  expect(nextState.history).toHaveLength(0);
  expect(nextState.queue).toHaveLength(1);
  expect(nextState.queue[0]?.id).toBe("1");
});

test("finishArchive clears archiving state", () => {
  const item = createMockItem("1");

  const state: BrowseDeckState = {
    archiving: { item, startX: 100 },
    history: [],
    navigating: null,
    queue: [],
  };

  const nextState = browseDeckReducer(state, { tag: "finishArchive" });

  expect(nextState.archiving).toBeNull();
});

test("requeueItem appends failed item back", () => {
  const item1 = createMockItem("1");
  const failedItem = createMockItem("2");

  const state: BrowseDeckState = {
    archiving: null,
    history: [],
    navigating: null,
    queue: [item1],
  };

  const nextState = browseDeckReducer(state, {
    item: failedItem,
    tag: "requeueItem",
  });

  expect(nextState.queue).toHaveLength(2);
  expect(nextState.queue[1]?.id).toBe("2");
});

test("requeueItem does not duplicate if item already in queue", () => {
  const item = createMockItem("1");

  const state: BrowseDeckState = {
    archiving: null,
    history: [],
    navigating: null,
    queue: [item],
  };

  const nextState = browseDeckReducer(state, {
    item,
    tag: "requeueItem",
  });

  expect(nextState.queue).toHaveLength(1);
});

test("updateItem updates item in queue", () => {
  const item = createMockItem("1", { isFavorite: false });

  const state: BrowseDeckState = {
    archiving: null,
    history: [],
    navigating: null,
    queue: [item],
  };

  const updatedItem = { ...item, isFavorite: true };

  const nextState = browseDeckReducer(state, {
    item: updatedItem,
    tag: "updateItem",
  });

  expect(nextState.queue[0]?.isFavorite).toBe(true);
});

test("startNavigate next shifts to next item without looping", () => {
  const item1 = createMockItem("1");
  const item2 = createMockItem("2");
  const item3 = createMockItem("3");

  const state: BrowseDeckState = {
    archiving: null,
    history: [],
    navigating: null,
    queue: [item1, item2, item3],
  };

  const nextState = browseDeckReducer(state, {
    direction: "next",
    startY: 0,
    tag: "startNavigate",
  });

  expect(nextState.history).toHaveLength(1);
  expect(nextState.history[0]?.id).toBe("1");
  expect(nextState.queue[0]?.id).toBe("2");
  expect(nextState.queue[1]?.id).toBe("3");
});

test("startNavigate next does nothing when already at last item", () => {
  const item1 = createMockItem("1");

  const state: BrowseDeckState = {
    archiving: null,
    history: [createMockItem("0")],
    navigating: null,
    queue: [item1],
  };

  const nextState = browseDeckReducer(state, {
    direction: "next",
    startY: 0,
    tag: "startNavigate",
  });

  expect(nextState).toEqual(state);
});

test("startNavigate previous shifts to previous item without looping", () => {
  const item1 = createMockItem("1");
  const item2 = createMockItem("2");
  const item3 = createMockItem("3");

  const state: BrowseDeckState = {
    archiving: null,
    history: [item1],
    navigating: null,
    queue: [item2, item3],
  };

  const nextState = browseDeckReducer(state, {
    direction: "previous",
    startY: 0,
    tag: "startNavigate",
  });

  expect(nextState.history).toHaveLength(0);
  expect(nextState.queue[0]?.id).toBe("1");
  expect(nextState.queue[1]?.id).toBe("2");
  expect(nextState.queue[2]?.id).toBe("3");
});

test("finishNavigate clears navigating state", () => {
  const item1 = createMockItem("1");
  const item2 = createMockItem("2");

  const state: BrowseDeckState = {
    archiving: null,
    history: [],
    navigating: {
      direction: "next",
      startY: 0,
      window: {
        current: item1,
        next: null,
        nextNext: null,
        prev: null,
        prevPrev: null,
      },
    },
    queue: [item2],
  };

  const nextState = browseDeckReducer(state, { tag: "finishNavigate" });

  expect(nextState.navigating).toBeNull();
});
