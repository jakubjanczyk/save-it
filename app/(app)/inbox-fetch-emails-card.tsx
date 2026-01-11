"use client";

import { useAction, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { FetchEmailsCard } from "@/components/fetch-emails-card";

import { getActiveSyncRun, startFetchFromGmail } from "./home-convex-refs";

export function InboxFetchEmailsCard() {
  const router = useRouter();
  const runFetch = useAction(startFetchFromGmail);
  const activeSync = useQuery(getActiveSyncRun, {});
  const isRunning = activeSync?.isStale === false;

  useEffect(() => {
    if (isRunning) {
      router.refresh();
    }
  }, [isRunning, router]);

  return <FetchEmailsCard isRunning={isRunning} onFetch={() => runFetch({})} />;
}
