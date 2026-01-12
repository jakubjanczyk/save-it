"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_EMAIL_FETCH_LIMIT,
  DEFAULT_EMAIL_FINALIZE_ACTION,
  parseEmailFetchLimit,
  parseEmailFinalizeAction,
} from "@/lib/settings";
import {
  EMAIL_FETCH_LIMIT_SETTING_KEY,
  EMAIL_FINALIZE_ACTION_SETTING_KEY,
} from "@/lib/settings-keys";

import { setSettings } from "./convex-refs";

export function EmailFetchSettingsCard(props: {
  storedFetchLimit: string | null;
  storedFinalizeAction: string | null;
}) {
  const router = useRouter();
  const saveSettings = useMutation(setSettings);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const defaultFetchLimit = parseEmailFetchLimit(
    props.storedFetchLimit
  ).toString();
  const defaultFinalizeAction = parseEmailFinalizeAction(
    props.storedFinalizeAction
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form
          className="grid gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);

            const formData = new FormData(event.currentTarget);
            const fetchLimitValue = formData.get("emailFetchLimit");
            const fetchLimitRaw =
              typeof fetchLimitValue === "string" ? fetchLimitValue : "";

            const finalizeActionValue = formData.get("emailFinalizeAction");
            const finalizeActionRaw =
              typeof finalizeActionValue === "string"
                ? finalizeActionValue
                : "";

            const normalizedFetchLimit =
              parseEmailFetchLimit(fetchLimitRaw).toString();
            const normalizedFinalizeAction =
              parseEmailFinalizeAction(finalizeActionRaw);

            setSaving(true);
            try {
              await saveSettings({
                entries: [
                  {
                    key: EMAIL_FETCH_LIMIT_SETTING_KEY,
                    value: normalizedFetchLimit,
                  },
                  {
                    key: EMAIL_FINALIZE_ACTION_SETTING_KEY,
                    value: normalizedFinalizeAction,
                  },
                ],
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
          <label className="font-medium text-sm" htmlFor="email-fetch-limit">
            Emails per fetch
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              aria-invalid={error != null}
              className="w-44"
              defaultValue={defaultFetchLimit}
              id="email-fetch-limit"
              inputMode="numeric"
              min={1}
              name="emailFetchLimit"
              placeholder={DEFAULT_EMAIL_FETCH_LIMIT.toString()}
              type="number"
            />
          </div>

          <label className="mt-2 font-medium text-sm" htmlFor="email-finalize">
            When finished processing an email
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-invalid={error != null}
              className="h-9 w-44 min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] md:text-sm dark:bg-input/30"
              defaultValue={defaultFinalizeAction}
              id="email-finalize"
              name="emailFinalizeAction"
            >
              <option value={DEFAULT_EMAIL_FINALIZE_ACTION}>
                Mark as read
              </option>
              <option value="archive">Archive</option>
            </select>
            <Button disabled={saving} size="sm" type="submit">
              {saving ? "Saving…" : "Save"}
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
