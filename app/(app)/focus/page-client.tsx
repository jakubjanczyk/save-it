"use client";

import { useAction } from "convex/react";
import type { GenericId } from "convex/values";

import { FocusView } from "@/components/focus-view";

import { discardLink, saveLink } from "../home-convex-refs";

import { FocusEmptyCard } from "./focus-empty-card";
import { getActiveLinkId } from "./focus-queue";
import { FocusShortcuts } from "./focus-shortcuts";
import { toFocusViewItem } from "./to-focus-view-item";
import { useFocusController } from "./use-focus-controller";

export function FocusClient(props: {
  items: Array<{
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
  }>;
  requestedLinkId: string | null;
}) {
  const requestedLinkId = getActiveLinkId(props.requestedLinkId);
  const items = props.items;
  const discard = useAction(discardLink);
  const save = useAction(saveLink);

  const controller = useFocusController({
    discard,
    items,
    requestedLinkId,
    save,
  });

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
