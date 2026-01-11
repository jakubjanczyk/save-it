import { cleanup, render, screen } from "@testing-library/react";
import type { GenericId } from "convex/values";
import { afterEach, expect, test } from "vitest";

import { SyncRunsTable } from "./sync-runs-table";

afterEach(() => {
  cleanup();
});

test("shows empty message when there are no runs", () => {
  render(<SyncRunsTable runs={[]} />);

  expect(screen.getByText("No sync runs yet.")).toBeDefined();
});

test("renders status and progress counters", () => {
  render(
    <SyncRunsTable
      runs={[
        {
          id: "r1" as GenericId<"syncRuns">,
          isStale: false,
          lastHeartbeatAt: 0,
          progress: {
            fetchedEmails: 1,
            insertedEmails: 2,
            processedEmails: 3,
            storedLinks: 4,
          },
          startedAt: 0,
          status: "success",
        },
      ]}
    />
  );

  expect(screen.getByRole("cell", { name: "Success" })).toBeDefined();
  expect(screen.getByRole("cell", { name: "1" })).toBeDefined();
  expect(screen.getByRole("cell", { name: "2" })).toBeDefined();
  expect(screen.getByRole("cell", { name: "3" })).toBeDefined();
  expect(screen.getByRole("cell", { name: "4" })).toBeDefined();
});

test("renders error details for errored run", () => {
  render(
    <SyncRunsTable
      runs={[
        {
          errorMessage: "Boom",
          errorName: "Error",
          errorTag: "Tag",
          id: "r1" as GenericId<"syncRuns">,
          isStale: false,
          lastHeartbeatAt: 0,
          progress: {
            fetchedEmails: 0,
            insertedEmails: 0,
            processedEmails: 0,
            storedLinks: 0,
          },
          startedAt: 0,
          status: "error",
        },
      ]}
    />
  );

  expect(screen.getByRole("cell", { name: "Error" })).toBeDefined();
  expect(screen.getByText("Error · Tag · Boom")).toBeDefined();
});

test("marks running stale status", () => {
  render(
    <SyncRunsTable
      runs={[
        {
          id: "r1" as GenericId<"syncRuns">,
          isStale: true,
          lastHeartbeatAt: 0,
          progress: {
            fetchedEmails: 0,
            insertedEmails: 0,
            processedEmails: 0,
            storedLinks: 0,
          },
          startedAt: 0,
          status: "running",
        },
      ]}
    />
  );

  expect(screen.getByRole("cell", { name: "Running (stale)" })).toBeDefined();
});
