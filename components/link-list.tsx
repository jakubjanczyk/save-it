"use client";

import { LinkCard } from "@/components/link-card";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const linkSkeletonKeys = [
  "link-skeleton-0",
  "link-skeleton-1",
  "link-skeleton-2",
  "link-skeleton-3",
  "link-skeleton-4",
  "link-skeleton-5",
  "link-skeleton-6",
  "link-skeleton-7",
  "link-skeleton-8",
  "link-skeleton-9",
] as const;

function SkeletonButton(props: { label: string; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        buttonVariants({ size: "default", variant: "default" }),
        "pointer-events-none bg-accent text-transparent shadow-none",
        props.className
      )}
    >
      {props.label}
    </div>
  );
}

export interface LinkListItem {
  id: string;
  title: string;
  description: string;
  url: string;
  status: "pending" | "saved" | "discarded";
}

export interface LinkListProps {
  links: readonly LinkListItem[];
  extractionError?: boolean;
  loading?: boolean;
  skeletonCount?: number;
  onSaveLink: (linkId: string) => Promise<void> | void;
  onDiscardLink: (linkId: string) => Promise<void> | void;
}

export function LinkList({
  extractionError = false,
  links,
  loading = false,
  skeletonCount = 3,
  onDiscardLink,
  onSaveLink,
}: LinkListProps) {
  if (loading) {
    const count = Math.max(1, Math.min(10, skeletonCount));
    return (
      <div className="grid gap-4">
        {extractionError ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-destructive text-sm">
            Link extraction failed for this email.
          </div>
        ) : null}
        <div className="grid gap-4">
          {linkSkeletonKeys.slice(0, count).map((key) => (
            <Card data-testid="link-card-skeleton" key={key}>
              <CardHeader className="gap-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="grid gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
              <CardFooter className="gap-2">
                <SkeletonButton label="Save" />
                <SkeletonButton label="Discard" />
                <SkeletonButton className="ml-auto" label="Open" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const sortedLinks = [...links].sort((a, b) => {
    const rank = (status: LinkListItem["status"]) =>
      status === "pending" ? 0 : 1;

    const rankDiff = rank(a.status) - rank(b.status);
    if (rankDiff !== 0) {
      return rankDiff;
    }

    return a.status.localeCompare(b.status);
  });

  return (
    <div className="grid gap-4">
      {extractionError ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-destructive text-sm">
          Link extraction failed for this email.
        </div>
      ) : null}

      {sortedLinks.length === 0 ? (
        <p className="text-muted-foreground text-sm">No links pending.</p>
      ) : (
        <div className="grid gap-4">
          {sortedLinks.map((link) => (
            <LinkCard
              description={link.description}
              key={link.id}
              onDiscard={async () => {
                await onDiscardLink(link.id);
              }}
              onSave={async () => {
                await onSaveLink(link.id);
              }}
              status={link.status}
              title={link.title}
              url={link.url}
            />
          ))}
        </div>
      )}
    </div>
  );
}
