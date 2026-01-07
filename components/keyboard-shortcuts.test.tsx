import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";

import { KeyboardShortcuts } from "./keyboard-shortcuts";

afterEach(() => {
  cleanup();
});

test("opens help dialog when ? is pressed", async () => {
  const user = userEvent.setup();

  const rendered = render(<KeyboardShortcuts context="focus" />);

  await user.keyboard("?");

  expect(await rendered.findByText("Focus shortcuts")).toBeInTheDocument();
});

test("closes help dialog when ? is pressed twice", async () => {
  const user = userEvent.setup();

  const rendered = render(<KeyboardShortcuts context="focus" />);

  await user.keyboard("?");
  expect(await rendered.findByText("Focus shortcuts")).toBeInTheDocument();

  await user.keyboard("?");
  expect(rendered.queryByText("Focus shortcuts")).toBeNull();
});

test("does not fire actions while help dialog is open", async () => {
  const onSave = vi.fn();
  const user = userEvent.setup();

  render(<KeyboardShortcuts context="focus" onSave={onSave} />);

  await user.keyboard("?");
  await user.keyboard("s");

  expect(onSave).not.toHaveBeenCalled();
});
