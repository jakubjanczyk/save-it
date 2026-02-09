import { describe, expect, test, vi } from "vitest";

import { fetchHtml } from "./fetch-html";

const HTTP_ERROR = /http/i;
const CONTENT_TYPE_ERROR = /content-type/i;
const SIZE_ERROR = /size/i;
const UNSAFE_HOST_ERROR = /unsafe url host/i;
const PRIVATE_NETWORK_ERROR = /private network/i;
const CREDENTIALS_ERROR = /credentials/i;

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
      fetchHtml(fetcher, "https://example.com", {
        maxBytes: 10,
      })
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

  test("rejects localhost hostnames", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(
        new Response("<html>Hello</html>", {
          headers: { "content-type": "text/html" },
          status: 200,
        })
      )
    );

    await expect(fetchHtml(fetcher, "http://localhost/")).rejects.toThrow(
      UNSAFE_HOST_ERROR
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  test("rejects private IPv4 literals", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(
        new Response("<html>Hello</html>", {
          headers: { "content-type": "text/html" },
          status: 200,
        })
      )
    );

    await expect(fetchHtml(fetcher, "http://127.0.0.1/")).rejects.toThrow(
      PRIVATE_NETWORK_ERROR
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  test("rejects URL credentials", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(
        new Response("<html>Hello</html>", {
          headers: { "content-type": "text/html" },
          status: 200,
        })
      )
    );

    await expect(
      fetchHtml(fetcher, "https://user:pass@example.com")
    ).rejects.toThrow(CREDENTIALS_ERROR);
    expect(fetcher).not.toHaveBeenCalled();
  });

  test("rejects redirects to private-network targets", async () => {
    const fetcher = vi.fn((_input: string) =>
      Promise.resolve(Response.redirect("http://127.0.0.1/", 302))
    );

    await expect(fetchHtml(fetcher, "https://example.com")).rejects.toThrow(
      PRIVATE_NETWORK_ERROR
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
