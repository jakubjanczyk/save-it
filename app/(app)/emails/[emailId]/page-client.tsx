"use client";

import { useAction } from "convex/react";
import type { GenericId } from "convex/values";
import { useParams } from "next/navigation";

import { EmailDetailView } from "@/components/email-detail-view";

import { discardLink, markEmailAsRead, saveLink } from "../../home-convex-refs";

import { EmailDetailLoading } from "./email-detail-loading";
import { EmailDetailShortcuts } from "./email-detail-shortcuts";
import { EmailNotInQueueCard } from "./email-not-in-queue-card";
import { getEmailIdParam } from "./get-email-id-param";
import { InvalidEmailCard } from "./invalid-email-card";
import { openInNewTab } from "./open-in-new-tab";
import { useEmailDetailData } from "./use-email-detail-data";
import { getEmailNavigation } from "./use-email-navigation";
import { useLinkActions } from "./use-link-actions";
import { useLinkSelection } from "./use-link-selection";
import { useMarkEmailAsRead } from "./use-mark-email-as-read";

export function EmailDetailClient() {
  const params = useParams();
  const emailId = getEmailIdParam(params.emailId);

  const { emails, linksLoading, listViewLinks } = useEmailDetailData({
    emailId,
  });
  const discard = useAction(discardLink);
  const save = useAction(saveLink);
  const markAsRead = useAction(markEmailAsRead);

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

  const markCurrentEmailAsRead = useMarkEmailAsRead({ emailId, markAsRead });

  if (!emailId) {
    return <InvalidEmailCard />;
  }

  if (emails === undefined) {
    return <EmailDetailLoading />;
  }

  const { email, nextEmailId, prevEmailId } = getEmailNavigation(
    emails,
    emailId
  );

  if (!email) {
    return <EmailNotInQueueCard />;
  }

  return (
    <>
      <EmailDetailShortcuts
        enabled={!actionBusy}
        nextEmailId={nextEmailId}
        onDiscard={discardSelected}
        onMarkAsRead={markCurrentEmailAsRead}
        onNextLink={selectNextLink}
        onOpen={openSelected}
        onPrevLink={selectPrevLink}
        onSave={saveSelected}
        prevEmailId={prevEmailId}
      />

      <EmailDetailView
        backHref="/"
        email={{
          extractionError: email.extractionError,
          from: email.from,
          id: email._id,
          pendingLinkCount: email.pendingLinkCount,
          receivedAt: email.receivedAt,
          subject: email.subject,
        }}
        links={listViewLinks}
        linksLoading={linksLoading}
        nextHref={nextEmailId ? `/emails/${nextEmailId}` : undefined}
        onDiscardLink={async (linkId) => {
          await discardWithSelection(linkId as GenericId<"links">);
        }}
        onMarkAsRead={markCurrentEmailAsRead}
        onSaveLink={async (linkId) => {
          await saveWithSelection(linkId as GenericId<"links">);
        }}
        prevHref={prevEmailId ? `/emails/${prevEmailId}` : undefined}
        selectedLinkId={selectedLinkId ?? undefined}
      />
    </>
  );
}
