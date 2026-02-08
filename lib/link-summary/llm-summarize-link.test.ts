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
      })
    ).toThrow();

    expect(
      articleLinkSummarySchema.parse({
        tldr: "TL;DR",
        longSummary: "Long summary",
      })
    ).toEqual({
      tldr: "TL;DR",
      longSummary: "Long summary",
    });
  });

  test("github schema forbids longSummary", () => {
    expect(() =>
      githubLinkSummarySchema.parse({
        tldr: "TL;DR",
        longSummary: "Should not be here",
      })
    ).toThrow();
  });
});
