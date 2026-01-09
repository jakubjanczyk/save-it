"use client";

import type { GenericId } from "convex/values";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { formatMarkAsReadMessage } from "./format-mark-as-read-message";

export function useMarkEmailAsRead(params: {
  emailId: GenericId<"emails"> | null;
  markAsRead: (args: { emailId: GenericId<"emails"> }) => Promise<{
    discarded: number;
  }>;
}) {
  const router = useRouter();

  return async () => {
    if (!params.emailId) {
      return;
    }

    try {
      const result = await params.markAsRead({
        emailId: params.emailId,
      });
      toast.success(formatMarkAsReadMessage(result.discarded));
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Mark as read failed"
      );
    }
  };
}
