"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function FocusLoadingCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="min-h-[2lh] space-y-2 sm:min-h-[1lh]">
              <Skeleton className="h-5 w-64 max-w-full sm:h-5" />
              <Skeleton className="h-5 w-44 max-w-full sm:hidden" />
            </div>
          </div>
          <Skeleton className="h-6 w-14 rounded sm:h-6" />
        </div>
        <Skeleton className="h-4 w-40 max-w-full" />
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <div className="min-h-[2lh] space-y-2 sm:min-h-[1lh]">
            <Skeleton className="h-5 w-56 max-w-full sm:h-5" />
            <Skeleton className="h-5 w-32 max-w-full sm:hidden" />
          </div>
          <Skeleton className="h-4 w-72 max-w-full" />
          <div className="min-h-[10lh] space-y-2 sm:min-h-[3lh]">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-11/12 sm:hidden" />
            <Skeleton className="h-4 w-2/3 sm:hidden" />
            <Skeleton className="h-4 w-4/5 sm:hidden" />
            <Skeleton className="h-4 w-3/4 sm:hidden" />
          </div>
          <Skeleton className="h-3 w-44 max-w-full" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="ml-auto h-9 w-20 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}
