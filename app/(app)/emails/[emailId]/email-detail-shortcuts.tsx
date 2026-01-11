"use client";

import type { GenericId } from "convex/values";
import { useRouter } from "next/navigation";

import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";

export function EmailDetailShortcuts(props: {
  enabled: boolean;
  onDiscard: () => Promise<void>;
  onMarkAsRead: () => Promise<void>;
  onNextLink: () => void;
  onOpen: () => void;
  onPrevLink: () => void;
  onSave: () => Promise<void>;
  nextEmailId?: GenericId<"emails">;
  prevEmailId?: GenericId<"emails">;
}) {
  const router = useRouter();

  return (
    <KeyboardShortcuts
      context="list"
      enabled={props.enabled}
      onDiscard={props.onDiscard}
      onMarkAsRead={props.onMarkAsRead}
      onNextEmail={
        props.nextEmailId
          ? () => {
              router.push(`/emails/${props.nextEmailId}`);
            }
          : undefined
      }
      onNextLink={props.onNextLink}
      onOpen={props.onOpen}
      onPrevEmail={
        props.prevEmailId
          ? () => {
              router.push(`/emails/${props.prevEmailId}`);
            }
          : undefined
      }
      onPrevLink={props.onPrevLink}
      onSave={props.onSave}
      onToggleView={() => {
        router.push("/match");
      }}
    />
  );
}
