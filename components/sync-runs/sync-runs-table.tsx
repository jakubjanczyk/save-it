"use client";

import type { GenericId } from "convex/values";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type SyncRunStatus = "running" | "success" | "error" | "aborted";

export interface SyncRunRow {
  errorMessage?: string;
  errorName?: string;
  errorTag?: string;
  finishedAt?: number;
  id: GenericId<"syncRuns">;
  isStale: boolean;
  lastHeartbeatAt: number;
  progress: {
    fetchedEmails: number;
    insertedEmails: number;
    processedEmails: number;
    storedLinks: number;
  };
  startedAt: number;
  status: SyncRunStatus;
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

function formatStatus(status: SyncRunStatus, isStale: boolean) {
  if (status === "running" && isStale) {
    return "Running (stale)";
  }

  if (status === "running") {
    return "Running";
  }

  if (status === "success") {
    return "Success";
  }

  if (status === "error") {
    return "Error";
  }

  return "Aborted";
}

export function SyncRunsTable(props: { runs: readonly SyncRunRow[] }) {
  if (props.runs.length === 0) {
    return <p className="text-muted-foreground text-sm">No sync runs yet.</p>;
  }

  return (
    <div className="-mx-1 w-full overflow-x-auto px-1">
      <Table className="min-w-[980px]">
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Finished</TableHead>
            <TableHead>Heartbeat</TableHead>
            <TableHead className="text-right">Fetched</TableHead>
            <TableHead className="text-right">Processed</TableHead>
            <TableHead className="text-right">Inserted</TableHead>
            <TableHead className="text-right">Stored links</TableHead>
            <TableHead>Error</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.runs.map((run) => {
            const errorLabel =
              run.status === "error"
                ? [run.errorName, run.errorTag, run.errorMessage]
                    .filter((value) => typeof value === "string" && value)
                    .join(" · ")
                : "";

            return (
              <TableRow key={run.id}>
                <TableCell>{formatStatus(run.status, run.isStale)}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatUtcDateTime(run.startedAt)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {run.finishedAt ? formatUtcDateTime(run.finishedAt) : "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatUtcDateTime(run.lastHeartbeatAt)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {run.progress.fetchedEmails}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {run.progress.processedEmails}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {run.progress.insertedEmails}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {run.progress.storedLinks}
                </TableCell>
                <TableCell className="max-w-[360px] truncate text-muted-foreground text-sm">
                  {errorLabel || "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
