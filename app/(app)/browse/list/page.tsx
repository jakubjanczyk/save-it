import { Suspense } from "react";

import { BrowseListPageClient } from "./page-client";

export default function BrowseListPage() {
  return (
    <Suspense
      fallback={
        <div className="grid gap-4">
          <div className="h-[520px] rounded-xl border bg-card" />
        </div>
      }
    >
      <BrowseListPageClient />
    </Suspense>
  );
}
