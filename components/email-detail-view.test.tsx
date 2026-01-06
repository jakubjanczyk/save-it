import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { EmailDetailView } from "./email-detail-view";

afterEach(() => {
  cleanup();
});

test("renders email subject", () => {
  const rendered = render(
    <EmailDetailView
      backHref="/"
      email={{
        extractionError: false,
        from: "newsletter@example.com",
        id: "e1",
        pendingLinkCount: 2,
        receivedAt: 0,
        subject: "Hello",
      }}
      links={[
        {
          description: "Desc",
          id: "l1",
          status: "pending",
          title: "Link 1",
          url: "https://example.com/1",
        },
      ]}
      linksLoading={false}
      onDiscardLink={() => undefined}
      onSaveLink={() => undefined}
    />
  );

  expect(rendered.getByText("Hello")).toBeInTheDocument();
});

test("renders email sender", () => {
  const rendered = render(
    <EmailDetailView
      backHref="/"
      email={{
        extractionError: false,
        from: "newsletter@example.com",
        id: "e1",
        pendingLinkCount: 2,
        receivedAt: 0,
        subject: "Hello",
      }}
      links={[
        {
          description: "Desc",
          id: "l1",
          status: "pending",
          title: "Link 1",
          url: "https://example.com/1",
        },
      ]}
      linksLoading={false}
      onDiscardLink={() => undefined}
      onSaveLink={() => undefined}
    />
  );

  expect(rendered.getByText("newsletter@example.com")).toBeInTheDocument();
});

test("renders back link", () => {
  const rendered = render(
    <EmailDetailView
      backHref="/"
      email={{
        extractionError: false,
        from: "newsletter@example.com",
        id: "e1",
        pendingLinkCount: 1,
        receivedAt: 0,
        subject: "Hello",
      }}
      links={[
        {
          description: "Desc",
          id: "l1",
          status: "pending",
          title: "Link 1",
          url: "https://example.com/1",
        },
      ]}
      linksLoading={false}
      onDiscardLink={() => undefined}
      onSaveLink={() => undefined}
    />
  );

  expect(rendered.getByRole("link", { name: "Back to inbox" })).toHaveAttribute(
    "href",
    "/"
  );
});

test("renders first link title", () => {
  const rendered = render(
    <EmailDetailView
      backHref="/"
      email={{
        extractionError: false,
        from: "newsletter@example.com",
        id: "e1",
        pendingLinkCount: 2,
        receivedAt: 0,
        subject: "Hello",
      }}
      links={[
        {
          description: "Desc",
          id: "l1",
          status: "pending",
          title: "Link 1",
          url: "https://example.com/1",
        },
        {
          description: "Desc",
          id: "l2",
          status: "pending",
          title: "Link 2",
          url: "https://example.com/2",
        },
      ]}
      linksLoading={false}
      onDiscardLink={() => undefined}
      onSaveLink={() => undefined}
    />
  );

  expect(rendered.getByText("Link 1")).toBeInTheDocument();
});

test("renders second link title", () => {
  const rendered = render(
    <EmailDetailView
      backHref="/"
      email={{
        extractionError: false,
        from: "newsletter@example.com",
        id: "e1",
        pendingLinkCount: 2,
        receivedAt: 0,
        subject: "Hello",
      }}
      links={[
        {
          description: "Desc",
          id: "l1",
          status: "pending",
          title: "Link 1",
          url: "https://example.com/1",
        },
        {
          description: "Desc",
          id: "l2",
          status: "pending",
          title: "Link 2",
          url: "https://example.com/2",
        },
      ]}
      linksLoading={false}
      onDiscardLink={() => undefined}
      onSaveLink={() => undefined}
    />
  );

  expect(rendered.getByText("Link 2")).toBeInTheDocument();
});
