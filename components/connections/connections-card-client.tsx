"use client";

import { useQuery } from "convex/react";

import { ConnectionsCard } from "@/components/connections/connections-card";
import {
  type GoogleConnectionStatus,
  getGoogleConnectionStatus,
  getRaindropTokens,
} from "@/components/connections/convex-refs";
import { formatGmailConnectionError } from "@/components/connections/format-gmail-connection-error";

export function ConnectionsCardClient(props: {
  initialGmailStatus: GoogleConnectionStatus;
  initialRaindropConnected: boolean;
}) {
  const gmailStatus = useQuery(getGoogleConnectionStatus, {});
  const raindropTokens = useQuery(getRaindropTokens, {});
  const resolvedGmailStatus = gmailStatus ?? props.initialGmailStatus;
  const resolvedRaindropConnected =
    raindropTokens === undefined
      ? props.initialRaindropConnected
      : raindropTokens !== null;
  const gmailErrorMessage = formatGmailConnectionError(resolvedGmailStatus);

  return (
    <ConnectionsCard
      gmailConnected={resolvedGmailStatus.connected}
      gmailErrorMessage={gmailErrorMessage}
      raindropConnected={resolvedRaindropConnected}
    />
  );
}
