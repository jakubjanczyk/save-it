import { Suspense } from "react";

import { BrowseHeaderControls } from "./browse-header-controls";

export function BrowseHeader() {
  return (
    <div className="flex items-center justify-between gap-2">
      <h1 className="font-semibold text-xl">Browse Saved Links</h1>
      <Suspense
        fallback={
          <div className="flex items-center gap-2">
            <div className="h-9 w-[104px] rounded-md border bg-muted/40" />
            <div className="h-9 w-[104px] rounded-md border bg-muted/40" />
          </div>
        }
      >
        <BrowseHeaderControls />
      </Suspense>
    </div>
  );
}
