import { cleanup, render, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { ConnectionsCardClient } from "./connections-card-client";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useMutation: (...args: unknown[]) => useMutationMock(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));

afterEach(() => {
  cleanup();
  useQueryMock.mockReset();
  useMutationMock.mockReset();
});

test("uses initial values while queries load", () => {
  useMutationMock.mockReturnValue(async () => null);
  useQueryMock.mockReturnValueOnce(undefined).mockReturnValueOnce(undefined);

  const rendered = render(
    <ConnectionsCardClient
      initialGmailStatus={{
        connected: true,
        errorAt: null,
        errorMessage: null,
        errorTag: null,
      }}
      initialRaindropConnected={false}
    />
  );
  const gmailRow = rendered.container.querySelector(
    "[data-service='gmail']"
  ) as HTMLElement;
  const raindropRow = rendered.container.querySelector(
    "[data-service='raindrop']"
  ) as HTMLElement;

  expect(within(gmailRow).getByText("Connected")).toBeInTheDocument();
  expect(
    within(gmailRow).getByRole("button", { name: "Disconnect" })
  ).toBeEnabled();
  expect(
    within(raindropRow).getByRole("link", { name: "Connect" })
  ).toHaveAttribute("href", "/api/auth/raindrop");
});

test("shows reconnect when Gmail has a connection error", () => {
  useMutationMock.mockReturnValue(async () => null);
  useQueryMock
    .mockReturnValueOnce({
      connected: true,
      errorAt: 123,
      errorMessage: "Access token expired",
      errorTag: "GmailTokenExpired",
    })
    .mockReturnValueOnce(null);

  const rendered = render(
    <ConnectionsCardClient
      initialGmailStatus={{
        connected: false,
        errorAt: null,
        errorMessage: null,
        errorTag: null,
      }}
      initialRaindropConnected
    />
  );
  const gmailRow = rendered.container.querySelector(
    "[data-service='gmail']"
  ) as HTMLElement;

  expect(
    within(gmailRow).getByText("Connection expired. Reconnect to continue.")
  ).toBeInTheDocument();
  expect(
    within(gmailRow).getByRole("link", { name: "Reconnect" })
  ).toHaveAttribute("href", "/api/auth/google");
});
