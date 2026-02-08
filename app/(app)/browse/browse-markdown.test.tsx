import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { BrowseMarkdown } from "./browse-markdown";

afterEach(() => {
  cleanup();
});

test("renders ordered list as a single list even with blank lines", () => {
  render(<BrowseMarkdown markdown={"1. one\n\n1. two\n\n1. three"} />);

  const list = screen.getByRole("list");
  const items = within(list).getAllByRole("listitem");
  expect(items).toHaveLength(3);
  expect(items.map((item) => item.textContent)).toEqual([
    "one",
    "two",
    "three",
  ]);
});
