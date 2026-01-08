import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { EmailFetchSettingsCard } from "./email-fetch-settings-card";

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

test("shows email fetch limit label", () => {
  useMutationMock.mockReturnValue(() => null);

  const rendered = render(<EmailFetchSettingsCard storedValue="10" />);

  expect(
    rendered.getByRole("spinbutton", { name: "Emails per fetch" })
  ).toBeInTheDocument();
});

test("shows Save button", () => {
  useMutationMock.mockReturnValue(() => null);

  const rendered = render(<EmailFetchSettingsCard storedValue="10" />);

  expect(rendered.getByRole("button", { name: "Save" })).toBeInTheDocument();
});
