import { fetchQuery } from "convex/nextjs";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireEnv } from "@/lib/require-env";

import { listSyncRuns, type SyncRunStatus } from "./convex-refs";
import { SyncRunsClient } from "./page-client";

export const dynamic = "force-dynamic";

interface SyncRunsSearchParams {
  status?: string | string[];
}

async function resolveSearchParams(
  value: SyncRunsSearchParams | Promise<SyncRunsSearchParams> | undefined
) {
  return value ? await value : undefined;
}

function firstSearchParamValue(value: string | string[] | undefined) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return undefined;
}

function parseStatus(value: string | undefined): SyncRunStatus | undefined {
  if (
    value === "running" ||
    value === "success" ||
    value === "error" ||
    value === "aborted"
  ) {
    return value;
  }

  return undefined;
}

export default async function SyncRunsPage(props: {
  searchParams?: SyncRunsSearchParams | Promise<SyncRunsSearchParams>;
}) {
  const searchParams = await resolveSearchParams(props.searchParams);
  const status = parseStatus(firstSearchParamValue(searchParams?.status));

  const convexUrl = requireEnv("NEXT_PUBLIC_CONVEX_URL");
  const runs = await fetchQuery(listSyncRuns, status ? { status } : {}, {
    url: convexUrl,
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Sync runs</h1>
        <p className="text-muted-foreground text-sm">
          Track sync execution and progress over time.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <SyncRunsClient runs={runs} />
        </CardContent>
      </Card>
    </div>
  );
}
