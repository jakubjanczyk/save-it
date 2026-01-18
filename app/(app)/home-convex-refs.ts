import type { FunctionReference } from "convex/server";
import { makeFunctionReference } from "convex/server";
import type { GenericId } from "convex/values";

export interface EmailListItem {
  _id: GenericId<"emails">;
  extractionError: boolean;
  from: string;
  gmailId: string;
  pendingLinkCount: number;
  receivedAt: number;
  subject: string;
}

export interface LinkDoc {
  _id: GenericId<"links">;
  description: string;
  emailId: GenericId<"emails">;
  raindropId?: string;
  savedAt?: number;
  status: "pending" | "processing" | "saved" | "discarded";
  title: string;
  url: string;
}

export const startFetchFromGmail: FunctionReference<
  "action",
  "public",
  Record<string, never>,
  null
> = makeFunctionReference("emails:startFetchFromGmail");

export const getActiveSyncRun: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  {
    isStale: boolean;
    run: {
      id: GenericId<"syncRuns">;
      lastHeartbeatAt: number;
      progress: {
        fetchedEmails: number;
        insertedEmails: number;
        processedEmails: number;
        storedLinks: number;
      };
      startedAt: number;
      status: "running";
    };
  } | null
> = makeFunctionReference("syncruns:getActive");

export const listWithPendingLinks: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  EmailListItem[]
> = makeFunctionReference("emails:listWithPendingLinks");

export const markEmailAsRead: FunctionReference<
  "action",
  "public",
  { emailId: GenericId<"emails"> },
  { discarded: number }
> = makeFunctionReference("emails:markAsRead");

export const archiveEmail: FunctionReference<
  "action",
  "public",
  { emailId: GenericId<"emails"> },
  { discarded: number }
> = makeFunctionReference("emails:archive");

export const listLinksByEmail: FunctionReference<
  "query",
  "public",
  { emailId: GenericId<"emails"> },
  LinkDoc[]
> = makeFunctionReference("links:listByEmail");

export const discardLink: FunctionReference<
  "action",
  "public",
  { linkId: GenericId<"links"> },
  null
> = makeFunctionReference("links:discard");

export const listPendingFocus: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  Array<{
    description: string;
    email: {
      from: string;
      id: GenericId<"emails">;
      receivedAt: number;
      subject: string;
    };
    id: GenericId<"links">;
    title: string;
    url: string;
  }>
> = makeFunctionReference("links:listPendingFocus");

export const countPendingFocus: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  number
> = makeFunctionReference("links:countPendingFocus");

export const listPendingFocusBatch: FunctionReference<
  "query",
  "public",
  { excludeIds?: GenericId<"links">[]; limit: number },
  Array<{
    description: string;
    email: {
      from: string;
      id: GenericId<"emails">;
      receivedAt: number;
      subject: string;
    };
    id: GenericId<"links">;
    title: string;
    url: string;
  }>
> = makeFunctionReference("links:listPendingFocusBatch");

export const saveLink: FunctionReference<
  "action",
  "public",
  { linkId: GenericId<"links"> },
  { raindropId: string | null }
> = makeFunctionReference("links:save");
