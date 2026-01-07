import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";

import { FocusView } from "./focus-view";

afterEach(() => {
  cleanup();
});

test("renders email subject and link title", () => {
  const rendered = render(
    <FocusView
      item={{
        description: "Desc",
        email: {
          from: "newsletter@example.com",
          id: "e1",
          receivedAt: 0,
          subject: "Subject",
        },
        id: "l1",
        title: "Link title",
        url: "https://example.com/a",
      }}
      onDiscard={() => undefined}
      onSave={() => undefined}
      position={1}
      total={3}
    />
  );

  expect(rendered.getByText("Subject")).toBeInTheDocument();
  expect(rendered.getByText("Link title")).toBeInTheDocument();
});

test("calls onSave when Save is clicked", async () => {
  const onSave = vi.fn();
  const user = userEvent.setup();

  const rendered = render(
    <FocusView
      item={{
        description: "Desc",
        email: {
          from: "newsletter@example.com",
          id: "e1",
          receivedAt: 0,
          subject: "Subject",
        },
        id: "l1",
        title: "Link title",
        url: "https://example.com/a",
      }}
      onDiscard={() => undefined}
      onSave={onSave}
      position={1}
      total={3}
    />
  );

  await user.click(rendered.getByRole("button", { name: "Save" }));

  expect(onSave).toHaveBeenCalledOnce();
});

test("calls onDiscard when Discard is clicked", async () => {
  const onDiscard = vi.fn();
  const user = userEvent.setup();

  const rendered = render(
    <FocusView
      item={{
        description: "Desc",
        email: {
          from: "newsletter@example.com",
          id: "e1",
          receivedAt: 0,
          subject: "Subject",
        },
        id: "l1",
        title: "Link title",
        url: "https://example.com/a",
      }}
      onDiscard={onDiscard}
      onSave={() => undefined}
      position={1}
      total={3}
    />
  );

  await user.click(rendered.getByRole("button", { name: "Discard" }));

  expect(onDiscard).toHaveBeenCalledOnce();
});
