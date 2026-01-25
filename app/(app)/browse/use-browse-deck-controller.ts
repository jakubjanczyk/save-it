"use client";

import type { GenericId } from "convex/values";
import { useEffect, useReducer } from "react";
import { toast } from "sonner";

import { SWIPE_THRESHOLD_PX } from "@/components/focus/focus-swipe";

import type { SavedLinkItem } from "./convex-refs";

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

function createInitialBrowseDeckState(): BrowseDeckState {
  return { archiving: null, history: [], navigating: null, queue: [] };
}

function syncSaved(state: BrowseDeckState, items: SavedLinkItem[]) {
  const byId = new Map(items.map((item) => [item.id, item]));

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

  const newItems = items.filter((item) => !knownIds.has(item.id));

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
            current: updatedNavigatingItem,
            next: state.navigating.window.next
              ? (byId.get(state.navigating.window.next.id) ??
                state.navigating.window.next)
              : null,
            nextNext: state.navigating.window.nextNext
              ? (byId.get(state.navigating.window.nextNext.id) ??
                state.navigating.window.nextNext)
              : null,
            prev: state.navigating.window.prev
              ? (byId.get(state.navigating.window.prev.id) ??
                state.navigating.window.prev)
              : null,
            prevPrev: state.navigating.window.prevPrev
              ? (byId.get(state.navigating.window.prevPrev.id) ??
                state.navigating.window.prevPrev)
              : null,
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

function startArchive(state: BrowseDeckState, startX: number) {
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
        archiving: { item: top, startX },
        history: state.history.slice(0, -1),
        queue: [previous],
      };
    }
  }

  return {
    ...state,
    archiving: { item: top, startX },
    queue: remainingQueue,
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
  startY: number
) {
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

  if (direction === "next") {
    if (state.queue.length <= 1) {
      return state;
    }

    return {
      ...state,
      history: [...state.history, current],
      navigating: { direction, startY, window },
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
    navigating: { direction, startY, window },
    queue: [previous, ...state.queue],
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

function requeueItem(state: BrowseDeckState, item: SavedLinkItem) {
  const exists =
    state.queue.some((existing) => existing.id === item.id) ||
    state.history.some((existing) => existing.id === item.id);
  if (exists) {
    return state;
  }

  return {
    ...state,
    queue: [...state.queue, item],
  };
}

function updateItem(state: BrowseDeckState, item: SavedLinkItem) {
  const updatedQueue = state.queue.map((existing) =>
    existing.id === item.id ? item : existing
  );

  const updatedHistory = state.history.map((existing) =>
    existing.id === item.id ? item : existing
  );

  const updatedArchiving =
    state.archiving?.item.id === item.id
      ? { ...state.archiving, item }
      : state.archiving;

  const updatedNavigating = state.navigating
    ? {
        ...state.navigating,
        window: {
          current:
            state.navigating.window.current.id === item.id
              ? item
              : state.navigating.window.current,
          next:
            state.navigating.window.next?.id === item.id
              ? item
              : state.navigating.window.next,
          nextNext:
            state.navigating.window.nextNext?.id === item.id
              ? item
              : state.navigating.window.nextNext,
          prev:
            state.navigating.window.prev?.id === item.id
              ? item
              : state.navigating.window.prev,
          prevPrev:
            state.navigating.window.prevPrev?.id === item.id
              ? item
              : state.navigating.window.prevPrev,
        },
      }
    : null;

  return {
    ...state,
    archiving: updatedArchiving,
    history: updatedHistory,
    navigating: updatedNavigating,
    queue: updatedQueue,
  };
}

function browseDeckReducer(
  state: BrowseDeckState,
  event: BrowseDeckEvent
): BrowseDeckState {
  switch (event.tag) {
    case "syncSaved":
      return syncSaved(state, event.items);
    case "startArchive":
      return startArchive(state, event.startX);
    case "finishArchive":
      return finishArchive(state);
    case "startNavigate":
      return startNavigate(state, event.direction, event.startY);
    case "finishNavigate":
      return finishNavigate(state);
    case "requeueItem":
      return requeueItem(state, event.item);
    case "updateItem":
      return updateItem(state, event.item);
    default:
      return state;
  }
}

const PRELOAD_THRESHOLD = 5;

export function useBrowseDeckController(params: {
  archive: (args: { linkId: GenericId<"links"> }) => Promise<unknown>;
  loadMore: () => void;
  savedItems: SavedLinkItem[] | undefined;
  toggleFavorite: (args: {
    linkId: GenericId<"links">;
  }) => Promise<{ isFavorite: boolean }>;
}) {
  const [state, dispatch] = useReducer(
    browseDeckReducer,
    undefined,
    createInitialBrowseDeckState
  );

  const canNavigate = !(state.archiving || state.navigating);
  const topItem = state.queue[0] ?? null;
  const nextItem = state.queue[1] ?? null;
  const previousItem = state.history.at(-1) ?? null;

  useEffect(() => {
    if (!params.savedItems) {
      return;
    }
    dispatch({
      items: params.savedItems,
      tag: "syncSaved",
    });
  }, [params.savedItems]);

  useEffect(() => {
    if (state.queue.length <= PRELOAD_THRESHOLD && state.queue.length > 0) {
      params.loadMore();
    }
  }, [state.queue.length, params.loadMore]);

  const requestArchive = (startX = 0) => {
    if (!topItem || state.archiving) {
      return;
    }

    dispatch({ startX, tag: "startArchive" });

    params.archive({ linkId: topItem.id }).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Archive failed");
      dispatch({ item: topItem, tag: "requeueItem" });
    });
  };

  const requestFavorite = () => {
    if (!topItem) {
      return;
    }

    const item = topItem;
    params
      .toggleFavorite({ linkId: item.id })
      .then((result) => {
        dispatch({
          item: { ...item, isFavorite: result.isFavorite },
          tag: "updateItem",
        });
      })
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : "Toggle favorite failed"
        );
      });
  };

  const onDismissAnimationComplete = () => {
    if (!state.archiving) {
      return;
    }

    dispatch({ tag: "finishArchive" });
  };

  const openCurrent = () => {
    if (!topItem) {
      return;
    }

    window.open(topItem.url, "_blank", "noopener,noreferrer");
  };

  return {
    handlers: {
      archiveCurrent: requestArchive,
      archiveCurrentLeft: () => requestArchive(-SWIPE_THRESHOLD_PX),
      archiveCurrentRight: () => requestArchive(SWIPE_THRESHOLD_PX),
      favoriteCurrent: requestFavorite,
      nextCard: (startY?: number) => {
        if (!canNavigate) {
          return false;
        }
        if (state.queue.length <= 1) {
          return false;
        }

        dispatch({
          direction: "next",
          startY: startY ?? 1,
          tag: "startNavigate",
        });
        return true;
      },
      onDismissAnimationComplete,
      onNavigateAnimationComplete: () => dispatch({ tag: "finishNavigate" }),
      openCurrent,
      previousCard: (startY?: number) => {
        if (!canNavigate) {
          return false;
        }
        if (state.history.length === 0) {
          return false;
        }

        dispatch({
          direction: "previous",
          startY: startY ?? -1,
          tag: "startNavigate",
        });
        return true;
      },
      shortcutsEnabled: canNavigate,
    },
    state: {
      archiving: state.archiving,
      canNext: canNavigate && state.queue.length > 1,
      canPrevious: canNavigate && state.history.length > 0,
      navigating: state.navigating,
      nextItem,
      previousItem,
      remainingCount: state.queue.length + state.history.length,
      shownItem: topItem,
    },
  };
}
