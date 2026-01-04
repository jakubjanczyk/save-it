import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SendersClient } from "./senders-client";

export default function SendersPage() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Senders</h1>
          <p className="text-muted-foreground text-sm">
            Configure which newsletters we should process.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Missing configuration</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Set{" "}
            <code className="font-mono text-xs">NEXT_PUBLIC_CONVEX_URL</code> to
            enable sender management.
          </CardContent>
        </Card>
      </div>
    );
  }

  return <SendersClient />;
}
