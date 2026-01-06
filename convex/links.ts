import { type FunctionReference, makeFunctionReference } from "convex/server";
import type { GenericId } from "convex/values";
import { v } from "convex/values";
import { Effect } from "effect";

import { createRaindropBookmark } from "../lib/raindrop";

import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

interface LinkDoc {
  _id: GenericId<"links">;
  description: string;
  emailId: GenericId<"emails">;
  raindropId?: string;
  savedAt?: number;
  status: "pending" | "saved" | "discarded";
  title: string;
  url: string;
}

interface RaindropTokens extends Record<string, unknown> {
  accessToken: string;
  expiresAt?: number;
  refreshToken?: string;
}

const getRaindropTokens: FunctionReference<
  "query",
  "public",
  Record<string, never>,
  RaindropTokens | null
> = makeFunctionReference("raindropauth:getTokens");

const getLinkRef = makeFunctionReference(
  "links:getLink"
) as unknown as FunctionReference<
  "query",
  "internal",
  { linkId: GenericId<"links"> },
  LinkDoc | null
>;

const markSavedRef = makeFunctionReference(
  "links:markSaved"
) as unknown as FunctionReference<
  "mutation",
  "internal",
  { linkId: GenericId<"links">; raindropId: string; savedAt: number },
  null
>;

export const listByEmail = query({
  args: { emailId: v.id("emails") },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("links")
      .withIndex("by_emailId", (q) => q.eq("emailId", args.emailId))
      .collect();

    return links;
  },
});

export const discard = mutation({
  args: { linkId: v.id("links") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.linkId, {
      status: "discarded",
    });

    return null;
  },
});

export const getLink = internalQuery({
  args: { linkId: v.id("links") },
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.linkId);
    return link ?? null;
  },
});

export const markSaved = internalMutation({
  args: { linkId: v.id("links"), raindropId: v.string(), savedAt: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.linkId, {
      raindropId: args.raindropId,
      savedAt: args.savedAt,
      status: "saved",
    });

    return null;
  },
});

export const save = action({
  args: { linkId: v.id("links") },
  handler: async (ctx, args) => {
    const tokens = await ctx.runQuery(getRaindropTokens, {});
    if (!tokens) {
      throw new Error("Raindrop not connected");
    }

    const link = await ctx.runQuery(getLinkRef, {
      linkId: args.linkId as GenericId<"links">,
    });

    if (!link) {
      throw new Error("Link not found");
    }

    if (link.status !== "pending") {
      return { raindropId: link.raindropId ?? null };
    }

    const raindropId = await Effect.runPromise(
      createRaindropBookmark(tokens.accessToken, {
        description: link.description,
        title: link.title,
        url: link.url,
      })
    );

    await ctx.runMutation(markSavedRef, {
      linkId: args.linkId as GenericId<"links">,
      raindropId,
      savedAt: Date.now(),
    });

    return { raindropId };
  },
});
