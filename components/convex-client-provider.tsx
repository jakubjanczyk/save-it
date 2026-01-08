"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { requireEnv } from "@/lib/require-env";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convexUrl = requireEnv("NEXT_PUBLIC_CONVEX_URL");

  const client = useMemo(() => {
    return new ConvexReactClient(convexUrl);
  }, [convexUrl]);

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
