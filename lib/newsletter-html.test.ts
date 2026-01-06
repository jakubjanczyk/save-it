import { expect, test } from "vitest";

import { stripNewsletterHtmlForLlm } from "./newsletter-html";

test("stripNewsletterHtmlForLlm removes script and style contents", () => {
  const result = stripNewsletterHtmlForLlm(
    `<style>.x{display:none}</style><script>alert("x")</script><p>Hello</p>`
  );

  expect(result).toBe("Hello");
});

test("stripNewsletterHtmlForLlm preserves anchor hrefs as text", () => {
  const result = stripNewsletterHtmlForLlm(
    `<p><a href="https://example.com/a">Read more</a></p>`
  );

  expect(result).toBe("[Read more](https://example.com/a)");
});

test("stripNewsletterHtmlForLlm removes unsubscribe links by anchor text", () => {
  const result = stripNewsletterHtmlForLlm(
    `<p><a href="https://example.com/unsub">Unsubscribe</a> Keep</p>`
  );

  expect(result.includes("Unsubscribe")).toBe(false);
});

test("stripNewsletterHtmlForLlm keeps links when unsubscribe is not exact match", () => {
  const result = stripNewsletterHtmlForLlm(
    `<p><a href="https://example.com/unsub">Click to unsubscribe</a> Keep</p>`
  );

  expect(result.includes("unsubscribe")).toBe(true);
});

test("stripNewsletterHtmlForLlm removes sponsor links by anchor text", () => {
  const result = stripNewsletterHtmlForLlm(
    `<p><a href="https://example.com/sponsor">(Sponsor)</a> Keep</p>`
  );

  expect(result.includes("Sponsor")).toBe(false);
});

test("stripNewsletterHtmlForLlm removes images", () => {
  const result = stripNewsletterHtmlForLlm(
    `<p><img src="https://example.com/a.png" /> Hello</p>`
  );

  expect(result).toBe("Hello");
});
