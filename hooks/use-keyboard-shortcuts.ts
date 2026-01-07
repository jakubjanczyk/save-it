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

export function useKeyboardShortcuts(
  handlers: KeyboardShortcutHandlers,
  options?: { enabled?: boolean; disableWhenInputFocused?: boolean }
) {
  const enabled = options?.enabled ?? true;
  const disableWhenInputFocused = options?.disableWhenInputFocused ?? true;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (
        disableWhenInputFocused &&
        isEditableElement(document.activeElement)
      ) {
        return;
      }

      const lower = event.key.toLowerCase();

      const prevent = () => {
        event.preventDefault();
      };

      switch (lower) {
        case "?": {
          prevent();
          runHandler(handlers.onToggleHelp);
          return;
        }
        case "v": {
          prevent();
          runHandler(handlers.onToggleView);
          return;
        }
        case "m": {
          prevent();
          runHandler(handlers.onMarkAsRead);
          return;
        }
        case "n": {
          prevent();
          runHandler(handlers.onNextEmail);
          return;
        }
        case "p": {
          prevent();
          runHandler(handlers.onPrevEmail);
          return;
        }
        case "j":
        case "arrowdown": {
          prevent();
          runHandler(handlers.onNextLink);
          return;
        }
        case "k":
        case "arrowup": {
          prevent();
          runHandler(handlers.onPrevLink);
          return;
        }
        case "s":
        case "arrowright": {
          prevent();
          runHandler(handlers.onSave);
          return;
        }
        case "d":
        case "arrowleft": {
          prevent();
          runHandler(handlers.onDiscard);
          return;
        }
        case "o":
        case "enter": {
          prevent();
          runHandler(handlers.onOpen);
          return;
        }
        default: {
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [disableWhenInputFocused, enabled, handlers]);
}
