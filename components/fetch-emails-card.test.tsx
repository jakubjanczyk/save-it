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
  const onFetch = vi.fn(async () => ({ fetched: 1 }));
  const user = userEvent.setup();
  const rendered = render(<FetchEmailsCard onFetch={onFetch} />);

  await user.click(rendered.getByRole("button", { name: "Fetch new emails" }));

  expect(onFetch).toHaveBeenCalledOnce();
});

test("uses singular email when fetched=1", async () => {
  const user = userEvent.setup();
  const rendered = render(
    <FetchEmailsCard onFetch={async () => ({ fetched: 1 })} />
  );

  await user.click(rendered.getByRole("button", { name: "Fetch new emails" }));

  await waitFor(() => {
    expect(toastSuccessMock).toHaveBeenCalledWith("Fetched 1 new email.");
  });
});

test("disables Fetch new emails button while loading", async () => {
  const onFetch = () => new Promise<{ fetched: number }>(() => undefined);
  const user = userEvent.setup();
  const rendered = render(<FetchEmailsCard onFetch={onFetch} />);

  await user.click(rendered.getByRole("button", { name: "Fetch new emails" }));

  expect(rendered.getByRole("button", { name: "Fetching…" })).toBeDisabled();
});

test("shows toast after a successful fetch", async () => {
  const user = userEvent.setup();
  const rendered = render(
    <FetchEmailsCard onFetch={async () => ({ fetched: 2 })} />
  );

  await user.click(rendered.getByRole("button", { name: "Fetch new emails" }));

  await waitFor(() => {
    expect(toastSuccessMock).toHaveBeenCalledWith("Fetched 2 new emails.");
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
