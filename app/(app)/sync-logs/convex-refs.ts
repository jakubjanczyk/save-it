import type { FunctionReference } from "convex/server";
import { makeFunctionReference } from "convex/server";
import type { GenericId } from "convex/values";

export type SyncLogStatus = "success" | "error";

export interface SyncLogRow {
  _id: GenericId<"syncLogs">;
  attemptedAt: number;
  emailId: GenericId<"emails">;
  extractedLinkCount: number;
  from: string;
  gmailId: string;
  receivedAt: number;
  status: SyncLogStatus;
  storedLinkCount: number;
  subject: string;
}

export const listSyncLogs: FunctionReference<
  "query",
  "public",
  { status?: SyncLogStatus },
  SyncLogRow[]
> = makeFunctionReference("sync/logs:list");

export const retrySyncEmail: FunctionReference<
  "action",
  "public",
  { emailId: GenericId<"emails"> },
  { status: SyncLogStatus; storedLinkCount: number }
> = makeFunctionReference("emails:retrySyncEmail");
