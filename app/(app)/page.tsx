import { InboxClient } from "./inbox-client";

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Inbox</h1>
        <p className="text-muted-foreground text-sm">
          Triage newsletters and save links.
        </p>
      </div>

      <InboxClient />
    </div>
  );
}
