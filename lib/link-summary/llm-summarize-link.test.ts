import { describe, expect, test } from "vitest";

import {
  articleLinkSummarySchema,
  githubLinkSummarySchema,
} from "./llm-summarize-link";

describe("link summary schemas", () => {
  test("article schema requires longSummary", () => {
    expect(() =>
      articleLinkSummarySchema.parse({
        tldr: "TL;DR",
        worthReading: "yes",
        worthReadingReason: "Reason",
        credibility: "high",
        credibilityReason: "Reason",
      })
    ).toThrow();

    expect(
      articleLinkSummarySchema.parse({
        tldr: "TL;DR",
        worthReading: "yes",
        worthReadingReason: "Reason",
        credibility: "high",
        credibilityReason: "Reason",
        longSummary: "Long summary",
      })
    ).toEqual({
      tldr: "TL;DR",
      worthReading: "yes",
      worthReadingReason: "Reason",
      credibility: "high",
      credibilityReason: "Reason",
      longSummary: "Long summary",
    });
  });

  test("github schema forbids longSummary", () => {
    expect(() =>
      githubLinkSummarySchema.parse({
        tldr: "TL;DR",
        worthReading: "maybe",
        worthReadingReason: "Reason",
        credibility: "unknown",
        credibilityReason: "Reason",
        longSummary: "Should not be here",
      })
    ).toThrow();
  });
});
