type LinkStatus = "pending" | "saved" | "discarded";

function statusRank(status: LinkStatus): number {
  return status === "pending" ? 0 : 1;
}

export function sortLinksByStatus<TLink extends { status: LinkStatus }>(
  links: readonly TLink[]
): TLink[] {
  return [...links].sort((a, b) => {
    const rankDiff = statusRank(a.status) - statusRank(b.status);
    if (rankDiff !== 0) {
      return rankDiff;
    }

    return a.status.localeCompare(b.status);
  });
}
