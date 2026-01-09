"use client";

import type { GenericId } from "convex/values";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const { discard, save, selectedLinkId, setSelectedLinkId } = params;
  const [actionBusy, setActionBusy] = useState(false);

  const discardWithSelection = useCallback(
    async (linkId: GenericId<"links">) => {
      if (actionBusy) {
        return;
      }

      setSelectedLinkId(linkId);
      let succeeded = false;
      try {
        setActionBusy(true);
        await discard({ linkId });
        succeeded = true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Discard failed");
      } finally {
        setActionBusy(false);
      }

      if (succeeded) {
        router.refresh();
      }
    },
    [actionBusy, discard, router, setSelectedLinkId]
  );

  const saveWithSelection = useCallback(
    async (linkId: GenericId<"links">) => {
      if (actionBusy) {
        return;
      }

      setSelectedLinkId(linkId);
      let succeeded = false;
      try {
        setActionBusy(true);
        await save({ linkId });
        succeeded = true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Save failed");
      } finally {
        setActionBusy(false);
      }

      if (succeeded) {
        router.refresh();
      }
    },
    [actionBusy, router, save, setSelectedLinkId]
  );

  const discardSelected = useCallback(async () => {
    const selected = selectedLinkId;
    if (!selected || actionBusy) {
      return;
    }

    let succeeded = false;
    try {
      setActionBusy(true);
      await discard({ linkId: selected });
      succeeded = true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Discard failed");
    } finally {
      setActionBusy(false);
    }

    if (succeeded) {
      router.refresh();
    }
  }, [actionBusy, discard, router, selectedLinkId]);

  const saveSelected = useCallback(async () => {
    const selected = selectedLinkId;
    if (!selected || actionBusy) {
      return;
    }

    let succeeded = false;
    try {
      setActionBusy(true);
      await save({ linkId: selected });
      succeeded = true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setActionBusy(false);
    }

    if (succeeded) {
      router.refresh();
    }
  }, [actionBusy, router, save, selectedLinkId]);

  return {
    actionBusy,
    discardSelected,
    discardWithSelection,
    saveSelected,
    saveWithSelection,
  };
}
