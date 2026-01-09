import type { GenericId } from "convex/values";

export function getEmailIdParam(param: unknown): GenericId<"emails"> | null {
  if (typeof param === "string" && param.length > 0) {
    return param as GenericId<"emails">;
  }

  if (Array.isArray(param) && typeof param[0] === "string" && param[0].length) {
    return param[0] as GenericId<"emails">;
  }

  return null;
}
