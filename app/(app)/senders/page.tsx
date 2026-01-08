import { fetchQuery } from "convex/nextjs";

import { requireEnv } from "@/lib/require-env";

import { listSenders } from "./convex-refs";
import { SendersClient } from "./senders-client";

export const dynamic = "force-dynamic";

export default async function SendersPage() {
  const convexUrl = requireEnv("NEXT_PUBLIC_CONVEX_URL");
  const senders = await fetchQuery(listSenders, {}, { url: convexUrl });
  return <SendersClient senders={senders} />;
}
