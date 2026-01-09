"use client";

import type { GenericId } from "convex/values";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export interface LinkActionHandlers {
  actionBusy: boolean;
  discardSelected: () => Promise<void>;
  discardWithSelection: (linkId: GenericId<"links">) => Promise<void>;
  saveSelected: () => Promise<void>;
  saveWithSelection: (linkId: GenericId<"links">) => Promise<void>;
}

export function useLinkActions(params: {
  discard: (args: { linkId: GenericId<"links"> }) => Promise<unknown>;
  save: (args: { linkId: GenericId<"links"> }) => Promise<unknown>;
  selectedLinkId: GenericId<"links"> | null;
  setSelectedLinkId: (linkId: GenericId<"links"> | null) => void;
}): LinkActionHandlers {
  const { discard, save, selectedLinkId, setSelectedLinkId } = params;
  const [actionBusy, setActionBusy] = useState(false);

  const discardWithSelection = useCallback(
    async (linkId: GenericId<"links">) => {
      if (actionBusy) {
        return;
      }

      setSelectedLinkId(linkId);
      try {
        setActionBusy(true);
        await discard({ linkId });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Discard failed");
      } finally {
        setActionBusy(false);
      }
    },
    [actionBusy, discard, setSelectedLinkId]
  );

  const saveWithSelection = useCallback(
    async (linkId: GenericId<"links">) => {
      if (actionBusy) {
        return;
      }

      setSelectedLinkId(linkId);
      try {
        setActionBusy(true);
        await save({ linkId });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Save failed");
      } finally {
        setActionBusy(false);
      }
    },
    [actionBusy, save, setSelectedLinkId]
  );

  const discardSelected = useCallback(async () => {
    const selected = selectedLinkId;
    if (!selected || actionBusy) {
      return;
    }

    try {
      setActionBusy(true);
      await discard({ linkId: selected });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Discard failed");
    } finally {
      setActionBusy(false);
    }
  }, [actionBusy, discard, selectedLinkId]);

  const saveSelected = useCallback(async () => {
    const selected = selectedLinkId;
    if (!selected || actionBusy) {
      return;
    }

    try {
      setActionBusy(true);
      await save({ linkId: selected });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setActionBusy(false);
    }
  }, [actionBusy, save, selectedLinkId]);

  return {
    actionBusy,
    discardSelected,
    discardWithSelection,
    saveSelected,
    saveWithSelection,
  };
}
