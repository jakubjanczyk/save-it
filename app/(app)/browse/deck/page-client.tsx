"use client";

import { useAction, useQuery } from "convex/react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { parseRaindropSyncEnabled } from "@/lib/settings";
import { RAINDROP_SYNC_ENABLED_SETTING_KEY } from "@/lib/settings-keys";

import { BrowseDeck } from "../browse-deck";
import { BrowseEmpty } from "../browse-empty";
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
import { useBrowseDeckController } from "../use-browse-deck-controller";
import { useBrowseSavedLinks } from "../use-browse-saved-links";

export function BrowseDeckPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sortOrder = parseSortOrder(searchParams.get("order"));

  const saved = useBrowseSavedLinks({ sortOrder });

  const archive = useAction(archiveLink);
  const toggleFavorite = useAction(toggleFavoriteAction);
  const sendToRaindropAction = useAction(sendToRaindrop);

  const storedSyncEnabled = useQuery(getSetting, {
    key: RAINDROP_SYNC_ENABLED_SETTING_KEY,
  });
  const syncEnabled = parseRaindropSyncEnabled(storedSyncEnabled ?? null);

  const listHref = useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `/browse/list?${qs}` : "/browse/list";
  }, [searchParams]);

  const controller = useBrowseDeckController({
    archive: async (args) => {
      await archive(args);
      saved.removeItem(args.linkId);
      return null;
    },
    loadMore: saved.loadMore,
    savedItems: saved.items,
    toggleFavorite: async (args) => {
      let previousIsFavorite: boolean | null = null;
      saved.updateItem(args.linkId, (previous) => {
        previousIsFavorite = previous.isFavorite;
        return { ...previous, isFavorite: !previous.isFavorite };
      });

      try {
        const result = await toggleFavorite(args);
        saved.updateItem(args.linkId, { isFavorite: result.isFavorite });
        return result;
      } catch (error) {
        if (previousIsFavorite !== null) {
          saved.updateItem(args.linkId, { isFavorite: previousIsFavorite });
        }
        throw error;
      }
    },
  });

  const activeItem =
    controller.state.archiving?.item ??
    controller.state.navigating?.item ??
    controller.state.shownItem;

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

  if (saved.initialLoading) {
    return <BrowseLoading />;
  }

  if (!activeItem && saved.items.length === 0 && saved.isDone) {
    return <BrowseEmpty />;
  }

  return (
    <div className="grid gap-4">
      <BrowseShortcuts
        enabled={controller.handlers.shortcutsEnabled}
        onArchive={controller.handlers.archiveCurrent}
        onArchiveLeft={controller.handlers.archiveCurrentLeft}
        onArchiveRight={controller.handlers.archiveCurrentRight}
        onFavorite={controller.handlers.favoriteCurrent}
        onNextCard={controller.handlers.nextCard}
        onOpen={controller.handlers.openCurrent}
        onPreviousCard={controller.handlers.previousCard}
        onToggleView={() => router.push(listHref)}
      />
      <div className="flex items-center justify-end gap-2">
        <Button
          disabled={!controller.state.canPrevious}
          onClick={() => controller.handlers.previousCard(-1)}
          size="icon"
          title="Previous card"
          variant="outline"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          disabled={!controller.state.canNext}
          onClick={() => controller.handlers.nextCard(1)}
          size="icon"
          title="Next card"
          variant="outline"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      </div>
      {activeItem ? (
        <BrowseDeck
          dismissing={controller.state.archiving}
          navigating={controller.state.navigating}
          onArchive={controller.handlers.archiveCurrent}
          onDismissAnimationComplete={
            controller.handlers.onDismissAnimationComplete
          }
          onFavorite={controller.handlers.favoriteCurrent}
          onNavigateAnimationComplete={
            controller.handlers.onNavigateAnimationComplete
          }
          onNextCard={controller.handlers.nextCard}
          onPreviousCard={controller.handlers.previousCard}
          onSendToRaindrop={
            syncEnabled && !activeItem.raindropId
              ? () => handleSendToRaindrop(activeItem)
              : undefined
          }
          peekItem={controller.state.peekItem}
          remainingCount={controller.state.remainingCount}
          shownItem={controller.state.shownItem}
          showSendToRaindrop={syncEnabled}
        />
      ) : (
        <BrowseLoading />
      )}
    </div>
  );
}
