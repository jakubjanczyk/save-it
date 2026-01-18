"use client";

import { useAction, useQuery } from "convex/react";

import { FetchEmailsCard } from "@/components/fetch-emails-card";

import { getActiveSyncRun, startFetchFromGmail } from "./home-convex-refs";

export function InboxFetchEmailsCard() {
  const runFetch = useAction(startFetchFromGmail);
  const activeSync = useQuery(getActiveSyncRun, {});
  const isRunning = activeSync?.isStale === false;

  return <FetchEmailsCard isRunning={isRunning} onFetch={() => runFetch({})} />;
}
