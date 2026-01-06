import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";

import { LinkList } from "./link-list";

afterEach(() => {
  cleanup();
});

test("shows empty state when there are no links", () => {
  const rendered = render(
    <LinkList
      links={[]}
      onDiscardLink={() => undefined}
      onSaveLink={() => undefined}
    />
  );

  expect(rendered.getByText("No links pending.")).toBeInTheDocument();
});

test("shows loading state when loading is true", () => {
  const rendered = render(
    <LinkList
      links={[]}
      loading
      onDiscardLink={() => undefined}
      onSaveLink={() => undefined}
    />
  );

  expect(rendered.getAllByTestId("link-card-skeleton")).toHaveLength(3);
});

test("does not show empty state when loading is true", () => {
  const rendered = render(
    <LinkList
      links={[]}
      loading
      onDiscardLink={() => undefined}
      onSaveLink={() => undefined}
    />
  );

  expect(rendered.queryByText("No links pending.")).toBeNull();
});

test("renders first link card", () => {
  const rendered = render(
    <LinkList
      links={[
        {
          id: "l1",
          description: "Desc 1",
          title: "Title 1",
          url: "https://example.com/1",
          status: "pending",
        },
        {
          id: "l2",
          description: "Desc 2",
          title: "Title 2",
          url: "https://example.com/2",
          status: "pending",
        },
      ]}
      onDiscardLink={() => undefined}
      onSaveLink={() => undefined}
    />
  );

  expect(rendered.getByText("Title 1")).toBeInTheDocument();
});

test("renders second link card", () => {
  const rendered = render(
    <LinkList
      links={[
        {
          id: "l1",
          description: "Desc 1",
          title: "Title 1",
          url: "https://example.com/1",
          status: "pending",
        },
        {
          id: "l2",
          description: "Desc 2",
          title: "Title 2",
          url: "https://example.com/2",
          status: "pending",
        },
      ]}
      onDiscardLink={() => undefined}
      onSaveLink={() => undefined}
    />
  );

  expect(rendered.getByText("Title 2")).toBeInTheDocument();
});

test("shows extraction error message when extractionError is true", () => {
  const rendered = render(
    <LinkList
      extractionError
      links={[]}
      onDiscardLink={() => undefined}
      onSaveLink={() => undefined}
    />
  );

  expect(
    rendered.getByText("Link extraction failed for this email.")
  ).toBeInTheDocument();
});

test("calls onSaveLink with the link id when save is clicked", async () => {
  const onSaveLink = vi.fn();
  const user = userEvent.setup();
  const rendered = render(
    <LinkList
      links={[
        {
          id: "l1",
          description: "Desc 1",
          title: "Title 1",
          url: "https://example.com/1",
          status: "pending",
        },
      ]}
      onDiscardLink={() => undefined}
      onSaveLink={onSaveLink}
    />
  );

  await user.click(rendered.getByRole("button", { name: "Save" }));

  expect(onSaveLink).toHaveBeenCalledWith("l1");
});
