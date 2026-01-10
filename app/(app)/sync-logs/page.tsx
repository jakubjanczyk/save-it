import { fetchQuery } from "convex/nextjs";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireEnv } from "@/lib/require-env";

import { listSyncLogs, type SyncLogStatus } from "./convex-refs";
import { SyncLogsClient } from "./page-client";

export const dynamic = "force-dynamic";

interface SyncLogsSearchParams {
  status?: string | string[];
}

async function resolveSearchParams(
  value: SyncLogsSearchParams | Promise<SyncLogsSearchParams> | undefined
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

function parseStatus(value: string | undefined): SyncLogStatus | undefined {
  if (value === "success" || value === "error") {
    return value;
  }

  return undefined;
}

export default async function SyncLogsPage(props: {
  searchParams?: SyncLogsSearchParams | Promise<SyncLogsSearchParams>;
}) {
  const searchParams = await resolveSearchParams(props.searchParams);
  const status = parseStatus(firstSearchParamValue(searchParams?.status));

  const convexUrl = requireEnv("NEXT_PUBLIC_CONVEX_URL");
  const logs = await fetchQuery(listSyncLogs, status ? { status } : {}, {
    url: convexUrl,
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Sync logs</h1>
        <p className="text-muted-foreground text-sm">
          Track email sync attempts and retry failures.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Emails</CardTitle>
        </CardHeader>
        <CardContent>
          <SyncLogsClient logs={logs} status={status ?? "all"} />
        </CardContent>
      </Card>
    </div>
  );
}
