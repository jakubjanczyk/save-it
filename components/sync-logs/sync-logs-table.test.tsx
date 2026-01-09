import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { GenericId } from "convex/values";
import { afterEach, expect, test, vi } from "vitest";

import { SyncLogsTable } from "./sync-logs-table";

afterEach(() => {
  cleanup();
});

test("shows Retry for failed logs", async () => {
  const onRetry = vi.fn();
  const user = userEvent.setup();

  const emailId = "e1" as GenericId<"emails">;
  render(
    <SyncLogsTable
      logs={[
        {
          _id: "l1" as GenericId<"syncLogs">,
          attemptedAt: 1,
          emailId,
          extractedLinkCount: 0,
          from: "a@b.com",
          gmailId: "m1",
          receivedAt: 1,
          savedLinkCount: 0,
          status: "error",
          storedLinkCount: 0,
          subject: "Hello",
        },
      ]}
      onRetry={onRetry}
      retryingEmailId={null}
    />
  );

  await user.click(screen.getByRole("button", { name: "Retry" }));

  expect(onRetry).toHaveBeenCalledWith(emailId);
});

test("does not show Retry for successful logs", () => {
  const rendered = render(
    <SyncLogsTable
      logs={[
        {
          _id: "l1" as GenericId<"syncLogs">,
          attemptedAt: 1,
          emailId: "e1" as GenericId<"emails">,
          extractedLinkCount: 1,
          from: "a@b.com",
          gmailId: "m1",
          receivedAt: 1,
          savedLinkCount: 0,
          status: "success",
          storedLinkCount: 1,
          subject: "Hello",
        },
      ]}
      onRetry={() => undefined}
      retryingEmailId={null}
    />
  );

  expect(rendered.queryByRole("button", { name: "Retry" })).toBeNull();
});

test("shows saved link count", () => {
  render(
    <SyncLogsTable
      logs={[
        {
          _id: "l1" as GenericId<"syncLogs">,
          attemptedAt: 0,
          emailId: "e1" as GenericId<"emails">,
          extractedLinkCount: 0,
          from: "a@b.com",
          gmailId: "m1",
          receivedAt: 1,
          savedLinkCount: 7,
          status: "success",
          storedLinkCount: 0,
          subject: "Hello",
        },
      ]}
      onRetry={() => undefined}
      retryingEmailId={null}
    />
  );

  expect(screen.getByRole("columnheader", { name: "Saved" })).toBeDefined();
  expect(screen.getByRole("cell", { name: "7" })).toBeDefined();
});
