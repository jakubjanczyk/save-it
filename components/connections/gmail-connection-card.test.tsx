import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { GmailConnectionCard } from "./gmail-connection-card";

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

test("uses Gmail label", () => {
  useQueryMock.mockReturnValueOnce(null);
  useMutationMock.mockReturnValueOnce(() => null);

  const rendered = render(<GmailConnectionCard />);

  expect(
    rendered.getByText("Gmail", { selector: "[data-slot='card-title']" })
  ).toBeInTheDocument();
});

test("uses Google connect URL", () => {
  useQueryMock.mockReturnValueOnce(null);
  useMutationMock.mockReturnValueOnce(() => null);

  const rendered = render(<GmailConnectionCard />);

  expect(rendered.getByRole("link", { name: "Connect" })).toHaveAttribute(
    "href",
    "/api/auth/google"
  );
});
