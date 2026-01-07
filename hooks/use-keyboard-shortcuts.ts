"use client";

import { useEffect } from "react";

export interface KeyboardShortcutHandlers {
  onDiscard?: () => Promise<void> | void;
  onMarkAsRead?: () => Promise<void> | void;
  onNextEmail?: () => Promise<void> | void;
  onNextLink?: () => Promise<void> | void;
  onOpen?: () => Promise<void> | void;
  onPrevEmail?: () => Promise<void> | void;
  onPrevLink?: () => Promise<void> | void;
  onSave?: () => Promise<void> | void;
  onToggleHelp?: () => Promise<void> | void;
  onToggleView?: () => Promise<void> | void;
}

type HandlerName = keyof KeyboardShortcutHandlers;

function runHandler(handler: (() => Promise<void> | void) | undefined) {
  if (!handler) {
    return;
  }

  try {
    const result = handler();
    if (result && typeof (result as Promise<void>).catch === "function") {
      (result as Promise<void>).catch(() => undefined);
    }
  } catch {
    // Ignore synchronous errors to keep the event listener stable.
  }
}

function isEditableElement(element: Element | null) {
  if (!element) {
    return false;
  }

  if (element instanceof HTMLElement && element.isContentEditable) {
    return true;
  }

  const tag = element.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}

const keyMap: Readonly<Record<string, HandlerName | undefined>> = {
  "?": "onToggleHelp",
  d: "onDiscard",
  enter: "onOpen",
  j: "onNextLink",
  k: "onPrevLink",
  m: "onMarkAsRead",
  n: "onNextEmail",
  o: "onOpen",
  p: "onPrevEmail",
  s: "onSave",
  v: "onToggleView",
  arrowdown: "onNextLink",
  arrowup: "onPrevLink",
};

function shouldIgnoreKeyEvent(
  event: KeyboardEvent,
  opts: { disableWhenInputFocused: boolean }
) {
  if (event.defaultPrevented) {
    return true;
  }

  if (event.metaKey || event.ctrlKey || event.altKey) {
    return true;
  }

  if (
    opts.disableWhenInputFocused &&
    isEditableElement(document.activeElement)
  ) {
    return true;
  }

  return false;
}

function getShortcutHandler(
  keyLower: string,
  handlers: KeyboardShortcutHandlers,
  opts: { enableArrowSaveDiscard: boolean }
) {
  if (keyLower === "arrowleft") {
    return opts.enableArrowSaveDiscard ? handlers.onDiscard : undefined;
  }

  if (keyLower === "arrowright") {
    return opts.enableArrowSaveDiscard ? handlers.onSave : undefined;
  }

  const mapped = keyMap[keyLower];
  return mapped ? handlers[mapped] : undefined;
}

export function useKeyboardShortcuts(
  handlers: KeyboardShortcutHandlers,
  options?: {
    enabled?: boolean;
    disableWhenInputFocused?: boolean;
    enableArrowSaveDiscard?: boolean;
  }
) {
  const enabled = options?.enabled ?? true;
  const disableWhenInputFocused = options?.disableWhenInputFocused ?? true;
  const enableArrowSaveDiscard = options?.enableArrowSaveDiscard ?? true;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreKeyEvent(event, { disableWhenInputFocused })) {
        return;
      }

      const lower = event.key.toLowerCase();
      const handler = getShortcutHandler(lower, handlers, {
        enableArrowSaveDiscard,
      });

      if (!handler) {
        return;
      }

      event.preventDefault();
      runHandler(handler);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [disableWhenInputFocused, enableArrowSaveDiscard, enabled, handlers]);
}
