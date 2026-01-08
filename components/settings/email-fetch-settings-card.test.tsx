import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { EmailFetchSettingsCard } from "./email-fetch-settings-card";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: (...args: unknown[]) => useMutationMock(...args),
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

afterEach(() => {
  cleanup();
  useQueryMock.mockReset();
  useMutationMock.mockReset();
});

test("shows email fetch limit label", () => {
  useQueryMock.mockReturnValue("10");
  useMutationMock.mockReturnValue(() => null);

  const rendered = render(<EmailFetchSettingsCard />);

  expect(
    rendered.getByRole("spinbutton", { name: "Emails per fetch" })
  ).toBeInTheDocument();
});

test("shows Save button", () => {
  useQueryMock.mockReturnValue("10");
  useMutationMock.mockReturnValue(() => null);

  const rendered = render(<EmailFetchSettingsCard />);

  expect(rendered.getByRole("button", { name: "Save" })).toBeInTheDocument();
});
