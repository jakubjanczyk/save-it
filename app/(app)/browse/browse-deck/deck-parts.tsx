"use client";

import type { MotionValue } from "framer-motion";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { BrowseCard } from "../browse-card";
import type { SavedLinkItem } from "../convex-refs";
import type { DeckNavigating } from "../deck/browse-deck-state";
import { PEEK_OPACITY, PEEK_SCALE } from "./deck-constants";

export function DeckCardFrame(props: {
  children?: ReactNode;
  className?: string;
  disabled: boolean;
  filter?: MotionValue<string>;
  item: SavedLinkItem;
  onArchive: () => void;
  onFavorite: () => void;
  onSendToRaindrop?: () => void;
  showSendToRaindrop: boolean;
}) {
  return (
    <Card className={cn("relative py-0", props.className)}>
      <motion.div style={props.filter ? { filter: props.filter } : undefined}>
        <BrowseCard
          disabled={props.disabled}
          item={props.item}
          onArchive={props.onArchive}
          onFavorite={props.onFavorite}
          onSendToRaindrop={props.onSendToRaindrop}
          showSendToRaindrop={props.showSendToRaindrop}
        />
      </motion.div>
      {props.children}
    </Card>
  );
}

function DeckPeekCard(props: {
  item: SavedLinkItem;
  opacity: MotionValue<number> | number;
  scale: MotionValue<number> | number;
  top: number;
  y: MotionValue<number>;
}) {
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0"
      style={{
        opacity: props.opacity,
        scale: props.scale,
        top: props.top,
        y: props.y,
      }}
    >
      <DeckCardFrame
        disabled={true}
        item={props.item}
        onArchive={() => undefined}
        onFavorite={() => undefined}
        showSendToRaindrop={false}
      />
    </motion.div>
  );
}

export function DeckPeekStack(props: {
  navigating: DeckNavigating | null;
  nextItem: SavedLinkItem | null;
  nextNextTop: number;
  nextOpacity: MotionValue<number>;
  nextScale: MotionValue<number>;
  nextTop: number;
  prevOpacity: MotionValue<number>;
  prevPrevTop: number;
  prevScale: MotionValue<number>;
  previousItem: SavedLinkItem | null;
  previousTop: number;
  y: MotionValue<number>;
}) {
  if (props.navigating) {
    return (
      <>
        {props.navigating.window.prevPrev ? (
          <DeckPeekCard
            item={props.navigating.window.prevPrev}
            opacity={PEEK_OPACITY}
            scale={PEEK_SCALE}
            top={props.prevPrevTop}
            y={props.y}
          />
        ) : null}

        {props.navigating.window.prev ? (
          <DeckPeekCard
            item={props.navigating.window.prev}
            opacity={props.prevOpacity}
            scale={props.prevScale}
            top={props.previousTop}
            y={props.y}
          />
        ) : null}

        {props.navigating.window.next ? (
          <DeckPeekCard
            item={props.navigating.window.next}
            opacity={props.nextOpacity}
            scale={props.nextScale}
            top={props.nextTop}
            y={props.y}
          />
        ) : null}

        {props.navigating.window.nextNext ? (
          <DeckPeekCard
            item={props.navigating.window.nextNext}
            opacity={PEEK_OPACITY}
            scale={PEEK_SCALE}
            top={props.nextNextTop}
            y={props.y}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      {props.previousItem ? (
        <DeckPeekCard
          item={props.previousItem}
          opacity={props.prevOpacity}
          scale={props.prevScale}
          top={props.previousTop}
          y={props.y}
        />
      ) : null}

      {props.nextItem ? (
        <DeckPeekCard
          item={props.nextItem}
          opacity={props.nextOpacity}
          scale={props.nextScale}
          top={props.nextTop}
          y={props.y}
        />
      ) : null}
    </>
  );
}

export function DeckDismissingUnderlay(props: {
  shownItem: SavedLinkItem;
  top: number;
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0"
      style={{ top: props.top }}
    >
      <DeckCardFrame
        disabled={true}
        item={props.shownItem}
        onArchive={() => undefined}
        onFavorite={() => undefined}
        showSendToRaindrop={false}
      />
    </div>
  );
}

export function ArchiveBadge(props: {
  archiveOpacity: MotionValue<number>;
  isDismissing: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <motion.div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          "rounded-full border px-6 py-3 font-semibold text-lg shadow-sm",
          "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300"
        )}
        style={{
          opacity: props.isDismissing ? 1 : props.archiveOpacity,
        }}
      >
        {props.isDismissing ? "Archived" : "Archive"}
      </motion.div>
    </div>
  );
}
