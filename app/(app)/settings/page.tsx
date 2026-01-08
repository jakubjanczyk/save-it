import { fetchQuery } from "convex/nextjs";
import Link from "next/link";

import { ConnectionsCard } from "@/components/connections/connections-card";
import {
  getGoogleTokens,
  getRaindropTokens,
} from "@/components/connections/convex-refs";
import { getSetting } from "@/components/settings/convex-refs";
import { EmailFetchSettingsCard } from "@/components/settings/email-fetch-settings-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireEnv } from "@/lib/require-env";
import { EMAIL_FETCH_LIMIT_SETTING_KEY } from "@/lib/settings-keys";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const convexUrl = requireEnv("NEXT_PUBLIC_CONVEX_URL");
  const [storedLimit, googleTokens, raindropTokens] = await Promise.all([
    fetchQuery(
      getSetting,
      { key: EMAIL_FETCH_LIMIT_SETTING_KEY },
      { url: convexUrl }
    ),
    fetchQuery(getGoogleTokens, {}, { url: convexUrl }),
    fetchQuery(getRaindropTokens, {}, { url: convexUrl }),
  ]);

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

      <EmailFetchSettingsCard storedValue={storedLimit} />
      <ConnectionsCard
        gmailConnected={googleTokens !== null}
        raindropConnected={raindropTokens !== null}
      />
    </div>
  );
}
