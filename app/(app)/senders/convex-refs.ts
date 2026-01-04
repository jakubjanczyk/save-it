import type { FunctionReference } from "convex/server";
import { makeFunctionReference } from "convex/server";
import type { GenericId } from "convex/values";

export interface SenderDoc {
  _id: GenericId<"senders">;
  createdAt: number;
  email: string;
  name?: string;
}

export const addSender: FunctionReference<
  "mutation",
  "public",
  { email: string; name?: string },
  GenericId<"senders">
> = makeFunctionReference("senders:addSender");

export const listSenders: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  SenderDoc[]
> = makeFunctionReference("senders:listSenders");

export const removeSender: FunctionReference<
  "mutation",
  "public",
  { senderId: GenericId<"senders"> },
  null
> = makeFunctionReference("senders:removeSender");
