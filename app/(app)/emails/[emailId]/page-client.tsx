"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { EmailDetailView } from "@/components/email-detail-view";
import { LinkList } from "@/components/link-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import {
  discardLink,
  listLinksByEmail,
  listWithPendingLinks,
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
  const emailId = getEmailIdParam(params.emailId);

  const emails = useQuery(listWithPendingLinks, {});
  const links = useQuery(listLinksByEmail, emailId ? { emailId } : "skip");
  const discard = useMutation(discardLink);
  const save = useAction(saveLink);

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
          <CardTitle>Unknown email</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          This email is not available. Go back to the inbox and pick one.
        </CardContent>
      </Card>
    );
  }

  const linksLoading = links === undefined;
  const listViewLinks =
    links?.map((link) => ({
      description: link.description,
      id: link._id,
      status: link.status,
      title: link.title,
      url: link.url,
    })) ?? [];

  return (
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
        await discard({ linkId: linkId as GenericId<"links"> });
      }}
      onSaveLink={async (linkId) => {
        try {
          await save({ linkId: linkId as GenericId<"links"> });
          toast.success("Saved to Raindrop.");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Save failed");
        }
      }}
      prevHref={prevEmailId ? `/emails/${prevEmailId}` : undefined}
    />
  );
}
