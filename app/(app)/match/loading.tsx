import { FocusLoadingCard } from "./focus-loading-card";

export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Match</h1>
        <p className="hidden text-muted-foreground text-sm sm:block">
          Save or discard links one by one. Press ? for shortcuts.
        </p>
      </div>

      <FocusLoadingCard />
    </div>
  );
}
