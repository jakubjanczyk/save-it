"use client";

import { useAction } from "convex/react";
import { type FunctionReference, makeFunctionReference } from "convex/server";

import { FetchEmailsCard } from "@/components/fetch-emails-card";

const fetchFromGmail: FunctionReference<
  "action",
  "public",
  Record<string, never>,
  { fetched: number }
> = makeFunctionReference("emails:fetchFromGmail");

export function HomeClient() {
  const runFetch = useAction(fetchFromGmail);

  return (
    <FetchEmailsCard
      onFetch={async () => {
        return await runFetch({});
      }}
    />
  );
}
