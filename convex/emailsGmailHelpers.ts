import type { GenericId } from "convex/values";
import { Effect } from "effect";

import {
  fetchEmails,
  fetchMessageFull,
  type GmailFullMessage,
  type GmailMessage,
  type StoredTokens,
  withFreshToken,
} from "../lib/gmail";
import { refreshGoogleAccessToken } from "../lib/google-oauth";

import { api, internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";

export interface GmailClient {
  getMessage: (
    messageId: string
  ) => Effect.Effect<GmailFullMessage, unknown, never>;
  listMessages: (
    senderPatterns: readonly string[],
    maxResults: number
  ) => Effect.Effect<GmailMessage[], unknown, never>;
}

export function createGoogleTokenFlow(ctx: ActionCtx) {
  const loadTokens = async (): Promise<StoredTokens> => {
    const tokens = await ctx.runQuery(api.googleauth.getTokens, {});
    if (!tokens) {
      throw new Error("Gmail not connected");
    }
    return {
      accessToken: tokens.accessToken,
      expiresAt: tokens.expiresAt,
      refreshToken: tokens.refreshToken,
    };
  };

  const persistTokens = async (tokens: StoredTokens) => {
    await ctx.runMutation(api.googleauth.saveTokens, {
      accessToken: tokens.accessToken,
      expiresAt: tokens.expiresAt,
      refreshToken: tokens.refreshToken,
    });
  };

  const refreshTokens = async (refreshToken: string): Promise<StoredTokens> => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!(clientId && clientSecret)) {
      throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
    }

    return await refreshGoogleAccessToken({
      env: { clientId, clientSecret },
      refreshToken,
    });
  };

  return { loadTokens, persistTokens, refreshTokens };
}

export function createGmailClient(ctx: ActionCtx): GmailClient {
  const { loadTokens, persistTokens, refreshTokens } =
    createGoogleTokenFlow(ctx);

  const run = <A, E>(operation: (accessToken: string) => Effect.Effect<A, E>) =>
    withFreshToken(loadTokens, persistTokens, operation, { refreshTokens });

  return {
    getMessage: (messageId) =>
      run((accessToken) => fetchMessageFull(accessToken, messageId)),
    listMessages: (senderPatterns, maxResults) =>
      run((accessToken) =>
        fetchEmails(accessToken, senderPatterns, { maxResults })
      ) as Effect.Effect<GmailMessage[], unknown, never>,
  };
}

export type GmailFinalizeOperation = (
  accessToken: string,
  gmailId: string
) => Effect.Effect<void, unknown>;

export async function finalizeEmailInGmail(
  ctx: ActionCtx,
  emailId: GenericId<"emails">,
  operation: GmailFinalizeOperation
): Promise<{ discarded: number }> {
  const email = await ctx.runQuery(internal.emails.getEmail, { emailId });

  if (!email) {
    throw new Error("Email not found");
  }

  if (email.markedAsRead) {
    return { discarded: 0 };
  }

  const { loadTokens, persistTokens, refreshTokens } =
    createGoogleTokenFlow(ctx);

  const program = withFreshToken(
    loadTokens,
    persistTokens,
    (accessToken) => operation(accessToken, email.gmailId),
    { refreshTokens }
  );

  await Effect.runPromise(program);

  const discardResult: { discarded: number } = await ctx.runMutation(
    internal.emails.discardPendingLinks,
    {
      emailId,
    }
  );

  await ctx.runMutation(internal.emails.markEmailAsRead, {
    emailId,
    processedAt: Date.now(),
  });

  return { discarded: discardResult.discarded };
}
