"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseRaindropSyncEnabled } from "@/lib/settings";
import { RAINDROP_SYNC_ENABLED_SETTING_KEY } from "@/lib/settings-keys";

import { setSetting } from "./convex-refs";

export function RaindropSyncSettingsCard(props: {
  storedEnabled: string | null;
}) {
  const router = useRouter();
  const saveSetting = useMutation(setSetting);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [enabled, setEnabled] = useState(() =>
    parseRaindropSyncEnabled(props.storedEnabled)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Raindrop sync</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form
          className="grid gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);

            setSaving(true);
            try {
              await saveSetting({
                key: RAINDROP_SYNC_ENABLED_SETTING_KEY,
                value: enabled ? "true" : "false",
              });
              toast.success("Saved.");
              router.refresh();
            } catch (error) {
              setError(error instanceof Error ? error.message : "Save failed");
            } finally {
              setSaving(false);
            }
          }}
        >
          <label className="flex items-center gap-2 font-medium text-sm">
            <input
              checked={enabled}
              className="h-4 w-4"
              name="raindropSyncEnabled"
              onChange={(event) => {
                setEnabled(event.target.checked);
              }}
              type="checkbox"
            />
            Enable Raindrop sync
          </label>

          <div className="text-muted-foreground text-sm">
            When enabled, saved links are sent to Raindrop and archived links
            are deleted from Raindrop.
          </div>

          <div className="flex items-center gap-2">
            <Button disabled={saving} size="sm" type="submit">
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>

          {error != null ? (
            <div className="text-destructive text-sm" role="alert">
              {error}
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
