import { type FunctionReference, makeFunctionReference } from "convex/server";

export const getSetting: FunctionReference<
  "query",
  "public",
  { key: string },
  string | null
> = makeFunctionReference("settings:get");

export const setSetting: FunctionReference<
  "mutation",
  "public",
  { key: string; value: string },
  null
> = makeFunctionReference("settings:set");
