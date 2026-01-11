import type { FunctionReference } from "convex/server";
import { makeFunctionReference } from "convex/server";
import type { GenericId } from "convex/values";

export type SyncRunStatus = "running" | "success" | "error" | "aborted";

export interface SyncRunRow {
  errorMessage?: string;
  errorName?: string;
  errorTag?: string;
  finishedAt?: number;
  id: GenericId<"syncRuns">;
  isStale: boolean;
  lastHeartbeatAt: number;
  progress: {
    fetchedEmails: number;
    insertedEmails: number;
    processedEmails: number;
    storedLinks: number;
  };
  startedAt: number;
  status: SyncRunStatus;
}

export const listSyncRuns: FunctionReference<
  "query",
  "public",
  { limit?: number; status?: SyncRunStatus },
  SyncRunRow[]
> = makeFunctionReference("syncruns:list");
