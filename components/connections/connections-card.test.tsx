import { cleanup, render, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { ConnectionsCard } from "./connections-card";

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

test("uses Google connect URL", () => {
  useMutationMock.mockReturnValue(() => null);

  const rendered = render(
    <ConnectionsCard gmailConnected={false} raindropConnected={false} />
  );
  const row = rendered.container.querySelector(
    "[data-service='gmail']"
  ) as HTMLElement;

  expect(within(row).getByRole("link", { name: "Connect" })).toHaveAttribute(
    "href",
    "/api/auth/google"
  );
});

test("uses Raindrop connect URL", () => {
  useMutationMock.mockReturnValue(() => null);

  const rendered = render(
    <ConnectionsCard gmailConnected={false} raindropConnected={false} />
  );
  const row = rendered.container.querySelector(
    "[data-service='raindrop']"
  ) as HTMLElement;

  expect(within(row).getByRole("link", { name: "Connect" })).toHaveAttribute(
    "href",
    "/api/auth/raindrop"
  );
});

test("shows reconnect when Gmail has a connection error", () => {
  useMutationMock.mockReturnValue(() => null);

  const rendered = render(
    <ConnectionsCard
      gmailConnected
      gmailErrorMessage="Connection expired. Reconnect to continue."
      raindropConnected={false}
    />
  );
  const row = rendered.container.querySelector(
    "[data-service='gmail']"
  ) as HTMLElement;

  expect(
    within(row).getByText("Connection expired. Reconnect to continue.")
  ).toBeInTheDocument();
  expect(within(row).getByRole("link", { name: "Reconnect" })).toHaveAttribute(
    "href",
    "/api/auth/google"
  );
});
