"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { LoginState } from "./actions";
import { login } from "./actions";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-background p-4 text-foreground sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.22_0.02_55)_0%,transparent_60%)]" />
      <Card className="relative w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Login to Save it</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="grid gap-4">
            <div className="grid gap-2">
              <label className="font-medium text-sm" htmlFor="password">
                Password
              </label>
              <Input
                autoComplete="current-password"
                id="password"
                name="password"
                required
                type="password"
              />
            </div>

            {state.error && (
              <p className="text-destructive text-sm" role="alert">
                {state.error}
              </p>
            )}

            <Button disabled={isPending} type="submit">
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
