import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { FocusClient } from "./page-client";

export default function FocusPage() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Focus</h1>
        <p className="text-muted-foreground text-sm">
          Save or discard links one by one.
        </p>
      </div>

      {convexUrl ? (
        <FocusClient />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Missing configuration</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Set{" "}
            <code className="font-mono text-xs">NEXT_PUBLIC_CONVEX_URL</code> to
            enable triage.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
