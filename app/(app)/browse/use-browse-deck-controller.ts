"use client";

import type { GenericId } from "convex/values";
import { useEffect, useMemo, useReducer } from "react";
import { toast } from "sonner";

import { SWIPE_THRESHOLD_PX } from "@/components/focus/focus-swipe";

import type { SavedLinkItem } from "./convex-refs";
import {
  browseDeckReducer,
  createInitialBrowseDeckState,
  type DeckNavigationWindow,
} from "./deck/browse-deck-state";

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

  const itemsById = useMemo(() => {
    if (!params.savedItems) {
      return new Map<SavedLinkItem["id"], SavedLinkItem>();
    }
    return new Map(params.savedItems.map((item) => [item.id, item]));
  }, [params.savedItems]);

  const canNavigate = !(state.archiving || state.navigating);
  const topId = state.queueIds[0] ?? null;
  const topItem = topId ? (itemsById.get(topId) ?? null) : null;
  const nextItemId = state.queueIds[1] ?? null;
  const nextItem = nextItemId ? (itemsById.get(nextItemId) ?? null) : null;
  const previousItemId = state.historyIds.at(-1) ?? null;
  const previousItem = previousItemId
    ? (itemsById.get(previousItemId) ?? null)
    : null;

  useEffect(() => {
    if (!params.savedItems) {
      return;
    }
    dispatch({
      ids: params.savedItems.map((item) => item.id),
      tag: "syncSaved",
    });
  }, [params.savedItems]);

  useEffect(() => {
    if (
      state.queueIds.length <= PRELOAD_THRESHOLD &&
      state.queueIds.length > 0
    ) {
      params.loadMore();
    }
  }, [state.queueIds.length, params.loadMore]);

  const requestArchive = (startX = 0) => {
    if (!topItem || state.archiving) {
      return;
    }

    dispatch({ item: topItem, startX, tag: "startArchive" });

    params.archive({ linkId: topItem.id }).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Archive failed");
      dispatch({ id: topItem.id, tag: "requeueId" });
    });
  };

  const requestFavorite = () => {
    if (!topItem) {
      return;
    }

    const item = topItem;
    params.toggleFavorite({ linkId: item.id }).catch((error) => {
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
        if (state.queueIds.length <= 1) {
          return false;
        }

        const current = topItem;
        if (!current) {
          return false;
        }

        const nextNextId = state.queueIds[2] ?? null;
        const prevPrevId = state.historyIds.at(-2) ?? null;

        const window: DeckNavigationWindow = {
          current,
          next: nextItem,
          nextNext: nextNextId ? (itemsById.get(nextNextId) ?? null) : null,
          prev: previousItem,
          prevPrev: prevPrevId ? (itemsById.get(prevPrevId) ?? null) : null,
        };

        dispatch({
          direction: "next",
          startY: startY ?? 1,
          window,
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
        if (state.historyIds.length === 0) {
          return false;
        }

        const current = topItem;
        if (!current) {
          return false;
        }

        const nextNextId = state.queueIds[2] ?? null;
        const prevPrevId = state.historyIds.at(-2) ?? null;

        const window: DeckNavigationWindow = {
          current,
          next: nextItem,
          nextNext: nextNextId ? (itemsById.get(nextNextId) ?? null) : null,
          prev: previousItem,
          prevPrev: prevPrevId ? (itemsById.get(prevPrevId) ?? null) : null,
        };

        dispatch({
          direction: "previous",
          startY: startY ?? -1,
          window,
          tag: "startNavigate",
        });
        return true;
      },
      shortcutsEnabled: canNavigate,
    },
    state: {
      archiving: state.archiving,
      canNext: canNavigate && state.queueIds.length > 1,
      canPrevious: canNavigate && state.historyIds.length > 0,
      navigating: state.navigating,
      nextItem,
      previousItem,
      remainingCount: state.queueIds.length + state.historyIds.length,
      shownItem: topItem,
    },
  };
}

export type BrowseDeckController = ReturnType<typeof useBrowseDeckController>;
