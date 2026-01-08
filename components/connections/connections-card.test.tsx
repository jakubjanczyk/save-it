import { cleanup, render, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { ConnectionsCard } from "./connections-card";

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

test("uses Google connect URL", () => {
  useQueryMock.mockReturnValue(null);
  useMutationMock.mockReturnValue(() => null);

  const rendered = render(<ConnectionsCard />);
  const row = rendered.container.querySelector(
    "[data-service='gmail']"
  ) as HTMLElement;

  expect(within(row).getByRole("link", { name: "Connect" })).toHaveAttribute(
    "href",
    "/api/auth/google"
  );
});

test("uses Raindrop connect URL", () => {
  useQueryMock.mockReturnValue(null);
  useMutationMock.mockReturnValue(() => null);

  const rendered = render(<ConnectionsCard />);
  const row = rendered.container.querySelector(
    "[data-service='raindrop']"
  ) as HTMLElement;

  expect(within(row).getByRole("link", { name: "Connect" })).toHaveAttribute(
    "href",
    "/api/auth/raindrop"
  );
});
