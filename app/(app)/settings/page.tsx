import { fetchQuery } from "convex/nextjs";
import Link from "next/link";

import { ConnectionsCardClient } from "@/components/connections/connections-card-client";
import {
  getGoogleConnectionStatus,
  getRaindropTokens,
} from "@/components/connections/convex-refs";
import { BackgroundSyncSettingsCard } from "@/components/settings/background-sync-settings-card";
import { getSetting } from "@/components/settings/convex-refs";
import { EmailFetchSettingsCard } from "@/components/settings/email-fetch-settings-card";
import { RaindropSyncSettingsCard } from "@/components/settings/raindrop-sync-settings-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireEnv } from "@/lib/require-env";
import {
  BACKGROUND_SYNC_ENABLED_SETTING_KEY,
  BACKGROUND_SYNC_LOCAL_HOUR_SETTING_KEY,
  BACKGROUND_SYNC_TIME_ZONE_SETTING_KEY,
  EMAIL_FETCH_LIMIT_SETTING_KEY,
  EMAIL_FINALIZE_ACTION_SETTING_KEY,
  RAINDROP_SYNC_ENABLED_SETTING_KEY,
} from "@/lib/settings-keys";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const convexUrl = requireEnv("NEXT_PUBLIC_CONVEX_URL");
  const [
    storedLimit,
    storedFinalizeAction,
    storedBackgroundSyncEnabled,
    storedBackgroundSyncLocalHour,
    storedBackgroundSyncTimeZone,
    storedRaindropSyncEnabled,
    googleStatus,
    raindropTokens,
  ] = await Promise.all([
    fetchQuery(
      getSetting,
      { key: EMAIL_FETCH_LIMIT_SETTING_KEY },
      { url: convexUrl }
    ),
    fetchQuery(
      getSetting,
      { key: EMAIL_FINALIZE_ACTION_SETTING_KEY },
      { url: convexUrl }
    ),
    fetchQuery(
      getSetting,
      { key: BACKGROUND_SYNC_ENABLED_SETTING_KEY },
      { url: convexUrl }
    ),
    fetchQuery(
      getSetting,
      { key: BACKGROUND_SYNC_LOCAL_HOUR_SETTING_KEY },
      { url: convexUrl }
    ),
    fetchQuery(
      getSetting,
      { key: BACKGROUND_SYNC_TIME_ZONE_SETTING_KEY },
      { url: convexUrl }
    ),
    fetchQuery(
      getSetting,
      { key: RAINDROP_SYNC_ENABLED_SETTING_KEY },
      { url: convexUrl }
    ),
    fetchQuery(getGoogleConnectionStatus, {}, { url: convexUrl }),
    fetchQuery(getRaindropTokens, {}, { url: convexUrl }),
  ]);
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
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

      <EmailFetchSettingsCard
        storedFetchLimit={storedLimit}
        storedFinalizeAction={storedFinalizeAction}
      />
      <BackgroundSyncSettingsCard
        storedEnabled={storedBackgroundSyncEnabled}
        storedLocalHour={storedBackgroundSyncLocalHour}
        storedTimeZone={storedBackgroundSyncTimeZone}
      />
      <RaindropSyncSettingsCard storedEnabled={storedRaindropSyncEnabled} />
      <ConnectionsCardClient
        initialGmailStatus={googleStatus}
        initialRaindropConnected={raindropTokens !== null}
      />
    </div>
  );
}
