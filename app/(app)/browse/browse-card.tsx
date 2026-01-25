"use client";

import { Archive, ExternalLink, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { BrowseFavoriteHeart } from "./browse-favorite-heart";
import type { SavedLinkItem } from "./convex-refs";

export function BrowseCard(props: {
  disabled?: boolean;
  item: SavedLinkItem;
  onArchive: () => void;
  onFavorite: () => void;
  onSendToRaindrop?: () => void;
  showSendToRaindrop: boolean;
}) {
  const { item } = props;
  const disabled = props.disabled ?? false;

  return (
    <div className="grid gap-4 p-4">
      <div className="grid gap-2">
        <div className="flex items-start justify-between gap-2">
          <div
            className={cn(
              "font-semibold text-lg leading-snug",
              "min-h-[2lh] overflow-hidden [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [display:-webkit-box]",
              "sm:min-h-[1lh] sm:truncate sm:whitespace-nowrap sm:[display:block]"
            )}
          >
            {item.title}
          </div>
        </div>
        <a
          className="block min-h-[1lh] truncate text-muted-foreground text-sm underline underline-offset-2"
          href={item.url}
          rel="noreferrer noopener"
          target="_blank"
        >
          {item.url}
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          aria-label="Archive"
          className="h-11 w-11 cursor-pointer rounded-full"
          disabled={disabled}
          onClick={() => props.onArchive()}
          size="icon"
          title="Archive"
          variant="ghost"
        >
          <Archive className="h-5 w-5" />
        </Button>
        <Button
          aria-label={item.isFavorite ? "Favorited" : "Favorite"}
          className="h-11 w-11 cursor-pointer rounded-full"
          disabled={disabled}
          onClick={() => props.onFavorite()}
          size="icon"
          title={item.isFavorite ? "Remove favorite" : "Add favorite"}
          variant="ghost"
        >
          <BrowseFavoriteHeart
            iconClassName="h-5 w-5"
            isFavorite={item.isFavorite}
            itemId={item.id}
          />
        </Button>
        {props.showSendToRaindrop &&
          !item.raindropId &&
          props.onSendToRaindrop && (
            <Button
              disabled={disabled}
              onClick={() => props.onSendToRaindrop?.()}
              size="sm"
              variant="outline"
            >
              <Send className="mr-1 h-4 w-4" />
              Send to Raindrop
            </Button>
          )}
        <Button asChild className="ml-auto" size="sm" variant="outline">
          <a href={item.url} rel="noreferrer noopener" target="_blank">
            <ExternalLink className="mr-1 h-4 w-4" />
            Open
          </a>
        </Button>
      </div>
    </div>
  );
}
