import type { GenericId } from "convex/values";

import type { FocusAction } from "@/components/focus/types";

import type { FocusItem } from "./focus-item";

export interface FocusDeckState {
  dismissing: { action: FocusAction; item: FocusItem; startX: number } | null;
  queue: FocusItem[];
}

export type FocusDeckEvent =
  | { tag: "finishDismiss" }
  | {
      tag: "syncPending";
      hiddenIds: GenericId<"links">[];
      isInitial: boolean;
      items: FocusItem[];
      requestedLinkId: GenericId<"links"> | null;
    }
  | { tag: "requeueItem"; item: FocusItem }
  | { tag: "startDismiss"; action: FocusAction; startX: number };

function rotateQueueToId(
  items: FocusItem[],
  id: GenericId<"links">
): FocusItem[] {
  const index = items.findIndex((item) => item.id === id);
  if (index <= 0) {
    return items;
  }

  return [...items.slice(index), ...items.slice(0, index)];
}

function appendUniqueById(queue: FocusItem[], items: FocusItem[]) {
  if (items.length === 0) {
    return queue;
  }

  const existing = new Set(queue.map((item) => item.id));
  const next: FocusItem[] = [...queue];

  for (const item of items) {
    if (existing.has(item.id)) {
      continue;
    }

    existing.add(item.id);
    next.push(item);
  }

  return next;
}

export function createInitialFocusDeckState(): FocusDeckState {
  return { dismissing: null, queue: [] };
}

export function focusDeckReducer(
  state: FocusDeckState,
  event: FocusDeckEvent
): FocusDeckState {
  if (event.tag === "syncPending") {
    const hidden = new Set(event.hiddenIds);
    const pendingIds = new Set(event.items.map((item) => item.id));
    const queue = state.queue.filter(
      (item) => pendingIds.has(item.id) && !hidden.has(item.id)
    );
    const queueIds = new Set(queue.map((item) => item.id));

    for (const item of event.items) {
      if (hidden.has(item.id) || queueIds.has(item.id)) {
        continue;
      }

      queueIds.add(item.id);
      queue.push(item);
    }

    const nextQueue =
      event.isInitial && event.requestedLinkId
        ? rotateQueueToId(queue, event.requestedLinkId)
        : queue;

    return {
      ...state,
      queue: nextQueue,
    };
  }

  if (event.tag === "startDismiss") {
    const top = state.queue[0];
    if (!top || state.dismissing) {
      return state;
    }

    return {
      ...state,
      dismissing: { action: event.action, item: top, startX: event.startX },
      queue: state.queue.slice(1),
    };
  }

  if (event.tag === "finishDismiss") {
    if (!state.dismissing) {
      return state;
    }

    return {
      dismissing: null,
      queue: state.queue,
    };
  }

  if (event.tag === "requeueItem") {
    const queue = appendUniqueById(state.queue, [event.item]);

    return {
      ...state,
      queue,
    };
  }

  return state;
}
