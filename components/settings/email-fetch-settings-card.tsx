"use client";

import { useMutation, useQuery } from "convex/react";
import { type FunctionReference, makeFunctionReference } from "convex/server";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DEFAULT_EMAIL_FETCH_LIMIT,
  parseEmailFetchLimit,
} from "@/lib/settings";
import { EMAIL_FETCH_LIMIT_SETTING_KEY } from "@/lib/settings-keys";

const getSetting: FunctionReference<
  "query",
  "public",
  { key: string },
  string | null
> = makeFunctionReference("settings:get");

const setSetting: FunctionReference<
  "mutation",
  "public",
  { key: string; value: string },
  null
> = makeFunctionReference("settings:set");

export function EmailFetchSettingsCard() {
  const storedValue = useQuery(getSetting, {
    key: EMAIL_FETCH_LIMIT_SETTING_KEY,
  });
  const saveSetting = useMutation(setSetting);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const defaultValue = parseEmailFetchLimit(storedValue ?? null).toString();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email fetching</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {storedValue === undefined ? (
          <div className="grid gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-44" />
          </div>
        ) : (
          <form
            className="grid gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              setError(null);

              const formData = new FormData(event.currentTarget);
              const value = formData.get("emailFetchLimit");
              const raw = typeof value === "string" ? value : "";

              const normalized = parseEmailFetchLimit(raw).toString();

              setSaving(true);
              try {
                await saveSetting({
                  key: EMAIL_FETCH_LIMIT_SETTING_KEY,
                  value: normalized,
                });
                toast.success("Saved.");
              } catch (error) {
                setError(
                  error instanceof Error ? error.message : "Save failed"
                );
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
                defaultValue={defaultValue}
                id="email-fetch-limit"
                inputMode="numeric"
                min={1}
                name="emailFetchLimit"
                placeholder={DEFAULT_EMAIL_FETCH_LIMIT.toString()}
                type="number"
              />
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
        )}
      </CardContent>
    </Card>
  );
}
