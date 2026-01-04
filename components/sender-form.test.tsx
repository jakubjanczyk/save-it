import { cleanup, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";

import { SenderForm } from "./sender-form";

afterEach(() => {
  cleanup();
});

test("renders inputs and submit button", () => {
  const rendered = render(<SenderForm onSubmit={() => undefined} />);

  expect(rendered.getByLabelText("Sender email")).toBeInTheDocument();
  expect(rendered.getByLabelText("Name (optional)")).toBeInTheDocument();
  expect(rendered.getByRole("button", { name: "Add sender" })).toBeEnabled();
});

test("shows an error when email is empty", async () => {
  const user = userEvent.setup();
  const rendered = render(<SenderForm onSubmit={() => undefined} />);

  await user.click(rendered.getByRole("button", { name: "Add sender" }));

  expect(await rendered.findByRole("alert")).toHaveTextContent(
    "Email is required"
  );
});

test("calls onSubmit with trimmed values", async () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const rendered = render(<SenderForm onSubmit={onSubmit} />);

  await user.type(rendered.getByLabelText("Sender email"), "  a@b.com  ");
  await user.type(rendered.getByLabelText("Name (optional)"), "  News  ");
  await user.click(rendered.getByRole("button", { name: "Add sender" }));

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith({ email: "a@b.com", name: "News" });
  });
});

test("clears fields after successful submission", async () => {
  const user = userEvent.setup();
  const rendered = render(<SenderForm onSubmit={() => undefined} />);

  await user.type(rendered.getByLabelText("Sender email"), "a@b.com");
  await user.type(rendered.getByLabelText("Name (optional)"), "News");
  await user.click(rendered.getByRole("button", { name: "Add sender" }));

  await waitFor(() => {
    expect(rendered.getByLabelText("Sender email")).toHaveValue("");
  });
});
