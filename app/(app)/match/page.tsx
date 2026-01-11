import { fetchQuery } from "convex/nextjs";

import { requireEnv } from "@/lib/require-env";

import { countPendingFocus, listPendingFocusBatch } from "../home-convex-refs";

import { FocusClient } from "./page-client";
import type { FocusSearchParams } from "./search-params";
import { resolveRequestedLinkId } from "./search-params";

export const dynamic = "force-dynamic";

export default async function MatchPage(props: {
  searchParams?: FocusSearchParams | Promise<FocusSearchParams>;
}) {
  const convexUrl = requireEnv("NEXT_PUBLIC_CONVEX_URL");
  const [items, remainingCount] = await Promise.all([
    fetchQuery(listPendingFocusBatch, { limit: 10 }, { url: convexUrl }),
    fetchQuery(countPendingFocus, {}, { url: convexUrl }),
  ]);
  const requestedLinkId = await resolveRequestedLinkId(props.searchParams);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Match</h1>
        <p className="hidden text-muted-foreground text-sm sm:block">
          Save or discard links one by one. Press ? for shortcuts.
        </p>
      </div>

      <FocusClient
        items={items}
        remainingCount={remainingCount}
        requestedLinkId={requestedLinkId}
      />
    </div>
  );
}
