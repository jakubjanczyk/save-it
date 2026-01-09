"use client";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const linkSkeletonKeys = [
  "link-skeleton-0",
  "link-skeleton-1",
  "link-skeleton-2",
  "link-skeleton-3",
  "link-skeleton-4",
  "link-skeleton-5",
  "link-skeleton-6",
  "link-skeleton-7",
  "link-skeleton-8",
  "link-skeleton-9",
] as const;

function SkeletonButton(props: { label: string; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        buttonVariants({ size: "default", variant: "default" }),
        "pointer-events-none bg-accent text-transparent shadow-none",
        props.className
      )}
    >
      {props.label}
    </div>
  );
}

export function LinkListSkeleton(props: { count?: number }) {
  const count = Math.max(1, Math.min(10, props.count ?? 3));

  return (
    <div className="grid gap-4">
      {linkSkeletonKeys.slice(0, count).map((key) => (
        <Card data-testid="link-card-skeleton" key={key}>
          <CardHeader className="gap-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="grid gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
          <CardFooter className="gap-2">
            <SkeletonButton label="Save" />
            <SkeletonButton label="Discard" />
            <SkeletonButton className="ml-auto" label="Open" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
