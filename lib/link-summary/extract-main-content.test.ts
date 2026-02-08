import { describe, expect, test } from "vitest";

import { extractMainContent } from "./extract-main-content";

describe("extractMainContent", () => {
  test("prefers <article> or <main> and removes nav/footer noise", () => {
    const html = `
      <html>
        <body>
          <nav>Navigation</nav>
          <main>
            <h1>Title</h1>
            <p>Main content here.</p>
          </main>
          <footer>Footer</footer>
        </body>
      </html>
    `;

    const result = extractMainContent(html);
    expect(result.markdown).toContain("Main content here.");
    expect(result.markdown).not.toContain("Navigation");
    expect(result.markdown).not.toContain("Footer");
  });

  test("computes confidence from extracted length", () => {
    const low = extractMainContent("<html><body><main>Hi</main></body></html>");
    expect(low.confidence).toBe("low");

    const medium = extractMainContent(
      `<html><body><main>${"word ".repeat(80)}</main></body></html>`
    );
    expect(medium.confidence).toBe("medium");

    const high = extractMainContent(
      `<html><body><main>${"word ".repeat(400)}</main></body></html>`
    );
    expect(high.confidence).toBe("high");
  });
});
