"use client";

import type { GenericId } from "convex/values";
import { useEffect, useMemo, useState } from "react";

export interface SelectableLink {
  description: string;
  id: GenericId<"links">;
  status: "pending" | "processing" | "saved" | "discarded";
  title: string;
  url: string;
}

export interface LinkSelectionState {
  pendingLinkIds: GenericId<"links">[];
  selectedLink: SelectableLink | null;
  selectedLinkId: GenericId<"links"> | null;
  selectNextLink: () => void;
  selectPrevLink: () => void;
  setSelectedLinkId: (linkId: GenericId<"links"> | null) => void;
}

export function useLinkSelection(listViewLinks: readonly SelectableLink[]) {
  const pendingLinkIds = useMemo(
    () =>
      listViewLinks
        .filter((link) => link.status === "pending")
        .map((link) => link.id),
    [listViewLinks]
  );

  const [selectedLinkId, setSelectedLinkId] =
    useState<GenericId<"links"> | null>(null);

  useEffect(() => {
    if (pendingLinkIds.length === 0) {
      setSelectedLinkId(null);
      return;
    }

    if (!(selectedLinkId && pendingLinkIds.includes(selectedLinkId))) {
      setSelectedLinkId(pendingLinkIds[0] ?? null);
    }
  }, [pendingLinkIds, selectedLinkId]);

  const selectedLink = useMemo(() => {
    if (!selectedLinkId) {
      return null;
    }

    return listViewLinks.find((link) => link.id === selectedLinkId) ?? null;
  }, [listViewLinks, selectedLinkId]);

  const selectNextLink = () => {
    if (pendingLinkIds.length === 0) {
      return;
    }

    const current = selectedLinkId ?? pendingLinkIds[0];
    const currentIndex = current ? pendingLinkIds.indexOf(current) : -1;
    const nextIndex = Math.min(pendingLinkIds.length - 1, currentIndex + 1);
    setSelectedLinkId(pendingLinkIds[nextIndex] ?? pendingLinkIds[0] ?? null);
  };

  const selectPrevLink = () => {
    if (pendingLinkIds.length === 0) {
      return;
    }

    const current = selectedLinkId ?? pendingLinkIds[0];
    const currentIndex = current ? pendingLinkIds.indexOf(current) : -1;
    const prevIndex = Math.max(0, currentIndex - 1);
    setSelectedLinkId(pendingLinkIds[prevIndex] ?? pendingLinkIds[0] ?? null);
  };

  return {
    pendingLinkIds,
    selectedLink,
    selectedLinkId,
    selectNextLink,
    selectPrevLink,
    setSelectedLinkId,
  } satisfies LinkSelectionState;
}
