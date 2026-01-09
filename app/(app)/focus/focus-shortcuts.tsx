"use client";

import { useRouter } from "next/navigation";

import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";

export function FocusShortcuts(props: {
  enabled: boolean;
  onDiscard?: () => Promise<void> | void;
  onOpen?: () => void;
  onSave?: () => Promise<void> | void;
}) {
  const router = useRouter();

  return (
    <KeyboardShortcuts
      context="focus"
      enabled={props.enabled}
      onDiscard={props.onDiscard}
      onOpen={props.onOpen}
      onSave={props.onSave}
      onToggleView={() => {
        router.push("/");
      }}
    />
  );
}
