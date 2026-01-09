import type { GenericId } from "convex/values";

export function getEmailIdParam(param: unknown): GenericId<"emails"> | null {
  if (typeof param === "string" && param.length > 0) {
    return param as GenericId<"emails">;
  }

  return null;
}
