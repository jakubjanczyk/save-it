"use client";

import { useMutation } from "convex/react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  parseBackgroundSyncEnabled,
  parseBackgroundSyncLocalHour,
  parseBackgroundSyncTimeZone,
} from "@/lib/settings";
import {
  BACKGROUND_SYNC_ENABLED_SETTING_KEY,
  BACKGROUND_SYNC_LOCAL_HOUR_SETTING_KEY,
  BACKGROUND_SYNC_TIME_ZONE_SETTING_KEY,
} from "@/lib/settings-keys";
import { buildTimeZoneOptions, detectTimeZone } from "@/lib/time-zones";
import { cn } from "@/lib/utils";

import { setSettings } from "./convex-refs";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  label: `${hour.toString().padStart(2, "0")}:00`,
  value: hour.toString(),
}));

export function BackgroundSyncSettingsCard(props: {
  storedEnabled: string | null;
  storedLocalHour: string | null;
  storedTimeZone: string | null;
}) {
  const router = useRouter();
  const saveSettings = useMutation(setSettings);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const detectedTimeZone = useMemo(() => detectTimeZone(), []);
  const initialTimeZone = useMemo(
    () => parseBackgroundSyncTimeZone(props.storedTimeZone ?? detectedTimeZone),
    [detectedTimeZone, props.storedTimeZone]
  );
  const timeZoneOptions = useMemo(
    () => buildTimeZoneOptions(detectedTimeZone, initialTimeZone),
    [detectedTimeZone, initialTimeZone]
  );

  const [enabled, setEnabled] = useState(() =>
    parseBackgroundSyncEnabled(props.storedEnabled)
  );
  const [localHour, setLocalHour] = useState(() =>
    parseBackgroundSyncLocalHour(props.storedLocalHour)
  );
  const [timeZone, setTimeZone] = useState(initialTimeZone);
  const [timeZoneOpen, setTimeZoneOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Background sync</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form
          className="grid gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);

            setSaving(true);
            try {
              await saveSettings({
                entries: [
                  {
                    key: BACKGROUND_SYNC_ENABLED_SETTING_KEY,
                    value: enabled ? "true" : "false",
                  },
                  {
                    key: BACKGROUND_SYNC_LOCAL_HOUR_SETTING_KEY,
                    value: localHour.toString(),
                  },
                  {
                    key: BACKGROUND_SYNC_TIME_ZONE_SETTING_KEY,
                    value: parseBackgroundSyncTimeZone(timeZone),
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
          <label className="flex items-center gap-2 font-medium text-sm">
            <input
              checked={enabled}
              className="h-4 w-4"
              name="backgroundSyncEnabled"
              onChange={(event) => {
                setEnabled(event.target.checked);
              }}
              type="checkbox"
            />
            Enable background sync
          </label>

          <label className="mt-2 font-medium text-sm" htmlFor="sync-hour">
            Run daily at
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-invalid={error != null}
              className="h-9 w-44 min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] md:text-sm dark:bg-input/30"
              id="sync-hour"
              name="backgroundSyncLocalHour"
              onChange={(event) => {
                setLocalHour(parseBackgroundSyncLocalHour(event.target.value));
              }}
              value={localHour.toString()}
            >
              {HOUR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <label className="mt-2 font-medium text-sm" htmlFor="sync-timezone">
            Time zone
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Popover onOpenChange={setTimeZoneOpen} open={timeZoneOpen}>
              <PopoverTrigger asChild>
                <Button
                  aria-invalid={error != null}
                  aria-label="Time zone"
                  className="w-72 justify-between"
                  role="combobox"
                  type="button"
                  variant="outline"
                >
                  <span className="min-w-0 truncate">{timeZone}</span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" sideOffset={8}>
                <Command>
                  <CommandInput placeholder="Search time zones…" />
                  <CommandList>
                    <CommandEmpty>No time zone found.</CommandEmpty>
                    <CommandGroup>
                      {timeZoneOptions.map((option) => (
                        <CommandItem
                          key={option}
                          onSelect={() => {
                            setTimeZone(option);
                            setTimeZoneOpen(false);
                          }}
                          value={option}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              timeZone === option ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {option}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button disabled={saving} size="sm" type="submit">
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>

          <div className="text-muted-foreground text-sm">
            Schedule uses this time zone. Detected: {detectedTimeZone}.
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
