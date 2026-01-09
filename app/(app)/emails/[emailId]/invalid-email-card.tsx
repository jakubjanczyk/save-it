"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function InvalidEmailCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invalid email</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        The email id in the URL is invalid.
      </CardContent>
    </Card>
  );
}
