import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";

import { BrowseShortcuts } from "./browse-shortcuts";

afterEach(() => {
  cleanup();
});

test("opens help dialog when ? pressed", async () => {
  const user = userEvent.setup();

  render(<BrowseShortcuts enabled={true} />);

  await user.keyboard("?");

  expect(screen.getByText("Browse shortcuts")).toBeInTheDocument();
});

test("closes help when ? pressed twice", async () => {
  const user = userEvent.setup();

  render(<BrowseShortcuts enabled={true} />);

  await user.keyboard("?");
  expect(screen.getByText("Browse shortcuts")).toBeInTheDocument();

  await user.keyboard("?");
  expect(screen.queryByText("Browse shortcuts")).not.toBeInTheDocument();
});

test("does not fire actions while help open", async () => {
  const user = userEvent.setup();
  const onArchive = vi.fn();

  render(
    <BrowseShortcuts enabled={true} handlers={{ archiveCurrent: onArchive }} />
  );

  await user.keyboard("?");
  expect(screen.getByText("Browse shortcuts")).toBeInTheDocument();

  await user.keyboard("a");
  expect(onArchive).not.toHaveBeenCalled();
});

test("calls onArchive when A pressed", async () => {
  const user = userEvent.setup();
  const onArchive = vi.fn();

  render(
    <BrowseShortcuts enabled={true} handlers={{ archiveCurrent: onArchive }} />
  );

  await user.keyboard("a");

  expect(onArchive).toHaveBeenCalledTimes(1);
});

test("calls onFavorite when F pressed", async () => {
  const user = userEvent.setup();
  const onFavorite = vi.fn();

  render(
    <BrowseShortcuts
      enabled={true}
      handlers={{ favoriteCurrent: onFavorite }}
    />
  );

  await user.keyboard("f");

  expect(onFavorite).toHaveBeenCalledTimes(1);
});

test("opens URL when O pressed", async () => {
  const user = userEvent.setup();
  const onOpen = vi.fn();

  render(<BrowseShortcuts enabled={true} handlers={{ openCurrent: onOpen }} />);

  await user.keyboard("o");

  expect(onOpen).toHaveBeenCalledTimes(1);
});

test("calls onToggleView when V pressed", async () => {
  const user = userEvent.setup();
  const onToggleView = vi.fn();

  render(
    <BrowseShortcuts enabled={true} handlers={{ toggleView: onToggleView }} />
  );

  await user.keyboard("v");

  expect(onToggleView).toHaveBeenCalledTimes(1);
});

test("calls onArchiveLeft when left arrow pressed", async () => {
  const user = userEvent.setup();
  const onArchiveLeft = vi.fn();

  render(
    <BrowseShortcuts
      enabled={true}
      handlers={{ archiveCurrentLeft: onArchiveLeft }}
    />
  );

  await user.keyboard("{ArrowLeft}");

  expect(onArchiveLeft).toHaveBeenCalledTimes(1);
});

test("calls onArchiveRight when right arrow pressed", async () => {
  const user = userEvent.setup();
  const onArchiveRight = vi.fn();

  render(
    <BrowseShortcuts
      enabled={true}
      handlers={{ archiveCurrentRight: onArchiveRight }}
    />
  );

  await user.keyboard("{ArrowRight}");

  expect(onArchiveRight).toHaveBeenCalledTimes(1);
});

test("calls onPreviousCard when up arrow pressed", async () => {
  const user = userEvent.setup();
  const onPreviousCard = vi.fn();

  render(
    <BrowseShortcuts
      enabled={true}
      handlers={{ previousCard: onPreviousCard }}
    />
  );

  await user.keyboard("{ArrowUp}");

  expect(onPreviousCard).toHaveBeenCalledTimes(1);
});

test("calls onNextCard when down arrow pressed", async () => {
  const user = userEvent.setup();
  const onNextCard = vi.fn();

  render(
    <BrowseShortcuts enabled={true} handlers={{ nextCard: onNextCard }} />
  );

  await user.keyboard("{ArrowDown}");

  expect(onNextCard).toHaveBeenCalledTimes(1);
});

test("does not fire actions when disabled", async () => {
  const user = userEvent.setup();
  const onArchive = vi.fn();

  render(
    <BrowseShortcuts enabled={false} handlers={{ archiveCurrent: onArchive }} />
  );

  await user.keyboard("a");

  expect(onArchive).not.toHaveBeenCalled();
});
