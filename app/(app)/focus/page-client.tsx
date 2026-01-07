"use client";

import { useAction, useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { FocusView } from "@/components/focus-view";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { discardLink, listPendingFocus, saveLink } from "../home-convex-refs";

function getActiveLinkId(value: string | null): GenericId<"links"> | null {
  if (typeof value === "string" && value.length > 0) {
    return value as GenericId<"links">;
  }
  return null;
}

export function FocusClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedLinkId = getActiveLinkId(searchParams.get("linkId"));

  const items = useQuery(listPendingFocus, {});
  type FocusItem = NonNullable<typeof items>[number];

  const discard = useAction(discardLink);
  const save = useAction(saveLink);

  const [busy, setBusy] = useState(false);
  const [feedbackAction, setFeedbackAction] = useState<
    "save" | "discard" | null
  >(null);
  const [displayedItem, setDisplayedItem] = useState<FocusItem | null>(null);

  const displayedMetaRef = useRef<{
    nextId: string | null;
    position: number;
    total: number;
  }>({ nextId: null, position: 1, total: 1 });

  const activeIndex = useMemo(() => {
    if (!items || items.length === 0) {
      return -1;
    }

    if (!requestedLinkId) {
      return 0;
    }

    return items.findIndex((item) => item.id === requestedLinkId);
  }, [items, requestedLinkId]);

  const activeItem = items && activeIndex >= 0 ? items[activeIndex] : null;

  useEffect(() => {
    if (!items || items.length === 0) {
      return;
    }

    if (feedbackAction) {
      return;
    }

    if (!requestedLinkId || activeIndex === -1) {
      router.replace(`/focus?linkId=${items[0]?.id}`);
    }
  }, [activeIndex, feedbackAction, items, requestedLinkId, router]);

  useEffect(() => {
    if (feedbackAction) {
      return;
    }

    if (!items || items.length === 0) {
      setDisplayedItem(null);
      return;
    }

    if (activeItem) {
      setDisplayedItem(activeItem);

      const nextId =
        items[activeIndex + 1]?.id ?? items[activeIndex - 1]?.id ?? null;

      displayedMetaRef.current = {
        nextId,
        position: activeIndex + 1,
        total: items.length,
      };
    }
  }, [activeIndex, activeItem, feedbackAction, items]);

  if (items === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading…</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="flex items-center gap-2 pt-2">
            <Skeleton className="h-9 w-20 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="ml-auto h-9 w-20 rounded-md" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    if (feedbackAction && displayedItem) {
      const total = displayedMetaRef.current.total;
      const position = displayedMetaRef.current.position;

      return (
        <>
          <KeyboardShortcuts
            context="focus"
            enabled={false}
            onToggleView={() => {
              router.push("/");
            }}
          />

          <FocusView
            busy
            feedbackAction={feedbackAction}
            item={{
              description: displayedItem.description,
              email: {
                from: displayedItem.email.from,
                id: displayedItem.email.id,
                receivedAt: displayedItem.email.receivedAt,
                subject: displayedItem.email.subject,
              },
              id: displayedItem.id,
              title: displayedItem.title,
              url: displayedItem.url,
            }}
            onDiscard={() => undefined}
            onFeedbackComplete={() => {
              const nextId = displayedMetaRef.current.nextId;
              setFeedbackAction(null);
              setBusy(false);
              advance(nextId);
            }}
            onSave={() => undefined}
            position={position}
            total={total}
          />
        </>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>No pending links</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Fetch emails or add senders to get started.
        </CardContent>
      </Card>
    );
  }

  const shownItem = feedbackAction ? displayedItem : activeItem;
  if (!shownItem) {
    return null;
  }

  const advance = (nextId: string | null) => {
    if (nextId) {
      router.replace(`/focus?linkId=${nextId}`);
      router.refresh();
      return;
    }

    router.replace("/focus");
    router.refresh();
  };

  const openCurrent = () => {
    window.open(shownItem.url, "_blank", "noopener,noreferrer");
  };

  const discardCurrent = async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    try {
      if (items && activeIndex >= 0) {
        const nextId =
          items[activeIndex + 1]?.id ?? items[activeIndex - 1]?.id ?? null;
        displayedMetaRef.current = {
          nextId,
          position: activeIndex + 1,
          total: items.length,
        };
      }

      setDisplayedItem(shownItem);
      await discard({ linkId: shownItem.id });
      setFeedbackAction("discard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Discard failed");
      setBusy(false);
    }
  };

  const saveCurrent = async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    try {
      if (items && activeIndex >= 0) {
        const nextId =
          items[activeIndex + 1]?.id ?? items[activeIndex - 1]?.id ?? null;
        displayedMetaRef.current = {
          nextId,
          position: activeIndex + 1,
          total: items.length,
        };
      }

      setDisplayedItem(shownItem);
      await save({ linkId: shownItem.id });
      setFeedbackAction("save");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
      setBusy(false);
    }
  };

  let position = 1;
  if (feedbackAction) {
    position = displayedMetaRef.current.position;
  } else if (activeIndex >= 0) {
    position = activeIndex + 1;
  }

  const total = feedbackAction ? displayedMetaRef.current.total : items.length;

  return (
    <>
      <KeyboardShortcuts
        context="focus"
        enabled={!(busy || feedbackAction)}
        onDiscard={discardCurrent}
        onOpen={openCurrent}
        onSave={saveCurrent}
        onToggleView={() => {
          router.push("/");
        }}
      />

      <FocusView
        busy={busy}
        feedbackAction={feedbackAction}
        item={{
          description: shownItem.description,
          email: {
            from: shownItem.email.from,
            id: shownItem.email.id,
            receivedAt: shownItem.email.receivedAt,
            subject: shownItem.email.subject,
          },
          id: shownItem.id,
          title: shownItem.title,
          url: shownItem.url,
        }}
        onDiscard={discardCurrent}
        onFeedbackComplete={() => {
          const nextId = displayedMetaRef.current.nextId;
          setFeedbackAction(null);
          setBusy(false);
          advance(nextId);
        }}
        onSave={saveCurrent}
        position={position}
        total={total}
      />
    </>
  );
}
