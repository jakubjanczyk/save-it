"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { LinkList, type LinkListItem } from "@/components/link-list";
import { Button } from "@/components/ui/button";

export interface EmailDetailViewEmail {
  id: string;
  subject: string;
  from: string;
  receivedAt: number;
  pendingLinkCount: number;
  extractionError: boolean;
}

export interface EmailDetailViewProps {
  email: EmailDetailViewEmail;
  links: readonly LinkListItem[];
  linksLoading?: boolean;
  backHref: string;
  prevHref?: string;
  nextHref?: string;
  onSaveLink: (linkId: string) => Promise<void> | void;
  onDiscardLink: (linkId: string) => Promise<void> | void;
  onMarkAsRead?: () => Promise<void> | void;
}

export function EmailDetailView({
  backHref,
  email,
  links,
  linksLoading = false,
  onDiscardLink,
  onSaveLink,
  onMarkAsRead,
  nextHref,
  prevHref,
}: EmailDetailViewProps) {
  const linkSkeletonCount = Math.max(
    1,
    Math.min(10, email.pendingLinkCount || 3)
  );

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 rounded-md border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={backHref}>Back to inbox</Link>
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {prevHref ? (
              <Button asChild size="icon-sm" variant="outline">
                <Link aria-label="Previous email" href={prevHref}>
                  <ChevronLeft />
                </Link>
              </Button>
            ) : (
              <Button
                aria-label="Previous email"
                disabled
                size="icon-sm"
                type="button"
                variant="outline"
              >
                <ChevronLeft />
              </Button>
            )}

            {nextHref ? (
              <Button asChild size="icon-sm" variant="outline">
                <Link aria-label="Next email" href={nextHref}>
                  <ChevronRight />
                </Link>
              </Button>
            ) : (
              <Button
                aria-label="Next email"
                disabled
                size="icon-sm"
                type="button"
                variant="outline"
              >
                <ChevronRight />
              </Button>
            )}
          </div>
        </div>

        <div>
          <div className="font-semibold text-lg leading-snug">
            {email.subject}
          </div>
          <div className="text-muted-foreground text-sm">{email.from}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {email.extractionError ? (
            <span className="rounded bg-destructive/10 px-2 py-1 font-medium text-destructive text-xs">
              Extraction error
            </span>
          ) : null}
          <span className="rounded bg-muted px-2 py-1 font-medium text-xs">
            {email.pendingLinkCount} pending
          </span>
          {onMarkAsRead ? (
            <Button
              className="ml-auto"
              onClick={async () => {
                await onMarkAsRead();
              }}
              size="sm"
              type="button"
            >
              Mark as read
            </Button>
          ) : null}
        </div>
      </div>

      <LinkList
        extractionError={email.extractionError}
        links={links}
        loading={linksLoading}
        onDiscardLink={onDiscardLink}
        onSaveLink={onSaveLink}
        skeletonCount={linkSkeletonCount}
      />
    </div>
  );
}
