"use client";

import { useAction, useQuery } from "convex/react";
import { ArrowDownAZ, ArrowUpZA, LayoutGrid, List } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { parseRaindropSyncEnabled } from "@/lib/settings";
import { RAINDROP_SYNC_ENABLED_SETTING_KEY } from "@/lib/settings-keys";

import { BrowseDeck } from "./browse-deck";
import { BrowseEmpty } from "./browse-empty";
import { BrowseList } from "./browse-list";
import { BrowseLoading } from "./browse-loading";
import { BrowseShortcuts } from "./browse-shortcuts";
import {
  archiveLink,
  getSetting,
  listSaved,
  type SavedLinkItem,
  sendToRaindrop,
  toggleFavoriteAction,
} from "./convex-refs";
import { useBrowseDeckController } from "./use-browse-deck-controller";

type ViewMode = "deck" | "list";
type SortOrder = "oldest" | "newest";

function BrowseDeckView(props: {
  activeItem: SavedLinkItem | null;
  controller: ReturnType<typeof useBrowseDeckController>;
  onSendToRaindrop: (item: SavedLinkItem) => Promise<void>;
  setViewMode: (mode: ViewMode) => void;
  syncEnabled: boolean;
}) {
  const { activeItem, controller, syncEnabled } = props;

  return (
    <>
      <BrowseShortcuts
        enabled={controller.handlers.shortcutsEnabled}
        onArchive={controller.handlers.archiveCurrent}
        onArchiveLeft={controller.handlers.archiveCurrentLeft}
        onArchiveRight={controller.handlers.archiveCurrentRight}
        onFavorite={controller.handlers.favoriteCurrent}
        onNextCard={controller.handlers.nextCard}
        onOpen={controller.handlers.openCurrent}
        onPreviousCard={controller.handlers.previousCard}
        onToggleView={() => props.setViewMode("list")}
      />
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
              ? () => props.onSendToRaindrop(activeItem)
              : undefined
          }
          peekItem={controller.state.peekItem}
          remainingCount={controller.state.remainingCount}
          shownItem={controller.state.shownItem}
          showSendToRaindrop={syncEnabled}
        />
      ) : (
        <BrowseEmpty />
      )}
    </>
  );
}

function BrowseListView(props: {
  items: SavedLinkItem[];
  listLoading: boolean;
  onArchive: (item: SavedLinkItem) => Promise<void>;
  onFavorite: (item: SavedLinkItem) => Promise<void>;
  onLoadMore: () => void;
  onSendToRaindrop: (item: SavedLinkItem) => Promise<void>;
  savedResult: { continueCursor: string; isDone: boolean };
  setViewMode: (mode: ViewMode) => void;
  syncEnabled: boolean;
}) {
  return (
    <>
      <BrowseShortcuts
        enabled={true}
        onToggleView={() => props.setViewMode("deck")}
      />
      <BrowseList
        continueCursor={props.savedResult.continueCursor}
        isDone={props.savedResult.isDone}
        items={props.items}
        loading={props.listLoading}
        onArchive={props.onArchive}
        onFavorite={props.onFavorite}
        onLoadMore={props.onLoadMore}
        onSendToRaindrop={
          props.syncEnabled ? props.onSendToRaindrop : undefined
        }
        showSendToRaindrop={props.syncEnabled}
      />
    </>
  );
}

// TODO: refactor
export function BrowseClient() {
  const [viewMode, setViewMode] = useState<ViewMode>("deck");
  const [sortOrder, setSortOrder] = useState<SortOrder>("oldest");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [allItems, setAllItems] = useState<SavedLinkItem[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const archive = useAction(archiveLink);
  const toggleFavorite = useAction(toggleFavoriteAction);
  const sendToRaindropAction = useAction(sendToRaindrop);

  const savedResult = useQuery(listSaved, {
    cursor,
    limit: 20,
    sortOrder,
  });

  const storedSyncEnabled = useQuery(getSetting, {
    key: RAINDROP_SYNC_ENABLED_SETTING_KEY,
  });

  const syncEnabled = parseRaindropSyncEnabled(storedSyncEnabled ?? null);

  const loadMore = useCallback(() => {
    if (savedResult && !savedResult.isDone && !listLoading) {
      setListLoading(true);
      setCursor(savedResult.continueCursor);
    }
  }, [savedResult, listLoading]);

  const mergedItems = useMemo(() => {
    if (!savedResult) {
      return allItems;
    }
    const existingIds = new Set(savedResult.items.map((i) => i.id));
    return [
      ...allItems.filter((item) => !existingIds.has(item.id)),
      ...savedResult.items,
    ];
  }, [savedResult, allItems]);

  const controller = useBrowseDeckController({
    archive,
    loadMore,
    savedItems: mergedItems,
    toggleFavorite,
  });

  const handleSendToRaindrop = async (item: SavedLinkItem) => {
    try {
      await sendToRaindropAction({ linkId: item.id });
      toast.success("Sent to Raindrop");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send to Raindrop"
      );
    }
  };

  const handleArchiveInList = async (item: SavedLinkItem) => {
    try {
      await archive({ linkId: item.id });
      setAllItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Archive failed");
    }
  };

  const handleFavoriteInList = async (item: SavedLinkItem) => {
    try {
      const result = await toggleFavorite({ linkId: item.id });
      setAllItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, isFavorite: result.isFavorite } : i
        )
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Toggle favorite failed"
      );
    }
  };

  const activeItem =
    controller.state.archiving?.item ??
    controller.state.navigating?.item ??
    controller.state.shownItem;

  if (!savedResult) {
    return <BrowseLoading />;
  }

  const isEmpty = mergedItems.length === 0 && savedResult.isDone;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-semibold text-xl">Browse Saved Links</h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={() =>
              setSortOrder(sortOrder === "oldest" ? "newest" : "oldest")
            }
            size="sm"
            title={sortOrder === "oldest" ? "Oldest first" : "Newest first"}
            variant="outline"
          >
            {sortOrder === "oldest" ? (
              <ArrowDownAZ className="h-4 w-4" />
            ) : (
              <ArrowUpZA className="h-4 w-4" />
            )}
            <span className="ml-1 hidden sm:inline">
              {sortOrder === "oldest" ? "Oldest" : "Newest"}
            </span>
          </Button>
          <Button
            onClick={() => setViewMode(viewMode === "deck" ? "list" : "deck")}
            size="sm"
            title={viewMode === "deck" ? "Deck view" : "List view"}
            variant="outline"
          >
            {viewMode === "deck" ? (
              <LayoutGrid className="h-4 w-4" />
            ) : (
              <List className="h-4 w-4" />
            )}
            <span className="ml-1 hidden sm:inline">
              {viewMode === "deck" ? "Deck" : "List"}
            </span>
          </Button>
        </div>
      </div>

      {isEmpty && <BrowseEmpty />}
      {!isEmpty && viewMode === "deck" && (
        <BrowseDeckView
          activeItem={activeItem}
          controller={controller}
          onSendToRaindrop={handleSendToRaindrop}
          setViewMode={setViewMode}
          syncEnabled={syncEnabled}
        />
      )}
      {!isEmpty && viewMode === "list" && (
        <BrowseListView
          items={mergedItems}
          listLoading={listLoading}
          onArchive={handleArchiveInList}
          onFavorite={handleFavoriteInList}
          onLoadMore={loadMore}
          onSendToRaindrop={handleSendToRaindrop}
          savedResult={savedResult}
          setViewMode={setViewMode}
          syncEnabled={syncEnabled}
        />
      )}
    </div>
  );
}
