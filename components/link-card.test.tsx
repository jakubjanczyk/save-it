import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";

import { LinkCard } from "./link-card";

afterEach(() => {
  cleanup();
});

test("renders link title", () => {
  const rendered = render(
    <LinkCard
      description="A description"
      onDiscard={() => undefined}
      onSave={() => undefined}
      title="A title"
      url="https://example.com/a"
    />
  );

  expect(rendered.getByText("A title")).toBeInTheDocument();
});

test("renders link description", () => {
  const rendered = render(
    <LinkCard
      description="A description"
      onDiscard={() => undefined}
      onSave={() => undefined}
      title="A title"
      url="https://example.com/a"
    />
  );

  expect(rendered.getByText("A description")).toBeInTheDocument();
});

test("calls onSave when Save is clicked", async () => {
  const onSave = vi.fn();
  const user = userEvent.setup();
  const rendered = render(
    <LinkCard
      description="A description"
      onDiscard={() => undefined}
      onSave={onSave}
      title="A title"
      url="https://example.com/a"
    />
  );

  await user.click(rendered.getByRole("button", { name: "Save" }));

  expect(onSave).toHaveBeenCalled();
});

test("calls onDiscard when Discard is clicked", async () => {
  const onDiscard = vi.fn();
  const user = userEvent.setup();
  const rendered = render(
    <LinkCard
      description="A description"
      onDiscard={onDiscard}
      onSave={() => undefined}
      title="A title"
      url="https://example.com/a"
    />
  );

  await user.click(rendered.getByRole("button", { name: "Discard" }));

  expect(onDiscard).toHaveBeenCalled();
});

test("renders an open link anchor", () => {
  const rendered = render(
    <LinkCard
      description="A description"
      onDiscard={() => undefined}
      onSave={() => undefined}
      title="A title"
      url="https://example.com/a"
    />
  );

  expect(rendered.getByRole("link", { name: "Open" })).toHaveAttribute(
    "href",
    "https://example.com/a"
  );
});

test("disables actions when status is not pending", () => {
  const rendered = render(
    <LinkCard
      description="A description"
      onDiscard={() => undefined}
      onSave={() => undefined}
      status="discarded"
      title="A title"
      url="https://example.com/a"
    />
  );

  expect(rendered.getByRole("button", { name: "Save" })).toBeDisabled();
});
