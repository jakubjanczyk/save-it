"use client";

import { useMutation } from "convex/react";
import type { GenericId } from "convex/values";
import { useRouter } from "next/navigation";

import { SenderForm } from "@/components/sender-form";
import { SenderList } from "@/components/sender-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { SenderDoc } from "./convex-refs";
import { addSender, removeSender } from "./convex-refs";

export function SendersClient(props: { senders: SenderDoc[] }) {
  const router = useRouter();
  const add = useMutation(addSender);
  const remove = useMutation(removeSender);

  const sortedSenders = [...props.senders].sort((a, b) =>
    a.email.localeCompare(b.email)
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Senders</h1>
        <p className="text-muted-foreground text-sm">
          Configure which newsletters we should process.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add sender</CardTitle>
        </CardHeader>
        <CardContent>
          <SenderForm
            onSubmit={async (values) => {
              await add({ email: values.email, name: values.name });
              router.refresh();
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing senders</CardTitle>
        </CardHeader>
        <CardContent>
          <SenderList
            onDelete={async (senderId) => {
              await remove({ senderId: senderId as GenericId<"senders"> });
              router.refresh();
            }}
            senders={sortedSenders.map((sender) => ({
              email: sender.email,
              id: sender._id,
              name: sender.name,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
