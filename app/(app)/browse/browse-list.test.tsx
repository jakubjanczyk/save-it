import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";

import { BrowseList } from "./browse-list";
import type { SavedLinkItem } from "./convex-refs";

const LOAD_MORE_REGEX = /load more/i;

function createMockItem(
  id: string,
  overrides: Partial<SavedLinkItem> = {}
): SavedLinkItem {
  return {
    description: "Test description",
    id: id as SavedLinkItem["id"],
    isFavorite: false,
    savedAt: Date.now(),
    title: `Link ${id}`,
    url: `https://example.com/${id}`,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

test("renders list of links", () => {
  const items = [createMockItem("1"), createMockItem("2"), createMockItem("3")];

  render(
    <BrowseList
      continueCursor={null}
      isDone={true}
      items={items}
      loading={false}
      onArchive={() => undefined}
      onFavorite={() => undefined}
      onLoadMore={() => undefined}
      showSendToRaindrop={false}
    />
  );

  expect(screen.getByText("Link 1")).toBeInTheDocument();
  expect(screen.getByText("Link 2")).toBeInTheDocument();
  expect(screen.getByText("Link 3")).toBeInTheDocument();
});

test("shows empty state when no links", () => {
  const { container } = render(
    <BrowseList
      continueCursor={null}
      isDone={true}
      items={[]}
      loading={false}
      onArchive={() => undefined}
      onFavorite={() => undefined}
      onLoadMore={() => undefined}
      showSendToRaindrop={false}
    />
  );

  expect(container.firstChild).toBeNull();
});

test("calls onArchive for correct link when row action clicked", async () => {
  const user = userEvent.setup();
  const onArchive = vi.fn();
  const items = [createMockItem("1"), createMockItem("2")];

  render(
    <BrowseList
      continueCursor={null}
      isDone={true}
      items={items}
      loading={false}
      onArchive={onArchive}
      onFavorite={() => undefined}
      onLoadMore={() => undefined}
      showSendToRaindrop={false}
    />
  );

  const archiveButtons = screen.getAllByTitle("Archive");
  const button = archiveButtons[1];
  if (!button) {
    throw new Error("Archive button not found");
  }
  await user.click(button);

  expect(onArchive).toHaveBeenCalledWith(items[1]);
});

test("calls onFavorite for correct link", async () => {
  const user = userEvent.setup();
  const onFavorite = vi.fn();
  const items = [createMockItem("1"), createMockItem("2")];

  render(
    <BrowseList
      continueCursor={null}
      isDone={true}
      items={items}
      loading={false}
      onArchive={() => undefined}
      onFavorite={onFavorite}
      onLoadMore={() => undefined}
      showSendToRaindrop={false}
    />
  );

  const favoriteButtons = screen.getAllByTitle("Add favorite");
  const button = favoriteButtons[0];
  if (!button) {
    throw new Error("Favorite button not found");
  }
  await user.click(button);

  expect(onFavorite).toHaveBeenCalledWith(items[0]);
});

test("shows Load more button when not done", () => {
  const items = [createMockItem("1")];

  render(
    <BrowseList
      continueCursor="cursor123"
      isDone={false}
      items={items}
      loading={false}
      onArchive={() => undefined}
      onFavorite={() => undefined}
      onLoadMore={() => undefined}
      showSendToRaindrop={false}
    />
  );

  expect(
    screen.getByRole("button", { name: LOAD_MORE_REGEX })
  ).toBeInTheDocument();
});

test("hides Load more button when isDone=true", () => {
  const items = [createMockItem("1")];

  render(
    <BrowseList
      continueCursor={null}
      isDone={true}
      items={items}
      loading={false}
      onArchive={() => undefined}
      onFavorite={() => undefined}
      onLoadMore={() => undefined}
      showSendToRaindrop={false}
    />
  );

  expect(
    screen.queryByRole("button", { name: LOAD_MORE_REGEX })
  ).not.toBeInTheDocument();
});
