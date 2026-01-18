"use client";

import type { GenericId } from "convex/values";
import { useEffect, useReducer, useRef } from "react";
import { toast } from "sonner";

import type { FocusAction } from "@/components/focus/types";

import {
  createInitialFocusDeckState,
  focusDeckReducer,
} from "./focus-deck-reducer";
import type { FocusItem } from "./focus-item";

function setFocusUrl(linkId: GenericId<"links"> | null) {
  if (typeof window === "undefined") {
    return;
  }

  const basePath = window.location.pathname.startsWith("/match")
    ? "/match"
    : "/";
  const url = linkId ? `${basePath}?linkId=${linkId}` : basePath;
  window.history.replaceState(null, "", url);
}

export function useFocusDeckController(params: {
  pendingItems: FocusItem[] | undefined;
  requestedLinkId: GenericId<"links"> | null;
  discard: (args: { linkId: GenericId<"links"> }) => Promise<unknown>;
  save: (args: { linkId: GenericId<"links"> }) => Promise<unknown>;
}) {
  const [state, dispatch] = useReducer(
    focusDeckReducer,
    undefined,
    createInitialFocusDeckState
  );
  const didInitRef = useRef(false);

  const topItem = state.queue[0] ?? null;
  const peekItem = state.queue[1] ?? null;

  useEffect(() => {
    if (!(topItem || didInitRef.current)) {
      return;
    }

    setFocusUrl(topItem?.id ?? null);
  }, [topItem]);

  useEffect(() => {
    if (!params.pendingItems) {
      return;
    }

    dispatch({
      isInitial: !didInitRef.current,
      items: params.pendingItems,
      requestedLinkId: params.requestedLinkId,
      tag: "syncPending",
    });
    didInitRef.current = true;
  }, [params.pendingItems, params.requestedLinkId]);

  const remainingCount = params.pendingItems?.length ?? 0;

  const runAction = (action: FocusAction, item: FocusItem) => {
    const promise =
      action === "save"
        ? params.save({ linkId: item.id })
        : params.discard({ linkId: item.id });

    promise
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : `${action} failed`
        );

        dispatch({ item, tag: "requeueItem" });
      })
      .finally(() => undefined);
  };

  const requestDismiss = (action: FocusAction, startX = 0) => {
    if (!topItem || state.dismissing) {
      return;
    }

    dispatch({ action, startX, tag: "startDismiss" });
    runAction(action, topItem);
  };

  const onDismissAnimationComplete = () => {
    if (!state.dismissing) {
      return;
    }

    dispatch({ tag: "finishDismiss" });
  };

  const openCurrent = () => {
    if (!topItem) {
      return;
    }

    window.open(topItem.url, "_blank", "noopener,noreferrer");
  };

  return {
    handlers: {
      discardCurrent: (startX?: number) => requestDismiss("discard", startX),
      onDismissAnimationComplete,
      openCurrent,
      saveCurrent: (startX?: number) => requestDismiss("save", startX),
      shortcutsEnabled: !state.dismissing,
    },
    state: {
      dismissing: state.dismissing,
      peekItem,
      remainingCount,
      shownItem: topItem,
    },
  };
}
