"use client";

import { useAction } from "convex/react";
import { useRouter } from "next/navigation";

import { FetchEmailsCard } from "@/components/fetch-emails-card";

import { fetchFromGmail } from "./home-convex-refs";

export function InboxFetchEmailsCard() {
  const router = useRouter();
  const runFetch = useAction(fetchFromGmail);

  return (
    <FetchEmailsCard
      onFetch={async () => {
        const result = await runFetch({});
        router.refresh();
        return result;
      }}
    />
  );
}
