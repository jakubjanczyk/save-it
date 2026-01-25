"use client";

import { useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SortOrder } from "./browse-search-params";
import { listSaved, type SavedLinkItem } from "./convex-refs";

export function useBrowseSavedLinksPager(params: {
  pageSize?: number;
  sortOrder: SortOrder;
}) {
  const pageSize = params.pageSize ?? 20;
  const resetKey = `${params.sortOrder}:${pageSize}`;

  const [cursorStack, setCursorStack] = useState<Array<string | undefined>>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<SavedLinkItem[]>([]);
  const [navigating, setNavigating] = useState(false);

  const removedIdsRef = useRef(new Set<SavedLinkItem["id"]>());
  const lastResetKeyRef = useRef<string | null>(null);

  const page = useQuery(listSaved, {
    cursor,
    limit: pageSize,
    sortOrder: params.sortOrder,
  });

  useEffect(() => {
    lastResetKeyRef.current = resetKey;
    removedIdsRef.current = new Set();
    setCursorStack([]);
    setCursor(undefined);
    setItems([]);
    setNavigating(false);
  }, [resetKey]);

  useEffect(() => {
    if (!page) {
      return;
    }

    setItems(page.items.filter((item) => !removedIdsRef.current.has(item.id)));
    setNavigating(false);
  }, [page]);

  const hasPreviousPage = cursorStack.length > 0;
  const isDone = page?.isDone ?? false;
  const continueCursor = page?.continueCursor ?? null;
  const initialLoading = !page && items.length === 0;
  const loading = initialLoading || navigating;

  const nextPage = useCallback(() => {
    if (!page || page.isDone || navigating) {
      return;
    }
    if (!page.continueCursor) {
      return;
    }

    setNavigating(true);
    setCursorStack((prev) => [...prev, cursor]);
    setCursor(page.continueCursor);
  }, [cursor, navigating, page]);

  const previousPage = useCallback(() => {
    if (!hasPreviousPage || navigating) {
      return;
    }

    setNavigating(true);
    setCursorStack((prev) => {
      const next = [...prev];
      const previousCursor = next.pop();
      setCursor(previousCursor);
      return next;
    });
  }, [hasPreviousPage, navigating]);

  const removeItem = useCallback((id: SavedLinkItem["id"]) => {
    removedIdsRef.current.add(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateItem = useCallback(
    (
      id: SavedLinkItem["id"],
      update:
        | Partial<SavedLinkItem>
        | ((previous: SavedLinkItem) => SavedLinkItem)
    ) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) {
            return item;
          }

          return typeof update === "function"
            ? update(item)
            : { ...item, ...update };
        })
      );
    },
    []
  );

  return useMemo(
    () => ({
      continueCursor,
      hasPreviousPage,
      initialLoading,
      isDone,
      items,
      loading,
      nextPage,
      previousPage,
      removeItem,
      updateItem,
    }),
    [
      continueCursor,
      hasPreviousPage,
      initialLoading,
      isDone,
      items,
      loading,
      nextPage,
      previousPage,
      removeItem,
      updateItem,
    ]
  );
}
