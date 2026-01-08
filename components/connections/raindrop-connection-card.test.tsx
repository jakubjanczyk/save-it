import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { RaindropConnectionCard } from "./raindrop-connection-card";

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

test("uses Raindrop label", () => {
  useQueryMock.mockReturnValueOnce(null);
  useMutationMock.mockReturnValueOnce(() => null);

  const rendered = render(<RaindropConnectionCard />);

  expect(
    rendered.getByText("Raindrop", { selector: "[data-slot='card-title']" })
  ).toBeInTheDocument();
});

test("uses Raindrop connect URL", () => {
  useQueryMock.mockReturnValueOnce(null);
  useMutationMock.mockReturnValueOnce(() => null);

  const rendered = render(<RaindropConnectionCard />);

  expect(rendered.getByRole("link", { name: "Connect" })).toHaveAttribute(
    "href",
    "/api/auth/raindrop"
  );
});
