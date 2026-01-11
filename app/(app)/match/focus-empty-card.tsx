"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { InboxFetchEmailsCard } from "../inbox-fetch-emails-card";

export function FocusEmptyCard() {
  return (
    <div className="grid gap-6">
      <InboxFetchEmailsCard />

      <Card>
        <CardHeader>
          <CardTitle>No pending links</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Fetch emails or add senders to get started.
        </CardContent>
      </Card>
    </div>
  );
}
