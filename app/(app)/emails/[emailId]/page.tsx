import { fetchQuery } from "convex/nextjs";

import { requireEnv } from "@/lib/require-env";

import { listLinksByEmail, listWithPendingLinks } from "../../home-convex-refs";

import { EmailNotInQueueCard } from "./email-not-in-queue-card";
import { getEmailIdParam } from "./get-email-id-param";
import { InvalidEmailCard } from "./invalid-email-card";
import { EmailDetailClient } from "./page-client";
import { getEmailNavigation } from "./use-email-navigation";

export const dynamic = "force-dynamic";

export default async function EmailPage(props: {
  params: { emailId: string } | Promise<{ emailId: string }>;
}) {
  const params = await props.params;
  const emailId = getEmailIdParam(params.emailId);
  if (!emailId) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
        <InvalidEmailCard />
      </div>
    );
  }

  const convexUrl = requireEnv("NEXT_PUBLIC_CONVEX_URL");
  const emails = await fetchQuery(listWithPendingLinks, {}, { url: convexUrl });
  const { email, nextEmailId, prevEmailId } = getEmailNavigation(
    emails,
    emailId
  );

  if (!email) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
        <EmailNotInQueueCard />
      </div>
    );
  }

  const links = await fetchQuery(
    listLinksByEmail,
    { emailId },
    { url: convexUrl }
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <EmailDetailClient
        email={email}
        links={links}
        nextEmailId={nextEmailId ?? undefined}
        prevEmailId={prevEmailId ?? undefined}
      />
    </div>
  );
}
