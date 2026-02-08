import { expect, test } from "vitest";

import { isJavaScriptRequiredHtml } from "./is-javascript-required";

test("returns true for noscript enable-javascript interstitials", () => {
  expect(
    isJavaScriptRequiredHtml(
      "<html><body><noscript>Please enable JavaScript to continue.</noscript></body></html>"
    )
  ).toBe(true);
});

test("returns true for 'JavaScript is not available' pages", () => {
  expect(
    isJavaScriptRequiredHtml(
      "<html><body>JavaScript is not available.</body></html>"
    )
  ).toBe(true);
});

test("returns false for normal articles", () => {
  expect(
    isJavaScriptRequiredHtml(
      "<html><body><main><h1>Title</h1><p>Hello world</p></main></body></html>"
    )
  ).toBe(false);
});
