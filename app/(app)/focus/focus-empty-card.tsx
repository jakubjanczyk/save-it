"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FocusEmptyCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No pending links</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        Fetch emails or add senders to get started.
      </CardContent>
    </Card>
  );
}
