import type { FunctionReference } from "convex/server";
import { makeFunctionReference } from "convex/server";
import type { GenericId } from "convex/values";

export interface SavedLinkItem {
  archivedAt?: number;
  description: string;
  id: GenericId<"links">;
  isFavorite: boolean;
  raindropId?: string;
  savedAt?: number;
  summaryAttemptCount?: number;
  summaryContentKind?: "article" | "github" | "other";
  summaryCredibility?: "high" | "medium" | "low" | "unknown";
  summaryCredibilityReason?: string;
  summaryErrorMessage?: string;
  summaryErrorStage?: "fetch" | "extract" | "llm" | "parse";
  summaryExtractedTitle?: string;
  summaryExtractedTitleSource?: "h1" | "og" | "twitter" | "title" | "llm";
  summaryLongSummary?: string;
  summaryModel?: string;
  summaryPromptVersion?: string;
  summaryStatus?: "pending" | "running" | "success" | "failed";
  summaryTldr?: string;
  summaryUpdatedAt?: number;
  summaryWorthReading?: "yes" | "maybe" | "no";
  summaryWorthReadingReason?: string;
  title: string;
  url: string;
}

export const listSaved: FunctionReference<
  "query",
  "public",
  {
    cursor?: string;
    limit: number;
    sortOrder: "oldest" | "newest";
  },
  {
    continueCursor: string | null;
    isDone: boolean;
    items: SavedLinkItem[];
  }
> = makeFunctionReference("links:listSaved");

export const archiveLink: FunctionReference<
  "action",
  "public",
  { linkId: GenericId<"links"> },
  null
> = makeFunctionReference("links:archive");

export const toggleFavoriteAction: FunctionReference<
  "action",
  "public",
  { linkId: GenericId<"links"> },
  { isFavorite: boolean }
> = makeFunctionReference("links:toggleFavoriteAction");

export const sendToRaindrop: FunctionReference<
  "action",
  "public",
  { linkId: GenericId<"links"> },
  { raindropId: string }
> = makeFunctionReference("links:sendToRaindrop");

export const getSetting: FunctionReference<
  "query",
  "public",
  { key: string },
  string | null
> = makeFunctionReference("settings:get");
