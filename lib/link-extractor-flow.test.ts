import { Effect } from "effect";
import { expect, test, vi } from "vitest";

import { extractLinks } from "./link-extractor";

test("extractLinks returns Substack link and skips LLM when Substack shortcut matches", async () => {
  const llmExtract = vi.fn(() => Effect.succeed([]));

  const result = await Effect.runPromise(
    extractLinks(
      `<a href="https://substack.com/app-link/post/abc">Read</a>`,
      "Hello",
      "newsletter@substack.com",
      { llmExtract }
    )
  );

  expect(result).toEqual([
    {
      description: "Hello",
      title: "Hello",
      url: "https://substack.com/app-link/post/abc",
    },
  ]);
  expect(llmExtract).not.toHaveBeenCalled();
});

test("extractLinks falls back to LLM when Substack sender has no link", async () => {
  const llmExtract = vi.fn(() =>
    Effect.succeed([
      { description: "A", title: "A title", url: "https://example.com/a" },
    ])
  );

  const result = await Effect.runPromise(
    extractLinks("<html></html>", "Hello", "newsletter@substack.com", {
      llmExtract,
    })
  );

  expect(result).toEqual([
    { description: "A", title: "A title", url: "https://example.com/a" },
  ]);
  expect(llmExtract).toHaveBeenCalledTimes(1);
});

test("extractLinks falls back to LLM when sender is not Substack", async () => {
  const llmExtract = vi.fn(() =>
    Effect.succeed([
      { description: "A", title: "A title", url: "https://example.com/a" },
    ])
  );

  const result = await Effect.runPromise(
    extractLinks("<html></html>", "Hello", "someone@example.com", {
      llmExtract,
    })
  );

  expect(result).toEqual([
    { description: "A", title: "A title", url: "https://example.com/a" },
  ]);
  expect(llmExtract).toHaveBeenCalledTimes(1);
});
