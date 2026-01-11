"use client";

import { useAction } from "convex/react";

import { discardLink, saveLink } from "../home-convex-refs";

import { FocusDeck } from "./focus-deck";
import { FocusEmptyCard } from "./focus-empty-card";
import type { FocusItem } from "./focus-item";
import { getActiveLinkId } from "./focus-queue";
import { FocusShortcuts } from "./focus-shortcuts";
import { useFocusDeckController } from "./use-focus-deck-controller";

export function FocusClient(props: {
  items: FocusItem[];
  remainingCount: number;
  requestedLinkId: string | null;
}) {
  const requestedLinkId = getActiveLinkId(props.requestedLinkId);
  const items: FocusItem[] = props.items;
  const discard = useAction(discardLink);
  const save = useAction(saveLink);

  const controller = useFocusDeckController({
    discard,
    initialItems: items,
    initialRemainingCount: props.remainingCount,
    requestedLinkId,
    save,
  });

  const activeItem =
    controller.state.dismissing?.item ?? controller.state.shownItem;

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
