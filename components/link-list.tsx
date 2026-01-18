"use client";

import { LinkCard } from "@/components/link-card";
import { LinkExtractionErrorBanner } from "@/components/links/link-extraction-error-banner";
import { LinkListEmptyState } from "@/components/links/link-list-empty-state";
import { LinkListSkeleton } from "@/components/links/link-list-skeleton";
import { sortLinksByStatus } from "@/components/links/sort-links";

export interface LinkListItem {
  id: string;
  title: string;
  description: string;
  url: string;
  status: "pending" | "processing" | "saved" | "discarded";
}

export interface LinkListProps {
  links: readonly LinkListItem[];
  extractionError?: boolean;
  loading?: boolean;
  skeletonCount?: number;
  selectedLinkId?: string;
  onSaveLink: (linkId: string) => Promise<void> | void;
  onDiscardLink: (linkId: string) => Promise<void> | void;
}

export function LinkList({
  extractionError = false,
  links,
  loading = false,
  skeletonCount = 3,
  selectedLinkId,
  onDiscardLink,
  onSaveLink,
}: LinkListProps) {
  if (loading) {
    return (
      <div className="grid gap-4">
        {extractionError ? <LinkExtractionErrorBanner /> : null}
        <LinkListSkeleton count={skeletonCount} />
      </div>
    );
  }

  const sortedLinks = sortLinksByStatus(links);

  return (
    <div className="grid gap-4">
      {extractionError ? <LinkExtractionErrorBanner /> : null}

      {sortedLinks.length === 0 ? (
        <LinkListEmptyState />
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
              selected={link.id === selectedLinkId}
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
