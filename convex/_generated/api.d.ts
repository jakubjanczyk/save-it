/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as emails from "../emails.js";
import type * as emailsGmailHelpers from "../emailsGmailHelpers.js";
import type * as emailsProcessingHelpers from "../emailsProcessingHelpers.js";
import type * as emailsSyncRunHelpers from "../emailsSyncRunHelpers.js";
import type * as googleauth from "../googleauth.js";
import type * as links from "../links.js";
import type * as raindropauth from "../raindropauth.js";
import type * as senders from "../senders.js";
import type * as settings from "../settings.js";
import type * as sync_logs from "../sync/logs.js";
import type * as syncruns from "../syncruns.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  emails: typeof emails;
  emailsGmailHelpers: typeof emailsGmailHelpers;
  emailsProcessingHelpers: typeof emailsProcessingHelpers;
  emailsSyncRunHelpers: typeof emailsSyncRunHelpers;
  googleauth: typeof googleauth;
  links: typeof links;
  raindropauth: typeof raindropauth;
  senders: typeof senders;
  settings: typeof settings;
  "sync/logs": typeof sync_logs;
  syncruns: typeof syncruns;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
