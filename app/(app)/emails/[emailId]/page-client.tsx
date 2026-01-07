"use client";

import { useAction, useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { EmailDetailView } from "@/components/email-detail-view";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { LinkList } from "@/components/link-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import {
  discardLink,
  listLinksByEmail,
  listWithPendingLinks,
  markEmailAsRead,
  saveLink,
} from "../../home-convex-refs";

function getEmailIdParam(param: unknown): GenericId<"emails"> | null {
  if (typeof param === "string" && param.length > 0) {
    return param as GenericId<"emails">;
  }

  return null;
}

export function EmailDetailClient() {
  const params = useParams();
  const router = useRouter();
  const emailId = getEmailIdParam(params.emailId);

  const emails = useQuery(listWithPendingLinks, {});
  const links = useQuery(listLinksByEmail, emailId ? { emailId } : "skip");
  const discard = useAction(discardLink);
  const save = useAction(saveLink);
  const markAsRead = useAction(markEmailAsRead);

  const [actionBusy, setActionBusy] = useState(false);

  const linksLoading = links === undefined;
  const listViewLinks =
    links?.map((link) => ({
      description: link.description,
      id: link._id,
      status: link.status,
      title: link.title,
      url: link.url,
    })) ?? [];

  const pendingLinkIds = useMemo(
    () =>
      listViewLinks
        .filter((link) => link.status === "pending")
        .map((link) => link.id),
    [listViewLinks]
  );

  const [selectedLinkId, setSelectedLinkId] =
    useState<GenericId<"links"> | null>(null);

  useEffect(() => {
    if (pendingLinkIds.length === 0) {
      setSelectedLinkId(null);
      return;
    }

    if (!(selectedLinkId && pendingLinkIds.includes(selectedLinkId))) {
      setSelectedLinkId(pendingLinkIds[0] ?? null);
    }
  }, [pendingLinkIds, selectedLinkId]);

  const selectedLink = useMemo(() => {
    if (!selectedLinkId) {
      return null;
    }

    return listViewLinks.find((link) => link.id === selectedLinkId) ?? null;
  }, [listViewLinks, selectedLinkId]);

  const selectNextLink = () => {
    if (pendingLinkIds.length === 0) {
      return;
    }

    const current = selectedLinkId ?? pendingLinkIds[0];
    const currentIndex = current ? pendingLinkIds.indexOf(current) : -1;
    const nextIndex = Math.min(pendingLinkIds.length - 1, currentIndex + 1);
    setSelectedLinkId(pendingLinkIds[nextIndex] ?? pendingLinkIds[0] ?? null);
  };

  const selectPrevLink = () => {
    if (pendingLinkIds.length === 0) {
      return;
    }

    const current = selectedLinkId ?? pendingLinkIds[0];
    const currentIndex = current ? pendingLinkIds.indexOf(current) : -1;
    const prevIndex = Math.max(0, currentIndex - 1);
    setSelectedLinkId(pendingLinkIds[prevIndex] ?? pendingLinkIds[0] ?? null);
  };

  const openSelected = () => {
    if (!selectedLink) {
      return;
    }

    window.open(selectedLink.url, "_blank", "noopener,noreferrer");
  };

  const discardSelected = async () => {
    if (!selectedLinkId || actionBusy) {
      return;
    }

    try {
      setActionBusy(true);
      await discard({ linkId: selectedLinkId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Discard failed");
    } finally {
      setActionBusy(false);
    }
  };

  const saveSelected = async () => {
    if (!selectedLinkId || actionBusy) {
      return;
    }

    try {
      setActionBusy(true);
      await save({ linkId: selectedLinkId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setActionBusy(false);
    }
  };

  const markCurrentEmailAsRead = async () => {
    if (!emailId) {
      return;
    }

    try {
      const result = await markAsRead({
        emailId,
      });
      toast.success(
        `Marked as read.${result.discarded > 0 ? ` Discarded ${result.discarded} pending ${result.discarded === 1 ? "link" : "links"}.` : ""}`
      );
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Mark as read failed"
      );
    }
  };

  if (!emailId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invalid email</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          The email id in the URL is invalid.
        </CardContent>
      </Card>
    );
  }

  if (emails === undefined) {
    return (
      <div className="grid gap-4">
        <div className="grid gap-2 rounded-md border p-4">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-9 w-28" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
          </div>
          <div className="grid gap-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>

        <LinkList
          links={[]}
          loading
          onDiscardLink={() => undefined}
          onSaveLink={() => undefined}
          skeletonCount={3}
        />
      </div>
    );
  }

  const emailIndex = emails.findIndex((email) => email._id === emailId);
  const email = emailIndex >= 0 ? emails[emailIndex] : null;
  const prevEmailId = emailIndex > 0 ? emails[emailIndex - 1]?._id : undefined;
  const nextEmailId = emailIndex >= 0 ? emails[emailIndex + 1]?._id : undefined;

  if (!email) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email not in queue</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          This email is already processed or not available. Go back to the inbox
          to pick another.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <KeyboardShortcuts
        context="list"
        enabled={!actionBusy}
        onDiscard={discardSelected}
        onMarkAsRead={markCurrentEmailAsRead}
        onNextEmail={
          nextEmailId
            ? () => {
                router.push(`/emails/${nextEmailId}`);
              }
            : undefined
        }
        onNextLink={selectNextLink}
        onOpen={openSelected}
        onPrevEmail={
          prevEmailId
            ? () => {
                router.push(`/emails/${prevEmailId}`);
              }
            : undefined
        }
        onPrevLink={selectPrevLink}
        onSave={saveSelected}
        onToggleView={() => {
          router.push("/focus");
        }}
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
          if (actionBusy) {
            return;
          }

          setSelectedLinkId(linkId as GenericId<"links">);
          try {
            setActionBusy(true);
            await discard({ linkId: linkId as GenericId<"links"> });
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Discard failed"
            );
          } finally {
            setActionBusy(false);
          }
        }}
        onMarkAsRead={markCurrentEmailAsRead}
        onSaveLink={async (linkId) => {
          if (actionBusy) {
            return;
          }

          setSelectedLinkId(linkId as GenericId<"links">);
          try {
            setActionBusy(true);
            await save({ linkId: linkId as GenericId<"links"> });
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Save failed");
          } finally {
            setActionBusy(false);
          }
        }}
        prevHref={prevEmailId ? `/emails/${prevEmailId}` : undefined}
        selectedLinkId={selectedLinkId ?? undefined}
      />
    </>
  );
}
