import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";

import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";

afterEach(() => {
  cleanup();
});

function TestHarness(props: {
  onDiscard?: () => void;
  onSave?: () => void;
  onToggleHelp?: () => void;
  enableArrowSaveDiscard?: boolean;
}) {
  useKeyboardShortcuts(
    {
      onDiscard: props.onDiscard,
      onSave: props.onSave,
      onToggleHelp: props.onToggleHelp,
    },
    { enableArrowSaveDiscard: props.enableArrowSaveDiscard }
  );

  return (
    <div>
      <label htmlFor="input">Input</label>
      <input id="input" />
    </div>
  );
}

test("calls onSave when S is pressed", async () => {
  const onSave = vi.fn();
  const user = userEvent.setup();

  render(<TestHarness onSave={onSave} />);

  await user.keyboard("s");

  expect(onSave).toHaveBeenCalledOnce();
});

test("calls onDiscard when D is pressed", async () => {
  const onDiscard = vi.fn();
  const user = userEvent.setup();

  render(<TestHarness onDiscard={onDiscard} />);

  await user.keyboard("d");

  expect(onDiscard).toHaveBeenCalledOnce();
});

test("does not call onDiscard when ArrowLeft is pressed", async () => {
  const onDiscard = vi.fn();
  const user = userEvent.setup();

  render(<TestHarness enableArrowSaveDiscard={false} onDiscard={onDiscard} />);

  await user.keyboard("{ArrowLeft}");

  expect(onDiscard).not.toHaveBeenCalled();
});

test("calls onDiscard when ArrowLeft is pressed when enabled", async () => {
  const onDiscard = vi.fn();
  const user = userEvent.setup();

  render(<TestHarness enableArrowSaveDiscard onDiscard={onDiscard} />);

  await user.keyboard("{ArrowLeft}");

  expect(onDiscard).toHaveBeenCalledOnce();
});

test("calls onToggleHelp when ? is pressed", async () => {
  const onToggleHelp = vi.fn();
  const user = userEvent.setup();

  render(<TestHarness onToggleHelp={onToggleHelp} />);

  await user.keyboard("?");

  expect(onToggleHelp).toHaveBeenCalledOnce();
});

test("does not trigger shortcuts while an input is focused", async () => {
  const onSave = vi.fn();
  const user = userEvent.setup();

  const rendered = render(<TestHarness onSave={onSave} />);

  rendered.getByLabelText("Input").focus();
  await user.keyboard("s");

  expect(onSave).not.toHaveBeenCalled();
});

test("ignores shortcuts when Ctrl is held", async () => {
  const onSave = vi.fn();
  const user = userEvent.setup();

  render(<TestHarness onSave={onSave} />);

  await user.keyboard("{Control>}s{/Control}");

  expect(onSave).not.toHaveBeenCalled();
});
