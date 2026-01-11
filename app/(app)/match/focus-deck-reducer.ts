import type { GenericId } from "convex/values";

import type { FocusAction } from "@/components/focus/types";

import type { FocusItem } from "./focus-item";

export interface FocusDeckState {
  dismissing: { action: FocusAction; item: FocusItem; startX: number } | null;
  processedCount: number;
  queue: FocusItem[];
  remainingCount: number;
}

export type FocusDeckEvent =
  | { tag: "appendItems"; items: FocusItem[] }
  | { tag: "finishDismiss" }
  | {
      tag: "init";
      items: FocusItem[];
      remainingCount: number;
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
  return { dismissing: null, processedCount: 0, queue: [], remainingCount: 0 };
}

export function focusDeckReducer(
  state: FocusDeckState,
  event: FocusDeckEvent
): FocusDeckState {
  if (event.tag === "init") {
    const queue = event.requestedLinkId
      ? rotateQueueToId(event.items, event.requestedLinkId)
      : event.items;

    return {
      dismissing: null,
      processedCount: 0,
      queue,
      remainingCount: event.remainingCount,
    };
  }

  if (event.tag === "appendItems") {
    return {
      ...state,
      queue: appendUniqueById(state.queue, event.items),
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
      processedCount: state.processedCount + 1,
      queue: state.queue.slice(1),
      remainingCount: Math.max(0, state.remainingCount - 1),
    };
  }

  if (event.tag === "finishDismiss") {
    if (!state.dismissing) {
      return state;
    }

    return {
      dismissing: null,
      processedCount: state.processedCount,
      queue: state.queue,
      remainingCount: state.remainingCount,
    };
  }

  if (event.tag === "requeueItem") {
    const beforeLength = state.queue.length;
    const queue = appendUniqueById(state.queue, [event.item]);
    const didAdd = queue.length !== beforeLength;

    return {
      ...state,
      queue,
      remainingCount: didAdd ? state.remainingCount + 1 : state.remainingCount,
    };
  }

  return state;
}
