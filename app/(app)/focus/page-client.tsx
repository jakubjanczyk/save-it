"use client";

import { useAction, useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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

  const discard = useAction(discardLink);
  const save = useAction(saveLink);

  const [busy, setBusy] = useState(false);

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

    if (!requestedLinkId || activeIndex === -1) {
      router.replace(`/focus?linkId=${items[0]?.id}`);
    }
  }, [activeIndex, items, requestedLinkId, router]);

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

  if (!activeItem) {
    return null;
  }

  const total = items.length;
  const position = activeIndex + 1;

  const nextId =
    items[activeIndex + 1]?.id ?? items[activeIndex - 1]?.id ?? null;

  const advance = () => {
    if (nextId) {
      router.replace(`/focus?linkId=${nextId}`);
      router.refresh();
      return;
    }

    router.replace("/focus");
    router.refresh();
  };

  const openCurrent = () => {
    window.open(activeItem.url, "_blank", "noopener,noreferrer");
  };

  const discardCurrent = async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    try {
      await discard({ linkId: activeItem.id });
      advance();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Discard failed");
    } finally {
      setBusy(false);
    }
  };

  const saveCurrent = async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    try {
      await save({ linkId: activeItem.id });
      toast.success("Saved to Raindrop.");
      advance();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <KeyboardShortcuts
        context="focus"
        enabled={!busy}
        onDiscard={discardCurrent}
        onOpen={openCurrent}
        onSave={saveCurrent}
        onToggleView={() => {
          router.push("/");
        }}
      />

      <FocusView
        busy={busy}
        item={{
          description: activeItem.description,
          email: {
            from: activeItem.email.from,
            id: activeItem.email.id,
            receivedAt: activeItem.email.receivedAt,
            subject: activeItem.email.subject,
          },
          id: activeItem.id,
          title: activeItem.title,
          url: activeItem.url,
        }}
        onDiscard={discardCurrent}
        onSave={saveCurrent}
        position={position}
        total={total}
      />
    </>
  );
}
