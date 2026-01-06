import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { RaindropConnection } from "./raindrop-connection";

afterEach(() => {
  cleanup();
});

test("shows Connect when disconnected", () => {
  const rendered = render(
    <RaindropConnection
      connected={false}
      connectHref="/api/auth/raindrop"
      onDisconnect={() => undefined}
    />
  );

  expect(rendered.getByRole("link", { name: "Connect" })).toHaveAttribute(
    "href",
    "/api/auth/raindrop"
  );
});

test("shows Disconnect when connected", () => {
  const rendered = render(
    <RaindropConnection
      connected
      connectHref="/api/auth/raindrop"
      onDisconnect={() => undefined}
    />
  );

  expect(rendered.getByRole("button", { name: "Disconnect" })).toBeEnabled();
});

test("calls onDisconnect when Disconnect is clicked", () => {
  const onDisconnect = vi.fn();
  const rendered = render(
    <RaindropConnection
      connected
      connectHref="/api/auth/raindrop"
      onDisconnect={onDisconnect}
    />
  );

  rendered.getByRole("button", { name: "Disconnect" }).click();

  expect(onDisconnect).toHaveBeenCalled();
});
