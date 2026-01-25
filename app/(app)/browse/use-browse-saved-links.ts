"use client";

import { useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SortOrder } from "./browse-search-params";
import { listSaved, type SavedLinkItem } from "./convex-refs";

function mergeAppendUniqueById(
  previous: SavedLinkItem[],
  incoming: SavedLinkItem[],
  removedIds: ReadonlySet<SavedLinkItem["id"]>
) {
  const indexById = new Map(previous.map((item, index) => [item.id, index]));
  const merged = [...previous];

  for (const item of incoming) {
    if (removedIds.has(item.id)) {
      continue;
    }

    const existingIndex = indexById.get(item.id);
    if (existingIndex === undefined) {
      indexById.set(item.id, merged.length);
      merged.push(item);
      continue;
    }

    merged[existingIndex] = item;
  }

  return merged;
}

export function useBrowseSavedLinks(params: {
  pageSize?: number;
  sortOrder: SortOrder;
}) {
  const pageSize = params.pageSize ?? 20;
  const resetKey = `${params.sortOrder}:${pageSize}`;

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<SavedLinkItem[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

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
    setCursor(undefined);
    setItems([]);
    setLoadingMore(false);
  }, [resetKey]);

  useEffect(() => {
    if (!page) {
      return;
    }

    setItems((prev) =>
      mergeAppendUniqueById(prev, page.items, removedIdsRef.current)
    );
    setLoadingMore(false);
  }, [page]);

  const loadMore = useCallback(() => {
    if (!page || page.isDone || loadingMore) {
      return;
    }

    if (!page.continueCursor) {
      return;
    }

    setLoadingMore(true);
    setCursor(page.continueCursor);
  }, [loadingMore, page]);

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

  const initialLoading = !page && items.length === 0;
  const isDone = page?.isDone ?? false;
  const continueCursor = page?.continueCursor ?? null;

  return useMemo(
    () => ({
      continueCursor,
      initialLoading,
      isDone,
      items,
      loadMore,
      loadingMore,
      removeItem,
      updateItem,
    }),
    [
      continueCursor,
      initialLoading,
      isDone,
      items,
      loadMore,
      loadingMore,
      removeItem,
      updateItem,
    ]
  );
}
