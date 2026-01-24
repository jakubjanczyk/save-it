"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function BrowseLoading() {
  return (
    <Card>
      <div className="flex items-center justify-between gap-2 border-b p-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-6 w-20 rounded" />
      </div>
      <div className="grid gap-4 p-4">
        <div className="grid gap-2">
          <div className="min-h-[2lh] space-y-2 sm:min-h-[1lh]">
            <Skeleton className="h-5 w-64 max-w-full" />
            <Skeleton className="h-5 w-44 max-w-full sm:hidden" />
          </div>
          <Skeleton className="h-4 w-72 max-w-full" />
          <Skeleton className="h-3 w-48 max-w-full" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="ml-auto h-8 w-20 rounded-md" />
        </div>
      </div>
    </Card>
  );
}
