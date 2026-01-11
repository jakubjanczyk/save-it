import { expect, test } from "vitest";

import { formatArchiveMessage } from "./format-archive-message";

test("renders message without suffix when discarded is 0", () => {
  expect(formatArchiveMessage(0)).toBe("Archived.");
});

test("renders message with singular link suffix when discarded is 1", () => {
  expect(formatArchiveMessage(1)).toBe("Archived. Discarded 1 pending link.");
});

test("renders message with plural links suffix when discarded is 2", () => {
  expect(formatArchiveMessage(2)).toBe("Archived. Discarded 2 pending links.");
});
