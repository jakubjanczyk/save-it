"use client";

import type { GenericId } from "convex/values";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { formatArchiveMessage } from "./format-archive-message";

export function useArchiveEmail(params: {
  emailId: GenericId<"emails"> | null;
  archive: (args: { emailId: GenericId<"emails"> }) => Promise<{
    discarded: number;
  }>;
}) {
  const router = useRouter();

  return async () => {
    if (!params.emailId) {
      return;
    }

    try {
      const result = await params.archive({ emailId: params.emailId });
      toast.success(formatArchiveMessage(result.discarded));
      router.push("/inbox");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Archive failed");
    }
  };
}
