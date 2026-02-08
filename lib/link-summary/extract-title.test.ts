import { describe, expect, test } from "vitest";

import { extractBestTitleFromHtml } from "./extract-title";

describe("extractBestTitleFromHtml", () => {
  test("prefers h1 over meta/title candidates", () => {
    const html = `
      <html>
        <head>
          <title>Title Tag</title>
          <meta property="og:title" content="OG Title" />
          <meta name="twitter:title" content="Twitter Title" />
        </head>
        <body>
          <h1>Heading Title</h1>
        </body>
      </html>
    `;

    expect(extractBestTitleFromHtml(html)).toEqual({
      source: "h1",
      title: "Heading Title",
    });
  });

  test("falls back to og:title", () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="OG Title" />
        </head>
        <body></body>
      </html>
    `;

    expect(extractBestTitleFromHtml(html)).toEqual({
      source: "og",
      title: "OG Title",
    });
  });

  test("falls back to twitter:title", () => {
    const html = `
      <html>
        <head>
          <meta name="twitter:title" content="Twitter Title" />
        </head>
        <body></body>
      </html>
    `;

    expect(extractBestTitleFromHtml(html)).toEqual({
      source: "twitter",
      title: "Twitter Title",
    });
  });

  test("falls back to <title>", () => {
    const html = `
      <html>
        <head>
          <title>Title Tag</title>
        </head>
        <body></body>
      </html>
    `;

    expect(extractBestTitleFromHtml(html)).toEqual({
      source: "title",
      title: "Title Tag",
    });
  });

  test("returns null when no title is present", () => {
    expect(extractBestTitleFromHtml("<html><body></body></html>")).toBeNull();
  });

  test("normalizes whitespace", () => {
    const html = "<html><body><h1>\n  Hello   world \t</h1></body></html>";
    expect(extractBestTitleFromHtml(html)).toEqual({
      source: "h1",
      title: "Hello world",
    });
  });
});
