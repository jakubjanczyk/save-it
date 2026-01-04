"use client";

import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface SenderFormValues {
  email: string;
  name?: string;
}

export interface SenderFormProps {
  onSubmit: (values: SenderFormValues) => Promise<void> | void;
}

export function SenderForm({ onSubmit }: SenderFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (!trimmedEmail) {
      setError("Email is required");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        email: trimmedEmail,
        name: trimmedName ? trimmedName : undefined,
      });
      setEmail("");
      setName("");
    } catch {
      setError("Failed to add sender");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <label className="font-medium text-sm" htmlFor="sender-email">
          Sender email
        </label>
        <Input
          autoComplete="email"
          id="sender-email"
          inputMode="email"
          name="email"
          onChange={(event) => {
            setEmail(event.target.value);
            setError(null);
          }}
          placeholder="newsletter@example.com"
          type="email"
          value={email}
        />
      </div>

      <div className="grid gap-2">
        <label className="font-medium text-sm" htmlFor="sender-name">
          Name (optional)
        </label>
        <Input
          autoComplete="organization"
          id="sender-name"
          name="name"
          onChange={(event) => {
            setName(event.target.value);
          }}
          placeholder="Substack newsletter"
          type="text"
          value={name}
        />
      </div>

      {error ? (
        <div className="text-destructive text-sm" role="alert">
          {error}
        </div>
      ) : null}

      <Button disabled={isSubmitting} type="submit">
        Add sender
      </Button>
    </form>
  );
}
