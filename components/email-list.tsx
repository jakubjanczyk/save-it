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
    <ul className="divide-y overflow-hidden rounded-md border">
      {emails.map((email) => {
        const selected = email.id === selectedEmailId;
        return (
          <li key={email.id}>
            <Link
              aria-current={selected ? "true" : undefined}
              className={cn(
                "flex w-full items-center justify-between gap-4 px-4 py-3 text-left",
                selected ? "bg-accent" : "hover:bg-muted/50"
              )}
              href={`${emailHrefPrefix}/${email.id}`}
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{email.subject}</div>
                <div className="truncate text-muted-foreground text-sm">
                  {email.from}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {email.extractionError ? (
                  <span className="rounded bg-destructive/10 px-2 py-1 font-medium text-destructive text-xs">
                    Extraction error
                  </span>
                ) : null}
                {email.pendingLinkCount > 0 ? (
                  <span className="rounded bg-muted px-2 py-1 font-medium text-xs">
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
