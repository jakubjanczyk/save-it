export type SortOrder = "oldest" | "newest";

export function parseSortOrder(value: string | null | undefined): SortOrder {
  if (value === "oldest") {
    return "oldest";
  }
  return "newest";
}
