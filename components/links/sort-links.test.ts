import { expect, test } from "vitest";

import { sortLinksByStatus } from "./sort-links";

test("sorts pending links before saved links", () => {
  const result = sortLinksByStatus([
    { id: "s1", status: "saved" as const },
    { id: "p1", status: "pending" as const },
  ]);

  expect(result.map((link) => link.id)).toEqual(["p1", "s1"]);
});

test("does not mutate the input array", () => {
  const input = [
    { id: "s1", status: "saved" as const },
    { id: "p1", status: "pending" as const },
  ];

  sortLinksByStatus(input);

  expect(input.map((link) => link.id)).toEqual(["s1", "p1"]);
});

test("sorts discarded before saved within actioned links", () => {
  const result = sortLinksByStatus([
    { id: "s1", status: "saved" as const },
    { id: "d1", status: "discarded" as const },
  ]);

  expect(result.map((link) => link.id)).toEqual(["d1", "s1"]);
});
