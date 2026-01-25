"use client";

import { Archive, ExternalLink, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { BrowseFavoriteHeart } from "./browse-favorite-heart";
import type { SavedLinkItem } from "./convex-refs";

export function BrowseList(props: {
  continueCursor: string | null;
  hasPreviousPage?: boolean;
  isDone: boolean;
  items: SavedLinkItem[];
  loading: boolean;
  onArchive: (item: SavedLinkItem) => void;
  onFavorite: (item: SavedLinkItem) => void;
  onLoadMore: () => void;
  onPreviousPage?: () => void;
  onSendToRaindrop?: (item: SavedLinkItem) => void;
  showSendToRaindrop: boolean;
}) {
  if (props.items.length === 0 && !props.loading) {
    return null;
  }

  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b p-4">
        <span className="font-medium text-sm">Saved Links</span>
        <span className="shrink-0 rounded bg-primary/20 px-2 py-1 font-medium text-foreground text-xs">
          {props.items.length} loaded
        </span>
      </div>
      <div className="divide-y">
        {props.items.map((item) => (
          <div
            className={cn(
              "flex flex-col gap-2 overflow-hidden p-3 hover:bg-muted/50",
              "sm:flex-row sm:items-center sm:gap-2"
            )}
            key={item.id}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-sm">{item.title}</div>
              <div className="truncate text-muted-foreground text-xs">
                {item.url}
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center justify-start gap-1 sm:w-auto sm:flex-nowrap sm:justify-end">
              <Button
                onClick={() => props.onArchive(item)}
                size="icon"
                title="Archive"
                variant="ghost"
              >
                <Archive className="h-4 w-4" />
              </Button>
              <Button
                className="cursor-pointer"
                onClick={() => props.onFavorite(item)}
                size="icon"
                title={item.isFavorite ? "Remove favorite" : "Add favorite"}
                variant="ghost"
              >
                <BrowseFavoriteHeart
                  iconClassName="h-4 w-4"
                  isFavorite={item.isFavorite}
                />
              </Button>
              {props.showSendToRaindrop &&
                !item.raindropId &&
                props.onSendToRaindrop && (
                  <Button
                    onClick={() => props.onSendToRaindrop?.(item)}
                    size="icon"
                    title="Send to Raindrop"
                    variant="ghost"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              <Button asChild size="icon" title="Open link" variant="ghost">
                <a href={item.url} rel="noreferrer noopener" target="_blank">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        ))}
      </div>
      {!props.isDone || props.onPreviousPage ? (
        <div className="border-t p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            {props.onPreviousPage ? (
              <Button
                className="w-full"
                disabled={props.loading || !props.hasPreviousPage}
                onClick={props.onPreviousPage}
                variant="outline"
              >
                Previous
              </Button>
            ) : null}
            {props.isDone ? null : (
              <Button
                className="w-full"
                disabled={props.loading}
                onClick={props.onLoadMore}
                variant="outline"
              >
                {props.loading ? "Loading..." : "Next page"}
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
