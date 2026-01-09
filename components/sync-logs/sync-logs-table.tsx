"use client";

import type { GenericId } from "convex/values";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SyncLogStatus = "success" | "error";

export interface SyncLogRow {
  _id: GenericId<"syncLogs">;
  attemptedAt: number;
  emailId: GenericId<"emails">;
  extractedLinkCount: number;
  from: string;
  gmailId: string;
  receivedAt: number;
  status: SyncLogStatus;
  storedLinkCount: number;
  subject: string;
}

function pad2(value: number) {
  return value.toString().padStart(2, "0");
}

function formatUtcDateTime(timestampMs: number) {
  const date = new Date(timestampMs);
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(
    date.getUTCDate()
  )} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())} UTC`;
}

export function SyncLogsTable(props: {
  logs: readonly SyncLogRow[];
  retryingEmailId: GenericId<"emails"> | null;
  onRetry: (emailId: GenericId<"emails">) => Promise<void> | void;
}) {
  if (props.logs.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No sync attempts yet.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Links</TableHead>
          <TableHead>Last sync</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.logs.map((log) => {
          const statusLabel = log.status === "success" ? "Success" : "Failed";
          const retryDisabled = props.retryingEmailId === log.emailId;

          const linksLabel =
            log.extractedLinkCount === log.storedLinkCount
              ? `${log.storedLinkCount}`
              : `${log.storedLinkCount} / ${log.extractedLinkCount}`;

          return (
            <TableRow key={log._id}>
              <TableCell className="max-w-[520px]">
                <div className="truncate font-medium">{log.subject}</div>
                <div className="truncate text-muted-foreground text-sm">
                  {log.from}
                </div>
              </TableCell>
              <TableCell>{statusLabel}</TableCell>
              <TableCell className="text-right tabular-nums">
                {linksLabel}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatUtcDateTime(log.attemptedAt)}
              </TableCell>
              <TableCell className="text-right">
                {log.status === "error" ? (
                  <Button
                    aria-label="Retry"
                    disabled={retryDisabled}
                    onClick={async () => {
                      await props.onRetry(log.emailId);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Retry
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
