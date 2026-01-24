"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BrowseEmpty() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No saved links</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 text-muted-foreground text-sm">
        <p>You haven&apos;t saved any links yet.</p>
        <p>
          Go to Match to triage your newsletter links and save the ones you want
          to keep.
        </p>
        <Button asChild className="w-fit">
          <Link href="/">Go to Match</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
