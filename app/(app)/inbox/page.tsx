import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { InboxFetchEmailsCard } from "../inbox-fetch-emails-card";

import { InboxListClient } from "./list-client";

export const dynamic = "force-dynamic";

export default function InboxPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Inbox</h1>
        <p className="text-muted-foreground text-sm">
          Triage newsletters and save links.
        </p>
      </div>

      <div className="grid gap-6">
        <InboxFetchEmailsCard />

        <Card>
          <CardHeader>
            <CardTitle>Inbox</CardTitle>
          </CardHeader>
          <CardContent>
            <InboxListClient />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
