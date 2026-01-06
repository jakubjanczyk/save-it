import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { EmailList } from "./email-list";

const subjectARegex = /Subject A/;

afterEach(() => {
  cleanup();
});

test("shows empty state when there are no emails", () => {
  const rendered = render(<EmailList emails={[]} />);

  expect(
    rendered.getByText("No newsletters to triage yet.")
  ).toBeInTheDocument();
});

test("renders email subject", () => {
  const rendered = render(
    <EmailList
      emails={[
        {
          id: "e1",
          subject: "Subject A",
          from: "a@example.com",
          receivedAt: 0,
          pendingLinkCount: 2,
          extractionError: false,
        },
      ]}
    />
  );

  expect(rendered.getByText("Subject A")).toBeInTheDocument();
});

test("renders email sender", () => {
  const rendered = render(
    <EmailList
      emails={[
        {
          id: "e1",
          subject: "Subject A",
          from: "a@example.com",
          receivedAt: 0,
          pendingLinkCount: 2,
          extractionError: false,
        },
      ]}
    />
  );

  expect(rendered.getByText("a@example.com")).toBeInTheDocument();
});

test("links email subject to email details page", () => {
  const rendered = render(
    <EmailList
      emails={[
        {
          id: "e1",
          subject: "Subject A",
          from: "a@example.com",
          receivedAt: 0,
          pendingLinkCount: 0,
          extractionError: false,
        },
      ]}
    />
  );

  expect(rendered.getByRole("link", { name: subjectARegex })).toHaveAttribute(
    "href",
    "/emails/e1"
  );
});

test("shows pending link count when there are pending links", () => {
  const rendered = render(
    <EmailList
      emails={[
        {
          id: "e1",
          subject: "Subject A",
          from: "a@example.com",
          receivedAt: 0,
          pendingLinkCount: 3,
          extractionError: false,
        },
      ]}
    />
  );

  expect(rendered.getByText("3 pending")).toBeInTheDocument();
});

test("shows extraction error indicator when extractionError is true", () => {
  const rendered = render(
    <EmailList
      emails={[
        {
          id: "e1",
          subject: "Subject A",
          from: "a@example.com",
          receivedAt: 0,
          pendingLinkCount: 0,
          extractionError: true,
        },
      ]}
    />
  );

  expect(rendered.getByText("Extraction error")).toBeInTheDocument();
});

test("marks the selected email row", () => {
  const rendered = render(
    <EmailList
      emails={[
        {
          id: "e1",
          subject: "Subject A",
          from: "a@example.com",
          receivedAt: 0,
          pendingLinkCount: 0,
          extractionError: false,
        },
      ]}
      selectedEmailId="e1"
    />
  );

  expect(rendered.getByRole("link", { name: subjectARegex })).toHaveAttribute(
    "aria-current",
    "true"
  );
});
