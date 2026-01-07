"use client";

import { useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

export type KeyboardShortcutsContext = "focus" | "list";

export interface KeyboardShortcutsProps {
  context: KeyboardShortcutsContext;
  enabled?: boolean;
  onDiscard?: () => Promise<void> | void;
  onMarkAsRead?: () => Promise<void> | void;
  onNextEmail?: () => Promise<void> | void;
  onNextLink?: () => Promise<void> | void;
  onOpen?: () => Promise<void> | void;
  onPrevEmail?: () => Promise<void> | void;
  onPrevLink?: () => Promise<void> | void;
  onSave?: () => Promise<void> | void;
  onToggleView?: () => Promise<void> | void;
}

interface ShortcutRow {
  action: string;
  keys: string;
}

const listShortcuts: ShortcutRow[] = [
  { action: "Save link", keys: "S" },
  { action: "Discard link", keys: "D" },
  { action: "Open link", keys: "O or Enter" },
  { action: "Mark email as read", keys: "M" },
  { action: "Next link", keys: "J or ↓" },
  { action: "Previous link", keys: "K or ↑" },
  { action: "Next email", keys: "N" },
  { action: "Previous email", keys: "P" },
  { action: "Toggle view", keys: "V" },
  { action: "Show this help", keys: "?" },
];

const focusShortcuts: ShortcutRow[] = [
  { action: "Save link", keys: "S or →" },
  { action: "Discard link", keys: "D or ←" },
  { action: "Open link", keys: "O or Enter" },
  { action: "Toggle view", keys: "V" },
  { action: "Show this help", keys: "?" },
];

export function KeyboardShortcuts(props: KeyboardShortcutsProps) {
  const [helpOpen, setHelpOpen] = useState(false);

  const enabled = props.enabled ?? true;

  const toggleHelp = () => {
    setHelpOpen((open) => !open);
  };

  useKeyboardShortcuts(
    helpOpen
      ? { onToggleHelp: toggleHelp }
      : {
          onDiscard: props.onDiscard,
          onMarkAsRead: props.onMarkAsRead,
          onNextEmail: props.onNextEmail,
          onNextLink: props.onNextLink,
          onOpen: props.onOpen,
          onPrevEmail: props.onPrevEmail,
          onPrevLink: props.onPrevLink,
          onSave: props.onSave,
          onToggleHelp: toggleHelp,
          onToggleView: props.onToggleView,
        },
    { enableArrowSaveDiscard: props.context === "focus", enabled }
  );

  const title =
    props.context === "focus" ? "Focus shortcuts" : "List shortcuts";

  const rows = useMemo(
    () => (props.context === "focus" ? focusShortcuts : listShortcuts),
    [props.context]
  );

  return (
    <Dialog onOpenChange={setHelpOpen} open={helpOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Press <kbd className="font-mono text-xs">?</kbd> to close.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {rows.map((row) => (
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
