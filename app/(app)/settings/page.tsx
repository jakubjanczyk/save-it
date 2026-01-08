import Link from "next/link";

import { GmailConnectionCard } from "@/components/connections/gmail-connection-card";
import { RaindropConnectionCard } from "@/components/connections/raindrop-connection-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Configure senders and integrations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Senders</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Add the newsletter sender emails you want to track.
        </CardContent>
        <CardFooter>
          <Button asChild>
            <Link href="/senders">Manage senders</Link>
          </Button>
        </CardFooter>
      </Card>

      <GmailConnectionCard />
      <RaindropConnectionCard />
    </div>
  );
}
