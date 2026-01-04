import { describe, expect, test } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  test("joins classnames", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  test("filters falsy values and merges Tailwind classes", () => {
    expect(cn("p-2", false, undefined, null, "p-4")).toBe("p-4");
  });
});
