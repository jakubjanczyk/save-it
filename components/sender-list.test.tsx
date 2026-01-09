import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { GenericId } from "convex/values";
import { afterEach, expect, test, vi } from "vitest";

import { SenderList } from "./sender-list";

afterEach(() => {
  cleanup();
});

test("shows empty state when there are no senders", () => {
  const rendered = render(
    <SenderList onDelete={() => undefined} senders={[]} />
  );

  expect(rendered.getByText("No senders yet.")).toBeInTheDocument();
});

test("renders sender rows", () => {
  const rendered = render(
    <SenderList
      onDelete={() => undefined}
      senders={[
        {
          id: "1" as GenericId<"senders">,
          email: "a@b.com",
          name: "Newsletter A",
        },
        { id: "2" as GenericId<"senders">, email: "c@d.com" },
      ]}
    />
  );

  expect(rendered.getByText("Newsletter A")).toBeInTheDocument();
  expect(rendered.getByText("a@b.com")).toBeInTheDocument();
  expect(rendered.getByText("c@d.com")).toBeInTheDocument();
});

test("calls onDelete when remove is clicked", async () => {
  const onDelete = vi.fn();
  const user = userEvent.setup();
  const rendered = render(
    <SenderList
      onDelete={onDelete}
      senders={[{ id: "1" as GenericId<"senders">, email: "a@b.com" }]}
    />
  );

  await user.click(rendered.getByRole("button", { name: "Remove a@b.com" }));

  expect(onDelete).toHaveBeenCalledWith("1");
});
