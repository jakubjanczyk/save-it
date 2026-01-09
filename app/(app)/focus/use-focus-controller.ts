"use client";

import type { GenericId } from "convex/values";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { getActiveIndex, getNeighborLinkId } from "./focus-queue";

interface FocusItem {
  description: string;
  email: {
    from: string;
    id: GenericId<"emails">;
    receivedAt: number;
    subject: string;
  };
  id: GenericId<"links">;
  title: string;
  url: string;
}

type FocusFeedbackAction = "save" | "discard" | null;

export interface FocusControllerState {
  busy: boolean;
  feedbackAction: FocusFeedbackAction;
  shownItem: FocusItem | null;
  position: number;
  total: number;
}

export interface FocusControllerHandlers {
  discardCurrent: () => Promise<void>;
  onFeedbackComplete: () => void;
  openCurrent: () => void;
  saveCurrent: () => Promise<void>;
  shortcutsEnabled: boolean;
}

export function useFocusController(params: {
  items: FocusItem[] | undefined;
  requestedLinkId: GenericId<"links"> | null;
  discard: (args: { linkId: GenericId<"links"> }) => Promise<unknown>;
  save: (args: { linkId: GenericId<"links"> }) => Promise<unknown>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [feedbackAction, setFeedbackAction] =
    useState<FocusFeedbackAction>(null);
  const [displayedItem, setDisplayedItem] = useState<FocusItem | null>(null);
  const [displayedMeta, setDisplayedMeta] = useState<{
    nextId: GenericId<"links"> | null;
    position: number;
    total: number;
  }>({ nextId: null, position: 1, total: 1 });

  const activeIndex = useMemo(
    () => getActiveIndex(params.items, params.requestedLinkId),
    [params.items, params.requestedLinkId]
  );
  const activeItem =
    params.items && activeIndex >= 0 ? params.items[activeIndex] : null;

  useEffect(() => {
    if (!params.items || params.items.length === 0) {
      return;
    }

    if (feedbackAction) {
      return;
    }

    if (!params.requestedLinkId || activeIndex === -1) {
      router.replace(`/focus?linkId=${params.items[0]?.id}`);
    }
  }, [
    activeIndex,
    feedbackAction,
    params.items,
    params.requestedLinkId,
    router,
  ]);

  useEffect(() => {
    if (feedbackAction) {
      return;
    }

    if (!params.items || params.items.length === 0) {
      setDisplayedItem(null);
      return;
    }

    if (activeItem) {
      setDisplayedItem(activeItem);
      setDisplayedMeta({
        nextId: getNeighborLinkId(params.items, activeIndex),
        position: activeIndex + 1,
        total: params.items.length,
      });
    }
  }, [activeIndex, activeItem, feedbackAction, params.items]);

  const shownItem = feedbackAction ? displayedItem : activeItem;

  let position = 1;
  if (feedbackAction) {
    position = displayedMeta.position;
  } else if (activeIndex >= 0) {
    position = activeIndex + 1;
  }

  const total = feedbackAction
    ? displayedMeta.total
    : (params.items?.length ?? 0);

  const advance = (nextId: GenericId<"links"> | null) => {
    if (nextId) {
      router.replace(`/focus?linkId=${nextId}`);
      router.refresh();
      return;
    }

    router.replace("/focus");
    router.refresh();
  };

  const openCurrent = () => {
    if (!shownItem) {
      return;
    }

    window.open(shownItem.url, "_blank", "noopener,noreferrer");
  };

  const freezeMetaFromActive = () => {
    if (!params.items || activeIndex < 0) {
      return;
    }

    setDisplayedMeta({
      nextId: getNeighborLinkId(params.items, activeIndex),
      position: activeIndex + 1,
      total: params.items.length,
    });
  };

  const discardCurrent = async () => {
    if (busy || !shownItem) {
      return;
    }

    setBusy(true);
    try {
      freezeMetaFromActive();
      setDisplayedItem(shownItem);
      await params.discard({ linkId: shownItem.id });
      setFeedbackAction("discard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Discard failed");
      setBusy(false);
    }
  };

  const saveCurrent = async () => {
    if (busy || !shownItem) {
      return;
    }

    setBusy(true);
    try {
      freezeMetaFromActive();
      setDisplayedItem(shownItem);
      await params.save({ linkId: shownItem.id });
      setFeedbackAction("save");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
      setBusy(false);
    }
  };

  const onFeedbackComplete = () => {
    const nextId = displayedMeta.nextId;
    setFeedbackAction(null);
    setBusy(false);
    advance(nextId);
  };

  return {
    handlers: {
      discardCurrent,
      onFeedbackComplete,
      openCurrent,
      saveCurrent,
      shortcutsEnabled: !(busy || feedbackAction),
    } satisfies FocusControllerHandlers,
    state: {
      busy,
      feedbackAction,
      position,
      shownItem,
      total,
    } satisfies FocusControllerState,
  };
}
