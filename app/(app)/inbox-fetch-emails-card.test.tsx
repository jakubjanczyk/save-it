import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { InboxFetchEmailsCard } from "./inbox-fetch-emails-card";

const useQueryMock = vi.fn();
const useActionMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("convex/react", () => ({
  useAction: (...args: unknown[]) => useActionMock(...args),
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

afterEach(() => {
  cleanup();
  useQueryMock.mockReset();
  useActionMock.mockReset();
  refreshMock.mockReset();
});

test("disables fetch button when a sync is running", () => {
  useActionMock.mockReturnValue(async () => null);
  useQueryMock.mockReturnValue({
    isStale: false,
    run: {
      id: "syncRuns:running",
      lastHeartbeatAt: 0,
      progress: {
        fetchedEmails: 1,
        insertedEmails: 0,
        processedEmails: 0,
        storedLinks: 0,
      },
      startedAt: 0,
      status: "running",
    },
  });

  const rendered = render(<InboxFetchEmailsCard />);
  expect(
    rendered.getByRole("button", { name: "Sync in progress…" })
  ).toBeDisabled();
});

test("enables fetch button when there is no active sync", () => {
  useActionMock.mockReturnValue(async () => null);
  useQueryMock.mockReturnValue(null);

  const rendered = render(<InboxFetchEmailsCard />);
  expect(
    rendered.getByRole("button", { name: "Fetch new emails" })
  ).toBeEnabled();
});
