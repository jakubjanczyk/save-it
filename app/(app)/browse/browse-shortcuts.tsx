"use client";

import { useEffect, useState } from "react";

import { isInteractiveTarget } from "@/components/focus/focus-swipe";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ShortcutRow {
  action: string;
  keys: string;
}

export function BrowseShortcuts(props: {
  enabled: boolean;
  onArchive?: () => void;
  onArchiveLeft?: () => void;
  onArchiveRight?: () => void;
  onFavorite?: () => void;
  onNextCard?: (startY?: number) => void;
  onOpen?: () => void;
  onPreviousCard?: (startY?: number) => void;
  onToggleView?: () => void;
}) {
  const [helpOpen, setHelpOpen] = useState(false);

  const shortcutRows: ShortcutRow[] = [
    ...(props.onArchive || props.onArchiveLeft || props.onArchiveRight
      ? [
          {
            action: "Archive link",
            keys:
              props.onArchiveLeft || props.onArchiveRight ? "A or ←/→" : "A",
          },
        ]
      : []),
    ...(props.onFavorite ? [{ action: "Toggle favorite", keys: "F" }] : []),
    ...(props.onOpen ? [{ action: "Open link", keys: "O or Enter" }] : []),
    ...(props.onPreviousCard ? [{ action: "Previous card", keys: "↑" }] : []),
    ...(props.onNextCard ? [{ action: "Next card", keys: "↓" }] : []),
    ...(props.onToggleView ? [{ action: "Toggle view", keys: "V" }] : []),
    { action: "Show this help", keys: "?" },
  ];

  useEffect(() => {
    if (!props.enabled) {
      return;
    }

    const isEditableTarget = (target: EventTarget | null) =>
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable);

    const onArrowDown = props.onNextCard
      ? () => props.onNextCard?.(1)
      : undefined;
    const onArrowUp = props.onPreviousCard
      ? () => props.onPreviousCard?.(-1)
      : undefined;

    const keyHandlers: Record<string, (() => void) | undefined> = {
      a: props.onArchive,
      arrowleft: props.onArchiveLeft ?? props.onArchive,
      arrowright: props.onArchiveRight ?? props.onArchive,
      arrowdown: onArrowDown,
      arrowup: onArrowUp,
      enter: props.onOpen,
      f: props.onFavorite,
      o: props.onOpen,
      v: props.onToggleView,
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "?") {
        event.preventDefault();
        setHelpOpen((open) => !open);
        return;
      }

      if (helpOpen) {
        return;
      }

      if (isInteractiveTarget(event.target)) {
        return;
      }

      const handler = keyHandlers[key];
      if (handler) {
        event.preventDefault();
        handler();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    props.enabled,
    helpOpen,
    props.onArchive,
    props.onArchiveLeft,
    props.onArchiveRight,
    props.onFavorite,
    props.onNextCard,
    props.onOpen,
    props.onPreviousCard,
    props.onToggleView,
  ]);

  return (
    <Dialog onOpenChange={setHelpOpen} open={helpOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Browse shortcuts</DialogTitle>
          <DialogDescription>
            Press <kbd className="font-mono text-xs">?</kbd> to close.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {shortcutRows.map((row) => (
            <div
              className="flex items-center justify-between gap-4"
              key={row.action}
            >
              <div className="text-sm">{row.action}</div>
              <div className="rounded bg-muted px-2 py-1 font-mono text-xs">
                {row.keys}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
