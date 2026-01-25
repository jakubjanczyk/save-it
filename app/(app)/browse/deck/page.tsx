import { Suspense } from "react";

import { BrowseDeckPageClient } from "./page-client";

export default function BrowseDeckPage() {
  return (
    <Suspense
      fallback={
        <div className="grid gap-4">
          <div className="h-[520px] rounded-xl border bg-card" />
        </div>
      }
    >
      <BrowseDeckPageClient />
    </Suspense>
  );
}
