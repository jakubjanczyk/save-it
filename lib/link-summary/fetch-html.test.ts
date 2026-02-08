import { describe, expect, test, vi } from "vitest";

import { fetchHtml } from "./fetch-html";

const HTTP_ERROR = /http/i;
const CONTENT_TYPE_ERROR = /content-type/i;
const SIZE_ERROR = /size/i;

describe("fetchHtml", () => {
  test("rejects non-HTTP(S) URLs", async () => {
    await expect(fetchHtml(fetch, "file:///etc/passwd")).rejects.toThrow(
      HTTP_ERROR
    );
  });

  test("rejects non-HTML content types", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(
        new Response("{}", {
          headers: { "content-type": "application/json" },
          status: 200,
        })
      )
    );

    await expect(fetchHtml(fetcher, "https://example.com")).rejects.toThrow(
      CONTENT_TYPE_ERROR
    );
  });

  test("enforces max response size", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(
        new Response("x".repeat(20), {
          headers: { "content-type": "text/html; charset=utf-8" },
          status: 200,
        })
      )
    );

    await expect(
      fetchHtml(fetcher, "https://example.com", { maxBytes: 10 })
    ).rejects.toThrow(SIZE_ERROR);
  });

  test("returns finalUrl + html", async () => {
    const fetcher = vi.fn(() => {
      const response = new Response("<html>Hello</html>", {
        headers: { "content-type": "text/html" },
        status: 200,
      });
      Object.defineProperty(response, "url", {
        value: "https://example.com/final",
      });
      return Promise.resolve(response);
    });

    await expect(fetchHtml(fetcher, "https://example.com")).resolves.toEqual({
      finalUrl: "https://example.com/final",
      html: "<html>Hello</html>",
    });
  });
});
