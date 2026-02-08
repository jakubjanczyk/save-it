"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { BrowseMarkdown } from "./browse-markdown";
import type { SavedLinkItem } from "./convex-refs";

type SummaryStatus = NonNullable<SavedLinkItem["summaryStatus"]>;

function SummaryGenerating() {
  return <div className="text-sm">Generating…</div>;
}

function SummaryFailed(props: {
  message: string;
  onRetry?: () => Promise<void>;
  retrying: boolean;
  onRetryClick: () => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="text-sm">{props.message}</div>
      {props.onRetry ? (
        <DialogFooter>
          <Button disabled={props.retrying} onClick={props.onRetryClick}>
            {props.retrying ? "Retrying…" : "Retry"}
          </Button>
        </DialogFooter>
      ) : null}
    </div>
  );
}

function SummaryNotGenerated(props: {
  onGenerate?: () => Promise<void>;
  generating: boolean;
  onGenerateClick: () => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="text-muted-foreground text-sm">
        No summary generated yet.
      </div>
      {props.onGenerate ? (
        <DialogFooter>
          <Button disabled={props.generating} onClick={props.onGenerateClick}>
            {props.generating ? "Generating…" : "Generate"}
          </Button>
        </DialogFooter>
      ) : null}
    </div>
  );
}

function SummarySuccess(props: { item: SavedLinkItem }) {
  const title = props.item.summaryExtractedTitle ?? props.item.title;
  const showSourceTitle =
    props.item.summaryExtractedTitle &&
    props.item.summaryExtractedTitle !== props.item.title;
  const longSummary = props.item.summaryLongSummary;
  const hasLongSummary = Boolean(longSummary);

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <div className="font-semibold leading-snug">{title}</div>
        {showSourceTitle ? (
          <div className="text-muted-foreground text-xs">
            Source title: {props.item.title}
          </div>
        ) : null}
      </div>

      <Separator />

      <div className="grid gap-1">
        <div className="font-medium text-sm">TL;DR</div>
        {props.item.summaryTldr ? (
          <BrowseMarkdown markdown={props.item.summaryTldr} />
        ) : (
          <div className="text-muted-foreground text-sm">—</div>
        )}
      </div>

      {hasLongSummary ? (
        <>
          <Separator />
          <div className="grid gap-1">
            <div className="font-medium text-sm">Long summary</div>
            <BrowseMarkdown markdown={longSummary ?? ""} />
          </div>
        </>
      ) : null}
    </div>
  );
}

export function BrowseSummaryDialog(props: {
  disabled?: boolean;
  item: SavedLinkItem;
  onRetry?: () => Promise<void>;
  triggerClassName?: string;
  triggerSize?: React.ComponentProps<typeof Button>["size"];
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const [optimisticStatus, setOptimisticStatus] =
    useState<SummaryStatus | null>(null);
  const [retrying, setRetrying] = useState(false);

  const effectiveStatus = useMemo(() => {
    if (optimisticStatus) {
      return optimisticStatus;
    }
    return props.item.summaryStatus ?? null;
  }, [optimisticStatus, props.item.summaryStatus]);

  const showGenerating =
    effectiveStatus === "pending" || effectiveStatus === "running";
  const showFailed = effectiveStatus === "failed";
  const showSuccess = effectiveStatus === "success";

  const showNotGenerated =
    effectiveStatus === null || props.item.summaryStatus === undefined;

  const handleRetry = async () => {
    if (!props.onRetry) {
      return;
    }

    setRetrying(true);
    setOptimisticStatus("pending");
    try {
      await props.onRetry();
    } catch {
      setOptimisticStatus("failed");
    } finally {
      setRetrying(false);
    }
  };

  let body: ReactNode = <div className="text-muted-foreground text-sm">—</div>;
  if (showGenerating) {
    body = <SummaryGenerating />;
  } else if (showFailed) {
    body = (
      <SummaryFailed
        message={props.item.summaryErrorMessage ?? "Summary failed."}
        onRetry={props.onRetry}
        onRetryClick={handleRetry}
        retrying={retrying}
      />
    );
  } else if (showSuccess) {
    body = <SummarySuccess item={props.item} />;
  } else if (showNotGenerated) {
    body = (
      <SummaryNotGenerated
        generating={retrying}
        onGenerate={props.onRetry}
        onGenerateClick={handleRetry}
      />
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          aria-label="Summary"
          className={cn(props.triggerClassName)}
          disabled={props.disabled}
          size={props.triggerSize ?? "sm"}
          variant={props.triggerVariant ?? "outline"}
        >
          Summary
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[95dvh] overflow-y-auto sm:max-h-[70dvh]">
        <DialogHeader>
          <DialogTitle>Summary</DialogTitle>
          <DialogDescription className="break-all">
            {props.item.url}
          </DialogDescription>
        </DialogHeader>

        {body}
      </DialogContent>
    </Dialog>
  );
}
