import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { BackgroundSyncSettingsCard } from "./background-sync-settings-card";

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

test("renders background sync settings fields", () => {
  useMutationMock.mockReturnValue(() => null);

  render(
    <BackgroundSyncSettingsCard
      storedEnabled="true"
      storedLocalHour="7"
      storedTimeZone="UTC"
    />
  );

  expect(screen.getByText("Background sync")).toBeInTheDocument();

  expect(screen.getByText("Enable background sync")).toBeInTheDocument();
  expect(screen.getByLabelText("Run daily at")).toHaveValue("7");
  expect(screen.getByRole("combobox", { name: "Time zone" })).toHaveTextContent(
    "UTC"
  );
});
