"use client";

import { useAction } from "convex/react";
import type { GenericId } from "convex/values";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { SyncLogsTable } from "@/components/sync-logs/sync-logs-table";
import { Button } from "@/components/ui/button";

import {
  retrySyncEmail,
  type SyncLogRow,
  type SyncLogStatus,
} from "./convex-refs";

type FilterStatus = "all" | SyncLogStatus;

function toHref(status: FilterStatus) {
  if (status === "all") {
    return "/sync-logs";
  }

  return `/sync-logs?status=${status}`;
}

export function SyncLogsClient(props: {
  logs: SyncLogRow[];
  status: FilterStatus;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeStatus = (() => {
    const value = searchParams.get("status");
    if (value === "success" || value === "error") {
      return value;
    }
    return "all";
  })();
  const retry = useAction(retrySyncEmail);
  const [retryingEmailId, setRetryingEmailId] =
    useState<GenericId<"emails"> | null>(null);

  const onRetry = async (emailId: GenericId<"emails">) => {
    if (retryingEmailId) {
      return;
    }

    setRetryingEmailId(emailId);
    try {
      const result = await retry({ emailId });
      toast.success(
        result.status === "success"
          ? `Retry succeeded (${result.storedLinkCount} links).`
          : "Retry failed."
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Retry failed.");
    } finally {
      setRetryingEmailId(null);
    }
  };

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
          <Link href={toHref("error")}>Failed</Link>
        </Button>
      </div>

      <SyncLogsTable
        logs={props.logs}
        onRetry={onRetry}
        retryingEmailId={retryingEmailId}
      />
    </div>
  );
}
