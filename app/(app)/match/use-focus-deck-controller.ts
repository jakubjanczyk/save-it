"use client";

import { useConvex } from "convex/react";
import type { GenericId } from "convex/values";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { toast } from "sonner";

import type { FocusAction } from "@/components/focus/types";

import { listPendingFocusBatch } from "../home-convex-refs";

import {
  createInitialFocusDeckState,
  focusDeckReducer,
} from "./focus-deck-reducer";
import type { FocusItem } from "./focus-item";

const INITIAL_BATCH_SIZE = 10;
const PREFETCH_BATCH_SIZE = 10;
const PREFETCH_THRESHOLD = 6;
const PREFETCH_COOLDOWN_MS = 5000;

function setFocusUrl(linkId: GenericId<"links"> | null) {
  if (typeof window === "undefined") {
    return;
  }

  const url = linkId ? `/match?linkId=${linkId}` : "/match";
  window.history.replaceState(null, "", url);
}

export function useFocusDeckController(params: {
  initialItems: FocusItem[];
  initialRemainingCount: number;
  requestedLinkId: GenericId<"links"> | null;
  discard: (args: { linkId: GenericId<"links"> }) => Promise<unknown>;
  save: (args: { linkId: GenericId<"links"> }) => Promise<unknown>;
}) {
  const convex = useConvex();

  const [state, dispatch] = useReducer(focusDeckReducer, undefined, () => {
    const items = params.initialItems.slice(0, INITIAL_BATCH_SIZE);
    return focusDeckReducer(createInitialFocusDeckState(), {
      items,
      remainingCount: params.initialRemainingCount,
      requestedLinkId: params.requestedLinkId,
      tag: "init",
    });
  });

  const [prefetching, setPrefetching] = useState(false);
  const [inFlightIds, setInFlightIds] = useState<Set<GenericId<"links">>>(
    () => new Set()
  );

  const topItem = state.queue[0] ?? null;
  const peekItem = state.queue[1] ?? null;

  useEffect(() => {
    setFocusUrl(topItem?.id ?? null);
  }, [topItem?.id]);

  const excludeIds = useMemo(() => {
    const exclude = new Set<GenericId<"links">>();

    for (const item of state.queue) {
      exclude.add(item.id);
    }

    for (const id of inFlightIds) {
      exclude.add(id);
    }

    return Array.from(exclude);
  }, [inFlightIds, state.queue]);

  const prefetchCooldownUntilRef = useRef(0);

  useEffect(() => {
    if (prefetching) {
      return;
    }

    if (Date.now() < prefetchCooldownUntilRef.current) {
      return;
    }

    if (state.queue.length >= PREFETCH_THRESHOLD) {
      return;
    }

    setPrefetching(true);
    convex
      .query(listPendingFocusBatch, { excludeIds, limit: PREFETCH_BATCH_SIZE })
      .then((items) => {
        if (items.length === 0) {
          prefetchCooldownUntilRef.current = Date.now() + PREFETCH_COOLDOWN_MS;
        }
        dispatch({ items, tag: "appendItems" });
      })
      .catch(() => undefined)
      .finally(() => {
        setPrefetching(false);
      });
  }, [convex, excludeIds, prefetching, state.queue.length]);

  const runAction = (action: FocusAction, item: FocusItem) => {
    setInFlightIds((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });

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
      .finally(() => {
        setInFlightIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      });
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
      remainingCount: state.remainingCount,
      shownItem: topItem,
    },
  };
}
