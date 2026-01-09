import type { GenericId } from "convex/values";

export function getActiveLinkId(
  value: string | null
): GenericId<"links"> | null {
  if (typeof value === "string" && value.length > 0) {
    return value as GenericId<"links">;
  }
  return null;
}

export function getActiveIndex<Item extends { id: GenericId<"links"> }>(
  items: readonly Item[] | undefined,
  requestedLinkId: GenericId<"links"> | null
): number {
  if (!items || items.length === 0) {
    return -1;
  }

  if (!requestedLinkId) {
    return 0;
  }

  return items.findIndex((item) => item.id === requestedLinkId);
}

export function getNeighborLinkId<Item extends { id: GenericId<"links"> }>(
  items: readonly Item[],
  activeIndex: number
): GenericId<"links"> | null {
  if (activeIndex < 0) {
    return null;
  }

  return items[activeIndex + 1]?.id ?? items[activeIndex - 1]?.id ?? null;
}
