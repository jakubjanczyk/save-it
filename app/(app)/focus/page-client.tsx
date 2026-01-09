"use client";

import { useAction, useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";

import { FocusView } from "@/components/focus-view";

import { discardLink, listPendingFocus, saveLink } from "../home-convex-refs";

import { FocusEmptyCard } from "./focus-empty-card";
import { FocusLoadingCard } from "./focus-loading-card";
import { getActiveLinkId } from "./focus-queue";
import { FocusShortcuts } from "./focus-shortcuts";
import { toFocusViewItem } from "./to-focus-view-item";
import { useFocusController } from "./use-focus-controller";

export function FocusClient() {
  const searchParams = useSearchParams();
  const requestedLinkId = getActiveLinkId(searchParams.get("linkId"));

  const items = useQuery(listPendingFocus, {});
  const discard = useAction(discardLink);
  const save = useAction(saveLink);

  const controller = useFocusController({
    discard,
    items,
    requestedLinkId,
    save,
  });

  if (items === undefined) {
    return <FocusLoadingCard />;
  }

  if (items.length === 0) {
    if (controller.state.feedbackAction && controller.state.shownItem) {
      return (
        <>
          <FocusShortcuts enabled={false} />
          <FocusView
            busy
            feedbackAction={controller.state.feedbackAction}
            item={toFocusViewItem(controller.state.shownItem)}
            onDiscard={() => undefined}
            onFeedbackComplete={controller.handlers.onFeedbackComplete}
            onSave={() => undefined}
            position={controller.state.position}
            total={controller.state.total}
          />
        </>
      );
    }

    return <FocusEmptyCard />;
  }

  if (!controller.state.shownItem) {
    return null;
  }

  return (
    <>
      <FocusShortcuts
        enabled={controller.handlers.shortcutsEnabled}
        onDiscard={controller.handlers.discardCurrent}
        onOpen={controller.handlers.openCurrent}
        onSave={controller.handlers.saveCurrent}
      />

      <FocusView
        busy={controller.state.busy}
        feedbackAction={controller.state.feedbackAction}
        item={toFocusViewItem(controller.state.shownItem)}
        onDiscard={controller.handlers.discardCurrent}
        onFeedbackComplete={controller.handlers.onFeedbackComplete}
        onSave={controller.handlers.saveCurrent}
        position={controller.state.position}
        total={controller.state.total}
      />
    </>
  );
}
