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
  status: "pending" | "saved" | "discarded";
  title: string;
  url: string;
}

export const fetchFromGmail: FunctionReference<
  "action",
  "public",
  Record<string, never>,
  { fetched: number }
> = makeFunctionReference("emails:fetchFromGmail");

export const listWithPendingLinks: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  EmailListItem[]
> = makeFunctionReference("emails:listWithPendingLinks");

export const listLinksByEmail: FunctionReference<
  "query",
  "public",
  { emailId: GenericId<"emails"> },
  LinkDoc[]
> = makeFunctionReference("links:listByEmail");

export const discardLink: FunctionReference<
  "mutation",
  "public",
  { linkId: GenericId<"links"> },
  null
> = makeFunctionReference("links:discard");
