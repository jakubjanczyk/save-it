"use client";

import { LinkList } from "@/components/link-list";
import { Skeleton } from "@/components/ui/skeleton";

export function EmailDetailLoading() {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2 rounded-md border p-4">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-9 w-28" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>
        <div className="grid gap-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>

      <LinkList
        links={[]}
        loading
        onDiscardLink={() => undefined}
        onSaveLink={() => undefined}
        skeletonCount={3}
      />
    </div>
  );
}
