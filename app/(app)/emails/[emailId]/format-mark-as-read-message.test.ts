import { expect, test } from "vitest";

import { formatMarkAsReadMessage } from "./format-mark-as-read-message";

test("renders message without suffix when discarded is 0", () => {
  expect(formatMarkAsReadMessage(0)).toBe("Marked as read.");
});

test("renders message with singular link suffix when discarded is 1", () => {
  expect(formatMarkAsReadMessage(1)).toBe(
    "Marked as read. Discarded 1 pending link."
  );
});

test("renders message with plural links suffix when discarded is 2", () => {
  expect(formatMarkAsReadMessage(2)).toBe(
    "Marked as read. Discarded 2 pending links."
  );
});
