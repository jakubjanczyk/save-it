"use client";

import { useAction, useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { getGoogleConnectionStatus } from "@/components/connections/convex-refs";
import { FetchEmailsCard } from "@/components/fetch-emails-card";

import { getActiveSyncRun, startFetchFromGmail } from "./home-convex-refs";

function formatGmailConnectionErrorMessage(status: {
  errorMessage: string | null;
  errorTag: string | null;
}) {
  if (status.errorTag === "GmailTokenExpired") {
    return "Gmail connection expired. Reconnect in Settings.";
  }

  if (status.errorTag === "GmailTokenRefreshFailed") {
    return "Gmail token refresh failed. Reconnect in Settings.";
  }

  return (
    status.errorMessage ?? "Gmail connection error. Reconnect in Settings."
  );
}

export function InboxFetchEmailsCard() {
  const runFetch = useAction(startFetchFromGmail);
  const activeSync = useQuery(getActiveSyncRun, {});
  const gmailStatus = useQuery(getGoogleConnectionStatus, {});
  const lastErrorAtRef = useRef<number | null>(null);
  const isRunning = activeSync?.isStale === false;

  useEffect(() => {
    if (!gmailStatus?.errorAt) {
      return;
    }

    if (lastErrorAtRef.current === gmailStatus.errorAt) {
      return;
    }

    lastErrorAtRef.current = gmailStatus.errorAt;
    toast.error(formatGmailConnectionErrorMessage(gmailStatus));
  }, [gmailStatus]);

  return <FetchEmailsCard isRunning={isRunning} onFetch={() => runFetch({})} />;
}
