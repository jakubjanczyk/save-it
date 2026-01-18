"use client";

import { useAction, useQuery } from "convex/react";

import { discardLink, listPendingFocus, saveLink } from "../home-convex-refs";

import { FocusDeck } from "./focus-deck";
import { FocusEmptyCard } from "./focus-empty-card";
import { FocusLoadingCard } from "./focus-loading-card";
import { getActiveLinkId } from "./focus-queue";
import { FocusShortcuts } from "./focus-shortcuts";
import { useFocusDeckController } from "./use-focus-deck-controller";

export function FocusClient(props: { requestedLinkId: string | null }) {
  const requestedLinkId = getActiveLinkId(props.requestedLinkId);
  const discard = useAction(discardLink);
  const save = useAction(saveLink);
  const pendingItems = useQuery(listPendingFocus, {});

  const controller = useFocusDeckController({
    discard,
    pendingItems,
    requestedLinkId,
    save,
  });

  const activeItem =
    controller.state.dismissing?.item ?? controller.state.shownItem;

  if (!pendingItems) {
    return <FocusLoadingCard />;
  }

  if (!activeItem) {
    return <FocusEmptyCard />;
  }

  return (
    <>
      <FocusShortcuts
        enabled={controller.handlers.shortcutsEnabled}
        onDiscard={controller.handlers.discardCurrent}
        onOpen={controller.handlers.openCurrent}
        onSave={controller.handlers.saveCurrent}
      />

      <FocusDeck
        dismissing={controller.state.dismissing}
        onDiscard={controller.handlers.discardCurrent}
        onDismissAnimationComplete={
          controller.handlers.onDismissAnimationComplete
        }
        onSave={controller.handlers.saveCurrent}
        peekItem={controller.state.peekItem}
        remainingCount={controller.state.remainingCount}
        shownItem={controller.state.shownItem}
      />
    </>
  );
}
