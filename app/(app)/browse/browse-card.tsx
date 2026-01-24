"use client";

import { Archive, ExternalLink, Heart, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
          disabled={disabled}
          onClick={props.onArchive}
          size="sm"
          variant="outline"
        >
          <Archive className="mr-1 h-4 w-4" />
          Archive
        </Button>
        <Button
          disabled={disabled}
          onClick={props.onFavorite}
          size="sm"
          variant="outline"
        >
          <Heart
            className={cn("mr-1 h-4 w-4", item.isFavorite && "fill-current")}
          />
          {item.isFavorite ? "Favorited" : "Favorite"}
        </Button>
        {props.showSendToRaindrop &&
          !item.raindropId &&
          props.onSendToRaindrop && (
            <Button
              disabled={disabled}
              onClick={props.onSendToRaindrop}
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
