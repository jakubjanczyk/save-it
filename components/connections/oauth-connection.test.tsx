import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";

import { OAuthConnection } from "./oauth-connection";

afterEach(() => {
  cleanup();
});

test("shows Connect when disconnected", () => {
  const rendered = render(
    <OAuthConnection
      connected={false}
      connectHref="/api/auth/google"
      onDisconnect={() => undefined}
      serviceName="Gmail"
    />
  );

  expect(rendered.getByText("Not connected")).toBeInTheDocument();
  expect(rendered.getByText("Gmail")).toBeInTheDocument();
  expect(rendered.getByRole("link", { name: "Connect" })).toHaveAttribute(
    "href",
    "/api/auth/google"
  );
});

test("does not show Disconnect when disconnected", () => {
  const rendered = render(
    <OAuthConnection
      connected={false}
      connectHref="/api/auth/google"
      onDisconnect={() => undefined}
      serviceName="Gmail"
    />
  );

  expect(
    rendered.queryByRole("button", { name: "Disconnect" })
  ).not.toBeInTheDocument();
});

test("shows Disconnect when connected", () => {
  const rendered = render(
    <OAuthConnection
      connected
      connectHref="/api/auth/google"
      onDisconnect={() => undefined}
      serviceName="Gmail"
    />
  );

  expect(rendered.getByText("Connected")).toBeInTheDocument();
  expect(rendered.getByRole("button", { name: "Disconnect" })).toBeEnabled();
});

test("calls onDisconnect when Disconnect is clicked", async () => {
  const onDisconnect = vi.fn();
  const user = userEvent.setup();

  const rendered = render(
    <OAuthConnection
      connected
      connectHref="/api/auth/google"
      onDisconnect={onDisconnect}
      serviceName="Gmail"
    />
  );

  await user.click(rendered.getByRole("button", { name: "Disconnect" }));

  expect(onDisconnect).toHaveBeenCalledOnce();
});

test("shows status message and Reconnect when statusTone is error", () => {
  const rendered = render(
    <OAuthConnection
      connected={false}
      connectHref="/api/auth/google"
      onDisconnect={() => undefined}
      serviceName="Gmail"
      statusMessage="Connection expired. Reconnect to continue."
      statusTone="error"
    />
  );

  expect(
    rendered.getByText("Connection expired. Reconnect to continue.")
  ).toBeInTheDocument();
  expect(rendered.getByRole("link", { name: "Reconnect" })).toHaveAttribute(
    "href",
    "/api/auth/google"
  );
});
