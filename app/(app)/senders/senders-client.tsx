"use client";

import { useMutation, useQuery } from "convex/react";
import type { GenericId } from "convex/values";

import { SenderForm } from "@/components/sender-form";
import { SenderList } from "@/components/sender-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { addSender, listSenders, removeSender } from "./convex-refs";

export function SendersClient() {
  const senders = useQuery(listSenders, {});
  const add = useMutation(addSender);
  const remove = useMutation(removeSender);

  if (senders === undefined) {
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
            <CardTitle>Loading</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const sortedSenders = [...senders].sort((a, b) =>
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
