import Link from "next/link";

import { cn } from "@/lib/utils";

export interface EmailListItem {
  id: string;
  subject: string;
  from: string;
  receivedAt: number;
  pendingLinkCount: number;
  extractionError: boolean;
}

export interface EmailListProps {
  emails: readonly EmailListItem[];
  selectedEmailId?: string;
  emailHrefPrefix?: string;
}

export function EmailList({
  emails,
  emailHrefPrefix = "/emails",
  selectedEmailId,
}: EmailListProps) {
  if (emails.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No newsletters to triage yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border/50 overflow-hidden rounded-lg border">
      {emails.map((email) => {
        const selected = email.id === selectedEmailId;
        return (
          <li key={email.id}>
            <Link
              aria-current={selected ? "true" : undefined}
              className={cn(
                "flex w-full flex-col items-start gap-3 px-4 py-3 text-left transition-colors duration-150 sm:flex-row sm:items-center sm:justify-between",
                selected
                  ? "border-l-2 border-l-primary bg-accent"
                  : "hover:bg-muted/40"
              )}
              href={`${emailHrefPrefix}/${email.id}`}
            >
              <div className="min-w-0">
                <div className="break-words font-medium leading-snug">
                  {email.subject}
                </div>
                <div className="break-words text-muted-foreground text-sm">
                  {email.from}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                {email.extractionError ? (
                  <span className="rounded bg-destructive/15 px-2 py-1 font-medium text-destructive text-xs">
                    Extraction error
                  </span>
                ) : null}
                {email.pendingLinkCount > 0 ? (
                  <span className="rounded bg-primary/20 px-2 py-1 font-medium text-foreground text-xs">
                    {email.pendingLinkCount} pending
                  </span>
                ) : null}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
