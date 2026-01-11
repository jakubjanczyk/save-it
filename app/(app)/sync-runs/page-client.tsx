"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { SyncRunsTable } from "@/components/sync-runs/sync-runs-table";
import { Button } from "@/components/ui/button";

import type { SyncRunRow, SyncRunStatus } from "./convex-refs";

type FilterStatus = "all" | SyncRunStatus;

function toHref(status: FilterStatus) {
  if (status === "all") {
    return "/sync-runs";
  }

  return `/sync-runs?status=${status}`;
}

function readActiveStatus(value: string | null): FilterStatus {
  if (
    value === "running" ||
    value === "success" ||
    value === "error" ||
    value === "aborted"
  ) {
    return value;
  }

  return "all";
}

export function SyncRunsClient(props: { runs: SyncRunRow[] }) {
  const searchParams = useSearchParams();
  const activeStatus = readActiveStatus(searchParams.get("status"));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          asChild
          className="h-8"
          size="sm"
          variant={activeStatus === "all" ? "default" : "outline"}
        >
          <Link href={toHref("all")}>All</Link>
        </Button>
        <Button
          asChild
          className="h-8"
          size="sm"
          variant={activeStatus === "running" ? "default" : "outline"}
        >
          <Link href={toHref("running")}>Running</Link>
        </Button>
        <Button
          asChild
          className="h-8"
          size="sm"
          variant={activeStatus === "success" ? "default" : "outline"}
        >
          <Link href={toHref("success")}>Success</Link>
        </Button>
        <Button
          asChild
          className="h-8"
          size="sm"
          variant={activeStatus === "error" ? "default" : "outline"}
        >
          <Link href={toHref("error")}>Error</Link>
        </Button>
        <Button
          asChild
          className="h-8"
          size="sm"
          variant={activeStatus === "aborted" ? "default" : "outline"}
        >
          <Link href={toHref("aborted")}>Aborted</Link>
        </Button>
      </div>

      <SyncRunsTable runs={props.runs} />
    </div>
  );
}
