import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";

import { GmailConnection } from "./gmail-connection";

afterEach(() => {
  cleanup();
});

test("shows Connect when disconnected", () => {
  const rendered = render(
    <GmailConnection
      connected={false}
      connectHref="/api/auth/google"
      onDisconnect={() => undefined}
    />
  );

  expect(rendered.getByText("Not connected")).toBeInTheDocument();
  expect(rendered.getByRole("link", { name: "Connect" })).toHaveAttribute(
    "href",
    "/api/auth/google"
  );
});

test("does not show Disconnect when disconnected", () => {
  const rendered = render(
    <GmailConnection
      connected={false}
      connectHref="/api/auth/google"
      onDisconnect={() => undefined}
    />
  );

  expect(
    rendered.queryByRole("button", { name: "Disconnect" })
  ).not.toBeInTheDocument();
});

test("shows Disconnect when connected", () => {
  const rendered = render(
    <GmailConnection
      connected
      connectHref="/api/auth/google"
      onDisconnect={() => undefined}
    />
  );

  expect(rendered.getByText("Connected")).toBeInTheDocument();
  expect(rendered.getByRole("button", { name: "Disconnect" })).toBeEnabled();
});

test("calls onDisconnect when Disconnect is clicked", async () => {
  const onDisconnect = vi.fn();
  const user = userEvent.setup();

  const rendered = render(
    <GmailConnection
      connected
      connectHref="/api/auth/google"
      onDisconnect={onDisconnect}
    />
  );

  await user.click(rendered.getByRole("button", { name: "Disconnect" }));

  expect(onDisconnect).toHaveBeenCalledOnce();
});
