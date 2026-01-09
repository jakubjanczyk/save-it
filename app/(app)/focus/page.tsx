import { fetchQuery } from "convex/nextjs";

import { requireEnv } from "@/lib/require-env";

import { listPendingFocus } from "../home-convex-refs";

import { FocusClient } from "./page-client";

export const dynamic = "force-dynamic";

export default async function FocusPage(props: {
  searchParams?: { linkId?: string };
}) {
  const convexUrl = requireEnv("NEXT_PUBLIC_CONVEX_URL");
  const items = await fetchQuery(listPendingFocus, {}, { url: convexUrl });
  const requestedLinkId =
    typeof props.searchParams?.linkId === "string"
      ? props.searchParams.linkId
      : null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Focus</h1>
        <p className="text-muted-foreground text-sm">
          Save or discard links one by one. Press ? for shortcuts.
        </p>
      </div>

      <FocusClient items={items} requestedLinkId={requestedLinkId} />
    </div>
  );
}
