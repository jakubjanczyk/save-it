"use client";

import { useAction, useQuery } from "convex/react";

import { EmailList } from "@/components/email-list";
import { FetchEmailsCard } from "@/components/fetch-emails-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { fetchFromGmail, listWithPendingLinks } from "./home-convex-refs";

const emailSkeletonKeys = [
  "email-skeleton-0",
  "email-skeleton-1",
  "email-skeleton-2",
  "email-skeleton-3",
  "email-skeleton-4",
  "email-skeleton-5",
] as const;

export function InboxClient() {
  const runFetch = useAction(fetchFromGmail);
  const emails = useQuery(listWithPendingLinks, {});

  return (
    <div className="grid gap-6">
      <FetchEmailsCard
        onFetch={async () => {
          return await runFetch({});
        }}
      />

      {emails === undefined ? (
        <Card>
          <CardHeader>
            <CardTitle>Inbox</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {emailSkeletonKeys.map((key) => (
              <div
                className="flex items-center justify-between gap-4 rounded-md border px-4 py-3"
                key={key}
              >
                <div className="grid w-full max-w-[520px] gap-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Inbox</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
