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

export interface BrowseShortcutHandlers {
  archiveCurrent?: () => void;
  archiveCurrentLeft?: () => void;
  archiveCurrentRight?: () => void;
  favoriteCurrent?: () => void;
  nextCard?: (startY?: number) => void;
  openCurrent?: () => void;
  previousCard?: (startY?: number) => void;
  toggleView?: () => void;
}

export function BrowseShortcuts(props: {
  enabled: boolean;
  handlers?: BrowseShortcutHandlers;
}) {
  const [helpOpen, setHelpOpen] = useState(false);

  const archive = props.handlers?.archiveCurrent;
  const archiveLeft = props.handlers?.archiveCurrentLeft;
  const archiveRight = props.handlers?.archiveCurrentRight;
  const favorite = props.handlers?.favoriteCurrent;
  const nextCard = props.handlers?.nextCard;
  const open = props.handlers?.openCurrent;
  const previousCard = props.handlers?.previousCard;
  const toggleView = props.handlers?.toggleView;

  const shortcutRows: ShortcutRow[] = [
    ...(archive || archiveLeft || archiveRight
      ? [
          {
            action: "Archive link",
            keys: archiveLeft || archiveRight ? "A or ←/→" : "A",
          },
        ]
      : []),
    ...(favorite ? [{ action: "Toggle favorite", keys: "F" }] : []),
    ...(open ? [{ action: "Open link", keys: "O or Enter" }] : []),
    ...(previousCard ? [{ action: "Previous card", keys: "↑" }] : []),
    ...(nextCard ? [{ action: "Next card", keys: "↓" }] : []),
    ...(toggleView ? [{ action: "Toggle view", keys: "V" }] : []),
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

    const onArrowDown = nextCard ? () => nextCard(1) : undefined;
    const onArrowUp = previousCard ? () => previousCard(-1) : undefined;

    const keyHandlers: Record<string, (() => void) | undefined> = {
      a: archive,
      arrowleft: archiveLeft ?? archive,
      arrowright: archiveRight ?? archive,
      arrowdown: onArrowDown,
      arrowup: onArrowUp,
      enter: open,
      f: favorite,
      o: open,
      v: toggleView,
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
    archive,
    archiveLeft,
    archiveRight,
    favorite,
    props.enabled,
    helpOpen,
    nextCard,
    open,
    previousCard,
    toggleView,
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
