import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";

import { BrowseCard } from "./browse-card";
import type { SavedLinkItem } from "./convex-refs";

const ARCHIVE_REGEX = /archive/i;
const FAVORITE_REGEX = /favorite/i;
const FAVORITED_REGEX = /favorited/i;
const SUMMARY_REGEX = /summary/i;
const SEND_TO_RAINDROP_REGEX = /send to raindrop/i;

function createMockItem(overrides: Partial<SavedLinkItem> = {}): SavedLinkItem {
  return {
    description: "Test description",
    id: "link123" as SavedLinkItem["id"],
    isFavorite: false,
    savedAt: Date.now(),
    title: "Test Link Title",
    url: "https://example.com/test",
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

test("renders link title", () => {
  const item = createMockItem({
    title: "My Test Title",
    url: "https://example.com/my-url",
  });

  render(
    <BrowseCard
      item={item}
      onArchive={() => undefined}
      onFavorite={() => undefined}
      showSendToRaindrop={false}
    />
  );

  expect(screen.getByText("My Test Title")).toBeInTheDocument();
});

test("shows Summary button", () => {
  const item = createMockItem();

  render(
    <BrowseCard
      item={item}
      onArchive={() => undefined}
      onFavorite={() => undefined}
      showSendToRaindrop={false}
    />
  );

  expect(
    screen.getByRole("button", { name: SUMMARY_REGEX })
  ).toBeInTheDocument();
});

test("shows Generating state in Summary modal when pending", async () => {
  const user = userEvent.setup();
  const item = createMockItem({ summaryStatus: "pending" });

  render(
    <BrowseCard
      item={item}
      onArchive={() => undefined}
      onFavorite={() => undefined}
      showSendToRaindrop={false}
    />
  );

  await user.click(screen.getByRole("button", { name: SUMMARY_REGEX }));

  expect(screen.getByRole("dialog")).toHaveClass("max-h-[95dvh]");
  expect(screen.getByRole("dialog")).toHaveClass("overflow-y-auto");
  expect(screen.getByRole("dialog")).toHaveClass("sm:max-h-[70dvh]");
  expect(screen.getByText("Generating…")).toBeInTheDocument();
});

test("shows error message and Retry in Summary modal when failed", async () => {
  const user = userEvent.setup();
  const onRetrySummary = vi.fn().mockResolvedValue(undefined);
  const item = createMockItem({
    summaryErrorMessage: "Could not fetch HTML",
    summaryStatus: "failed",
  });

  render(
    <BrowseCard
      item={item}
      onArchive={() => undefined}
      onFavorite={() => undefined}
      onRetrySummary={onRetrySummary}
      showSendToRaindrop={false}
    />
  );

  await user.click(screen.getByRole("button", { name: SUMMARY_REGEX }));

  expect(screen.getByText("Could not fetch HTML")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
});

test("renders summary content in Summary modal when success", async () => {
  const user = userEvent.setup();
  const item = createMockItem({
    summaryLongSummary: "Long summary content",
    summaryStatus: "success",
    summaryTldr: "TLDR content",
  });

  render(
    <BrowseCard
      item={item}
      onArchive={() => undefined}
      onFavorite={() => undefined}
      showSendToRaindrop={false}
    />
  );

  await user.click(screen.getByRole("button", { name: SUMMARY_REGEX }));

  expect(screen.getByText("TL;DR")).toBeInTheDocument();
  expect(screen.getByText("TLDR content")).toBeInTheDocument();
  expect(screen.getByText("Long summary")).toBeInTheDocument();
  expect(screen.getByText("Long summary content")).toBeInTheDocument();
});

test("hides long summary section when not present (e.g. GitHub)", async () => {
  const user = userEvent.setup();
  const item = createMockItem({
    summaryStatus: "success",
    summaryTldr: "Repo summary",
  });

  render(
    <BrowseCard
      item={item}
      onArchive={() => undefined}
      onFavorite={() => undefined}
      showSendToRaindrop={false}
    />
  );

  await user.click(screen.getByRole("button", { name: SUMMARY_REGEX }));

  expect(screen.queryByText("Long summary")).not.toBeInTheDocument();
});

test("calls onArchive when Archive clicked", async () => {
  const user = userEvent.setup();
  const onArchive = vi.fn();
  const item = createMockItem();

  render(
    <BrowseCard
      item={item}
      onArchive={onArchive}
      onFavorite={() => undefined}
      showSendToRaindrop={false}
    />
  );

  await user.click(screen.getByRole("button", { name: ARCHIVE_REGEX }));

  expect(onArchive).toHaveBeenCalledTimes(1);
});

test("calls onFavorite when Favorite clicked", async () => {
  const user = userEvent.setup();
  const onFavorite = vi.fn();
  const item = createMockItem();

  render(
    <BrowseCard
      item={item}
      onArchive={() => undefined}
      onFavorite={onFavorite}
      showSendToRaindrop={false}
    />
  );

  await user.click(screen.getByRole("button", { name: FAVORITE_REGEX }));

  expect(onFavorite).toHaveBeenCalledTimes(1);
});

test("shows filled heart when isFavorite=true", () => {
  const item = createMockItem({ isFavorite: true });

  render(
    <BrowseCard
      item={item}
      onArchive={() => undefined}
      onFavorite={() => undefined}
      showSendToRaindrop={false}
    />
  );

  expect(
    screen.getByRole("button", { name: FAVORITED_REGEX })
  ).toBeInTheDocument();
});

test("shows Send to Raindrop button when no raindropId and sync enabled", () => {
  const item = createMockItem({ raindropId: undefined });

  render(
    <BrowseCard
      item={item}
      onArchive={() => undefined}
      onFavorite={() => undefined}
      onSendToRaindrop={() => undefined}
      showSendToRaindrop={true}
    />
  );

  expect(
    screen.getByRole("button", { name: SEND_TO_RAINDROP_REGEX })
  ).toBeInTheDocument();
});

test("hides Send to Raindrop button when raindropId exists", () => {
  const item = createMockItem({ raindropId: "123" });

  render(
    <BrowseCard
      item={item}
      onArchive={() => undefined}
      onFavorite={() => undefined}
      onSendToRaindrop={() => undefined}
      showSendToRaindrop={true}
    />
  );

  expect(
    screen.queryByRole("button", { name: SEND_TO_RAINDROP_REGEX })
  ).not.toBeInTheDocument();
});
