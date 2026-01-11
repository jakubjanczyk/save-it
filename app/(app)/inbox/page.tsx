import { fetchQuery } from "convex/nextjs";

import { EmailList } from "@/components/email-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireEnv } from "@/lib/require-env";

import { listWithPendingLinks } from "../home-convex-refs";
import { InboxFetchEmailsCard } from "../inbox-fetch-emails-card";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const convexUrl = requireEnv("NEXT_PUBLIC_CONVEX_URL");
  const emails = await fetchQuery(listWithPendingLinks, {}, { url: convexUrl });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Inbox</h1>
        <p className="text-muted-foreground text-sm">
          Triage newsletters and save links.
        </p>
      </div>

      <div className="grid gap-6">
        <InboxFetchEmailsCard />

        <Card>
          <CardHeader>
            <CardTitle>Inbox</CardTitle>
          </CardHeader>
          <CardContent>
            <EmailList
              emails={emails.map((email) => ({
                extractionError: email.extractionError,
                from: email.from,
                id: email._id,
                pendingLinkCount: email.pendingLinkCount,
                receivedAt: email.receivedAt,
                subject: email.subject,
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
