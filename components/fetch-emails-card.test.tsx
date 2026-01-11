import { cleanup, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";

import { FetchEmailsCard } from "./fetch-emails-card";

const toastSuccessMock = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}));

afterEach(() => {
  cleanup();
  toastSuccessMock.mockReset();
});

test("calls onFetch when Fetch new emails is clicked", async () => {
  const onFetch = vi.fn(async () => undefined);
  const user = userEvent.setup();
  const rendered = render(<FetchEmailsCard onFetch={onFetch} />);

  await user.click(rendered.getByRole("button", { name: "Fetch new emails" }));

  expect(onFetch).toHaveBeenCalledOnce();
});

test("disables Fetch new emails button when disabled", () => {
  const onFetch = vi.fn(async () => undefined);
  const rendered = render(<FetchEmailsCard isRunning onFetch={onFetch} />);

  expect(
    rendered.getByRole("button", { name: "Sync in progress…" })
  ).toBeDisabled();
  expect(onFetch).not.toHaveBeenCalled();
});

test("shows a toast after a successful fetch", async () => {
  const user = userEvent.setup();
  const rendered = render(<FetchEmailsCard onFetch={async () => undefined} />);

  await user.click(rendered.getByRole("button", { name: "Fetch new emails" }));

  await waitFor(() => {
    expect(toastSuccessMock).toHaveBeenCalledWith("Sync started.");
  });
});

test("shows an error message when fetch fails", async () => {
  const user = userEvent.setup();
  const rendered = render(
    <FetchEmailsCard
      onFetch={() => Promise.reject(new Error("Gmail not connected"))}
    />
  );

  await user.click(rendered.getByRole("button", { name: "Fetch new emails" }));

  await waitFor(() => {
    expect(rendered.getByRole("alert")).toHaveTextContent(
      "Gmail not connected"
    );
  });
});

test("does not submit a form by default", () => {
  const onFetch = vi.fn(async () => undefined);
  const rendered = render(<FetchEmailsCard onFetch={onFetch} />);

  expect(rendered.getByRole("button")).toHaveAttribute("type", "button");
});

test("shows an error message when fetch throws synchronously", async () => {
  const user = userEvent.setup();
  const rendered = render(
    <FetchEmailsCard
      onFetch={() => {
        throw new Error("Boom");
      }}
    />
  );

  await user.click(rendered.getByRole("button", { name: "Fetch new emails" }));

  await waitFor(() => {
    expect(rendered.getByRole("alert")).toHaveTextContent("Boom");
  });
});
