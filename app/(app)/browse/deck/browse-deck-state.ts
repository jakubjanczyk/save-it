import type { GenericId } from "convex/values";

import type { SavedLinkItem } from "../convex-refs";

export type LinkId = GenericId<"links">;

export interface DeckNavigationWindow {
  current: SavedLinkItem;
  next: SavedLinkItem | null;
  nextNext: SavedLinkItem | null;
  prev: SavedLinkItem | null;
  prevPrev: SavedLinkItem | null;
}

export interface DeckNavigating {
  direction: "next" | "previous";
  startY: number;
  window: DeckNavigationWindow;
}

export interface DeckArchiving {
  item: SavedLinkItem;
  startX: number;
}

export interface BrowseDeckState {
  archiving: DeckArchiving | null;
  navigating: DeckNavigating | null;
  historyIds: LinkId[];
  queueIds: LinkId[];
}

export type BrowseDeckEvent =
  | { tag: "finishArchive" }
  | { tag: "finishNavigate" }
  | { tag: "requeueId"; id: LinkId }
  | { tag: "startArchive"; item: SavedLinkItem; startX: number }
  | {
      tag: "startNavigate";
      direction: "next" | "previous";
      startY: number;
      window: DeckNavigationWindow;
    }
  | { tag: "syncSaved"; ids: LinkId[] };

export function createInitialBrowseDeckState(): BrowseDeckState {
  return {
    archiving: null,
    historyIds: [],
    navigating: null,
    queueIds: [],
  };
}

function syncSaved(state: BrowseDeckState, ids: LinkId[]) {
  const savedIds = new Set(ids);

  const updatedQueueIds = state.queueIds.filter((id) => savedIds.has(id));
  const updatedHistoryIds = state.historyIds.filter((id) => savedIds.has(id));

  const knownIds = new Set<LinkId>([...updatedQueueIds, ...updatedHistoryIds]);
  if (state.archiving) {
    knownIds.add(state.archiving.item.id);
  }
  if (state.navigating) {
    knownIds.add(state.navigating.window.current.id);
  }

  const newIds = ids.filter((id) => !knownIds.has(id));

  return {
    ...state,
    historyIds: updatedHistoryIds,
    queueIds: [...updatedQueueIds, ...newIds],
  };
}

function startArchive(
  state: BrowseDeckState,
  item: SavedLinkItem,
  startX: number
) {
  const topId = state.queueIds[0];
  if (!topId || topId !== item.id || state.archiving || state.navigating) {
    return state;
  }

  const remainingQueueIds = state.queueIds.slice(1);
  if (remainingQueueIds.length === 0 && state.historyIds.length > 0) {
    const previousId = state.historyIds.at(-1);
    if (previousId) {
      return {
        ...state,
        archiving: { item, startX },
        historyIds: state.historyIds.slice(0, -1),
        queueIds: [previousId],
      };
    }
  }

  return {
    ...state,
    archiving: { item, startX },
    queueIds: remainingQueueIds,
  };
}

function finishArchive(state: BrowseDeckState) {
  if (!state.archiving) {
    return state;
  }

  return {
    ...state,
    archiving: null,
  };
}

function startNavigate(
  state: BrowseDeckState,
  direction: "next" | "previous",
  startY: number,
  window: DeckNavigationWindow
) {
  if (state.archiving || state.navigating) {
    return state;
  }

  const currentId = state.queueIds[0];
  if (!currentId || currentId !== window.current.id) {
    return state;
  }

  if (direction === "next") {
    if (state.queueIds.length <= 1) {
      return state;
    }

    return {
      ...state,
      historyIds: [...state.historyIds, currentId],
      navigating: { direction, startY, window },
      queueIds: state.queueIds.slice(1),
    };
  }

  const previousId = state.historyIds.at(-1);
  if (!previousId) {
    return state;
  }

  return {
    ...state,
    historyIds: state.historyIds.slice(0, -1),
    navigating: { direction, startY, window },
    queueIds: [previousId, ...state.queueIds],
  };
}

function finishNavigate(state: BrowseDeckState) {
  if (!state.navigating) {
    return state;
  }

  return {
    ...state,
    navigating: null,
  };
}

function requeueId(state: BrowseDeckState, id: LinkId) {
  const exists =
    state.queueIds.includes(id) ||
    state.historyIds.includes(id) ||
    state.archiving?.item.id === id ||
    state.navigating?.window.current.id === id;
  if (exists) {
    return state;
  }

  return {
    ...state,
    queueIds: [...state.queueIds, id],
  };
}

export function browseDeckReducer(
  state: BrowseDeckState,
  event: BrowseDeckEvent
): BrowseDeckState {
  switch (event.tag) {
    case "syncSaved":
      return syncSaved(state, event.ids);
    case "startArchive":
      return startArchive(state, event.item, event.startX);
    case "finishArchive":
      return finishArchive(state);
    case "startNavigate":
      return startNavigate(state, event.direction, event.startY, event.window);
    case "finishNavigate":
      return finishNavigate(state);
    case "requeueId":
      return requeueId(state, event.id);
    default:
      return state;
  }
}
