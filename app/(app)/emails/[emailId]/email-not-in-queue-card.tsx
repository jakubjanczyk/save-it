"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EmailNotInQueueCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Email not in queue</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        This email is already processed or not available. Go back to the inbox
        to pick another.
      </CardContent>
    </Card>
  );
}
