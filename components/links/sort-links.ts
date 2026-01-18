type LinkStatus = "pending" | "processing" | "saved" | "discarded";

function statusRank(status: LinkStatus): number {
  if (status === "pending") {
    return 0;
  }

  if (status === "processing") {
    return 1;
  }

  return 2;
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
