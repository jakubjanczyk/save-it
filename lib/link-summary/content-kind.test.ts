import { describe, expect, test } from "vitest";

import { classifyContentKind } from "./content-kind";

describe("classifyContentKind", () => {
  test("classifies github.com URLs as github", () => {
    expect(classifyContentKind("https://github.com/openai/openai")).toBe(
      "github"
    );
  });

  test("classifies other valid URLs as article", () => {
    expect(classifyContentKind("https://example.com/post")).toBe("article");
  });

  test("classifies invalid URLs as other", () => {
    expect(classifyContentKind("not-a-url")).toBe("other");
  });

  test("classifies non-HTTP(S) URLs as other", () => {
    expect(classifyContentKind("ftp://example.com/file")).toBe("other");
  });
});
