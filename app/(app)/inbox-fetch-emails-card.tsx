"use client";

import { useAction, useQuery } from "convex/react";
import { useRouter } from "next/navigation";

import { FetchEmailsCard } from "@/components/fetch-emails-card";

import { fetchFromGmail, getActiveSyncRun } from "./home-convex-refs";

export function InboxFetchEmailsCard() {
  const router = useRouter();
  const runFetch = useAction(fetchFromGmail);
  const activeSync = useQuery(getActiveSyncRun, {});
  const isRunning = activeSync?.isStale === false;

  return (
    <FetchEmailsCard
      disabled={isRunning}
      onFetch={async () => {
        const result = await runFetch({});
        router.refresh();
        return result;
      }}
    />
  );
}
