"use client";

import type { GenericId } from "convex/values";

import { Button } from "@/components/ui/button";

export interface SenderListItem {
  id: GenericId<"senders">;
  email: string;
  name?: string;
}

export interface SenderListProps {
  senders: readonly SenderListItem[];
  onDelete: (senderId: GenericId<"senders">) => Promise<void> | void;
}

export function SenderList({ onDelete, senders }: SenderListProps) {
  if (senders.length === 0) {
    return <p className="text-muted-foreground text-sm">No senders yet.</p>;
  }

  return (
    <ul className="divide-y overflow-hidden rounded-md border">
      {senders.map((sender) => (
        <li
          className="flex items-center justify-between gap-4 px-4 py-3"
          key={sender.id}
        >
          <div className="min-w-0">
            <div className="truncate font-medium">
              {sender.name ? sender.name : sender.email}
            </div>
            {sender.name ? (
              <div className="truncate text-muted-foreground text-sm">
                {sender.email}
              </div>
            ) : null}
          </div>
          <Button
            aria-label={`Remove ${sender.email}`}
            onClick={async () => {
              await onDelete(sender.id);
            }}
            size="sm"
            variant="destructive"
          >
            Remove
          </Button>
        </li>
      ))}
    </ul>
  );
}
