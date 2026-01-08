import { FocusClient } from "./page-client";

export default function FocusPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Focus</h1>
        <p className="text-muted-foreground text-sm">
          Save or discard links one by one. Press ? for shortcuts.
        </p>
      </div>

      <FocusClient />
    </div>
  );
}
