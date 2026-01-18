"use client";

import { useQuery } from "convex/react";

import { EmailList } from "@/components/email-list";
import { Skeleton } from "@/components/ui/skeleton";

import { listWithPendingLinks } from "../home-convex-refs";

function InboxListSkeleton() {
  const rows = ["row-1", "row-2", "row-3"];

  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <div className="rounded-lg border border-border/50 px-4 py-3" key={row}>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="mt-2 h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function InboxListClient() {
  const emails = useQuery(listWithPendingLinks, {});

  if (!emails) {
    return <InboxListSkeleton />;
  }

  return (
    <EmailList
      emails={emails.map((email) => ({
        extractionError: email.extractionError,
        from: email.from,
        id: email._id,
        pendingLinkCount: email.pendingLinkCount,
        receivedAt: email.receivedAt,
        subject: email.subject,
      }))}
    />
  );
}
