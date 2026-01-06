import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { EmailDetailClient } from "./page-client";

export default function EmailPage() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Missing configuration</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Set{" "}
            <code className="font-mono text-xs">NEXT_PUBLIC_CONVEX_URL</code> to
            enable email triage.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <EmailDetailClient />
    </div>
  );
}
