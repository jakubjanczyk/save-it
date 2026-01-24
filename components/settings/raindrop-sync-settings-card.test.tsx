import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";

import { RaindropSyncSettingsCard } from "./raindrop-sync-settings-card";

const ENABLE_SYNC_REGEX = /enable raindrop sync/i;
const SAVE_REGEX = /save/i;
const SAVING_REGEX = /saving/i;

const useMutationMock = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: (...args: unknown[]) => useMutationMock(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));

afterEach(() => {
  cleanup();
  useMutationMock.mockReset();
});

test("renders checkbox with current state when enabled", () => {
  useMutationMock.mockReturnValue(() => null);

  render(<RaindropSyncSettingsCard storedEnabled="true" />);

  expect(screen.getByText("Raindrop sync")).toBeInTheDocument();
  const checkbox = screen.getByRole("checkbox", {
    name: ENABLE_SYNC_REGEX,
  });
  expect(checkbox).toBeChecked();
});

test("renders checkbox with current state when disabled", () => {
  useMutationMock.mockReturnValue(() => null);

  render(<RaindropSyncSettingsCard storedEnabled="false" />);

  const checkbox = screen.getByRole("checkbox", {
    name: ENABLE_SYNC_REGEX,
  });
  expect(checkbox).not.toBeChecked();
});

test("calls mutation when toggled and saved", async () => {
  const user = userEvent.setup();
  const saveMock = vi.fn().mockResolvedValue(null);
  useMutationMock.mockReturnValue(saveMock);

  render(<RaindropSyncSettingsCard storedEnabled="true" />);

  const checkbox = screen.getByRole("checkbox", {
    name: ENABLE_SYNC_REGEX,
  });
  await user.click(checkbox);

  const saveButton = screen.getByRole("button", { name: SAVE_REGEX });
  await user.click(saveButton);

  expect(saveMock).toHaveBeenCalledWith({
    key: "raindropSyncEnabled",
    value: "false",
  });
});

test("shows loading state during save", async () => {
  const user = userEvent.setup();
  let resolvePromise: (() => void) | undefined;
  const saveMock = vi.fn().mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        resolvePromise = resolve;
      })
  );
  useMutationMock.mockReturnValue(saveMock);

  render(<RaindropSyncSettingsCard storedEnabled="true" />);

  const saveButton = screen.getByRole("button", { name: SAVE_REGEX });
  await user.click(saveButton);

  expect(screen.getByRole("button", { name: SAVING_REGEX })).toBeDisabled();

  resolvePromise?.();
});
