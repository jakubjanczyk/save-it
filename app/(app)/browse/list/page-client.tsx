"use client";

import { useAction, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";

import { parseRaindropSyncEnabled } from "@/lib/settings";
import { RAINDROP_SYNC_ENABLED_SETTING_KEY } from "@/lib/settings-keys";

import { BrowseEmpty } from "../browse-empty";
import { BrowseList } from "../browse-list";
import { BrowseLoading } from "../browse-loading";
import { parseSortOrder } from "../browse-search-params";
import { BrowseShortcuts } from "../browse-shortcuts";
import {
  archiveLink,
  getSetting,
  type SavedLinkItem,
  sendToRaindrop,
  toggleFavoriteAction,
} from "../convex-refs";
import { useBrowseSavedLinksPager } from "../use-browse-saved-links-pager";

export function BrowseListPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sortOrder = parseSortOrder(searchParams.get("order"));

  const saved = useBrowseSavedLinksPager({ sortOrder });

  const archive = useAction(archiveLink);
  const toggleFavorite = useAction(toggleFavoriteAction);
  const sendToRaindropAction = useAction(sendToRaindrop);

  const storedSyncEnabled = useQuery(getSetting, {
    key: RAINDROP_SYNC_ENABLED_SETTING_KEY,
  });
  const syncEnabled = parseRaindropSyncEnabled(storedSyncEnabled ?? null);

  const deckHref = useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `/browse/deck?${qs}` : "/browse/deck";
  }, [searchParams]);

  const handleSendToRaindrop = async (item: SavedLinkItem) => {
    try {
      const result = await sendToRaindropAction({ linkId: item.id });
      saved.updateItem(item.id, { raindropId: result.raindropId });
      toast.success("Sent to Raindrop");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send to Raindrop"
      );
    }
  };

  const handleArchive = async (item: SavedLinkItem) => {
    try {
      await archive({ linkId: item.id });
      saved.removeItem(item.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Archive failed");
    }
  };

  const handleFavorite = async (item: SavedLinkItem) => {
    let previousIsFavorite: boolean | null = null;
    saved.updateItem(item.id, (previous) => {
      previousIsFavorite = previous.isFavorite;
      return { ...previous, isFavorite: !previous.isFavorite };
    });

    try {
      const result = await toggleFavorite({ linkId: item.id });
      saved.updateItem(item.id, { isFavorite: result.isFavorite });
    } catch (error) {
      if (previousIsFavorite !== null) {
        saved.updateItem(item.id, { isFavorite: previousIsFavorite });
      }
      toast.error(
        error instanceof Error ? error.message : "Toggle favorite failed"
      );
    }
  };

  if (saved.initialLoading) {
    return <BrowseLoading />;
  }

  if (saved.items.length === 0 && saved.isDone) {
    return <BrowseEmpty />;
  }

  return (
    <div className="grid gap-4">
      <BrowseShortcuts
        enabled={true}
        handlers={{ toggleView: () => router.push(deckHref) }}
      />
      <div className="flex items-center justify-between">
        <span className="shrink-0 rounded bg-primary/20 px-2 py-1 font-medium text-foreground text-xs">
          {saved.items.length} loaded
        </span>
      </div>
      <BrowseList
        continueCursor={saved.continueCursor}
        hasPreviousPage={saved.hasPreviousPage}
        isDone={saved.isDone}
        items={saved.items}
        loading={saved.loading}
        onArchive={handleArchive}
        onFavorite={handleFavorite}
        onLoadMore={saved.nextPage}
        onPreviousPage={saved.previousPage}
        onSendToRaindrop={syncEnabled ? handleSendToRaindrop : undefined}
        showSendToRaindrop={syncEnabled}
      />
    </div>
  );
}
