import { expect, test, vi } from "vitest";

import { openInNewTab } from "./open-in-new-tab";

test("opens the URL in a new tab with noopener/noreferrer", () => {
  const openSpy = vi.fn();
  vi.stubGlobal("open", openSpy);

  openInNewTab("https://example.com");

  expect(openSpy).toHaveBeenCalledWith(
    "https://example.com",
    "_blank",
    "noopener,noreferrer"
  );

  vi.unstubAllGlobals();
});
