"use client";

import { useAction } from "convex/react";
import type { GenericId } from "convex/values";

import { EmailDetailView } from "@/components/email-detail-view";

import type { EmailListItem, LinkDoc } from "../../home-convex-refs";
import {
  archiveEmail,
  discardLink,
  markEmailAsRead,
  saveLink,
} from "../../home-convex-refs";

import { EmailDetailShortcuts } from "./email-detail-shortcuts";
import { openInNewTab } from "./open-in-new-tab";
import { toSelectableLinks } from "./to-selectable-links";
import { useArchiveEmail } from "./use-archive-email";
import { useLinkActions } from "./use-link-actions";
import { useLinkSelection } from "./use-link-selection";
import { useMarkEmailAsRead } from "./use-mark-email-as-read";

export function EmailDetailClient(props: {
  email: EmailListItem;
  links: LinkDoc[];
  nextEmailId?: GenericId<"emails">;
  prevEmailId?: GenericId<"emails">;
}) {
  const listViewLinks = toSelectableLinks(props.links);
  const discard = useAction(discardLink);
  const save = useAction(saveLink);
  const markAsRead = useAction(markEmailAsRead);
  const archive = useAction(archiveEmail);

  const {
    selectedLink,
    selectedLinkId,
    selectNextLink,
    selectPrevLink,
    setSelectedLinkId,
  } = useLinkSelection(listViewLinks);

  const openSelected = () => {
    if (!selectedLink) {
      return;
    }

    openInNewTab(selectedLink.url);
  };

  const {
    actionBusy,
    discardSelected,
    discardWithSelection,
    saveSelected,
    saveWithSelection,
  } = useLinkActions({
    discard,
    save,
    selectedLinkId,
    setSelectedLinkId,
  });

  const markCurrentEmailAsRead = useMarkEmailAsRead({
    emailId: props.email._id,
    markAsRead,
  });

  const archiveCurrentEmail = useArchiveEmail({
    archive,
    emailId: props.email._id,
  });

  return (
    <>
      <EmailDetailShortcuts
        enabled={!actionBusy}
        nextEmailId={props.nextEmailId}
        onDiscard={discardSelected}
        onMarkAsRead={markCurrentEmailAsRead}
        onNextLink={selectNextLink}
        onOpen={openSelected}
        onPrevLink={selectPrevLink}
        onSave={saveSelected}
        prevEmailId={props.prevEmailId}
      />

      <EmailDetailView
        backHref="/inbox"
        email={{
          extractionError: props.email.extractionError,
          from: props.email.from,
          id: props.email._id,
          pendingLinkCount: props.email.pendingLinkCount,
          receivedAt: props.email.receivedAt,
          subject: props.email.subject,
        }}
        links={listViewLinks}
        linksLoading={false}
        nextHref={
          props.nextEmailId ? `/emails/${props.nextEmailId}` : undefined
        }
        onArchive={archiveCurrentEmail}
        onDiscardLink={async (linkId) => {
          await discardWithSelection(linkId as GenericId<"links">);
        }}
        onMarkAsRead={markCurrentEmailAsRead}
        onSaveLink={async (linkId) => {
          await saveWithSelection(linkId as GenericId<"links">);
        }}
        prevHref={
          props.prevEmailId ? `/emails/${props.prevEmailId}` : undefined
        }
        selectedLinkId={selectedLinkId ?? undefined}
      />
    </>
  );
}
