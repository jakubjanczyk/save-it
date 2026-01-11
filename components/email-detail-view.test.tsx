import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";

import { EmailDetailView } from "./email-detail-view";

afterEach(() => {
  cleanup();
});

test("renders email subject", () => {
  const rendered = render(
    <EmailDetailView
      backHref="/inbox"
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
      backHref="/inbox"
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
      backHref="/inbox"
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
    "/inbox"
  );
});

test("renders first link title", () => {
  const rendered = render(
    <EmailDetailView
      backHref="/inbox"
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
      backHref="/inbox"
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

test("calls onMarkAsRead when Mark as read is clicked", async () => {
  const onMarkAsRead = vi.fn();
  const user = userEvent.setup();
  const rendered = render(
    <EmailDetailView
      backHref="/inbox"
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
      onMarkAsRead={onMarkAsRead}
      onSaveLink={() => undefined}
    />
  );

  await user.click(rendered.getByRole("button", { name: "Mark as read" }));

  expect(onMarkAsRead).toHaveBeenCalled();
});

test("calls onArchive when Archive is clicked", async () => {
  const onArchive = vi.fn();
  const user = userEvent.setup();
  const rendered = render(
    <EmailDetailView
      backHref="/inbox"
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
      onArchive={onArchive}
      onDiscardLink={() => undefined}
      onSaveLink={() => undefined}
    />
  );

  await user.click(rendered.getByRole("button", { name: "Archive" }));

  expect(onArchive).toHaveBeenCalled();
});
