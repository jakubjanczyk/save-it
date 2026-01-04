import { cleanup, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { cookiesMock, cookiesSetMock, redirectMock } = vi.hoisted(() => {
  const cookiesSetMock = vi.fn();
  const cookiesMock = vi.fn(() => ({ set: cookiesSetMock }));
  const redirectMock = vi.fn();

  return { cookiesMock, cookiesSetMock, redirectMock };
});

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import { SESSION_COOKIE_NAME } from "@/proxy";
import LoginPage from "./page";

beforeEach(() => {
  cookiesSetMock.mockClear();
  redirectMock.mockClear();
});

afterEach(() => {
  cleanup();
});

async function submitPassword(password: string) {
  const user = userEvent.setup();
  const rendered = render(<LoginPage />);
  await user.type(rendered.getByLabelText("Password"), password);
  await user.click(rendered.getByRole("button", { name: "Sign in" }));
  return rendered;
}

test("shows configuration error when auth env is missing", async () => {
  process.env.APP_PASSWORD = "";
  process.env.JWT_SECRET = "";

  const rendered = await submitPassword("anything");

  expect(await rendered.findByRole("alert")).toHaveTextContent(
    "Server is missing auth configuration"
  );
});

test("shows error when password is invalid", async () => {
  process.env.APP_PASSWORD = "pw";
  process.env.JWT_SECRET = "secret";

  const rendered = await submitPassword("wrong");

  expect(await rendered.findByRole("alert")).toHaveTextContent(
    "Invalid password"
  );
});

test("does not set cookie when password is invalid", async () => {
  process.env.APP_PASSWORD = "pw";
  process.env.JWT_SECRET = "secret";

  await submitPassword("wrong");

  expect(cookiesSetMock).not.toHaveBeenCalled();
});

test("sets a cookie when password is valid", async () => {
  process.env.APP_PASSWORD = "pw";
  process.env.JWT_SECRET = "secret";

  await submitPassword("pw");

  await waitFor(() => {
    expect(cookiesSetMock).toHaveBeenCalled();
  });
});

test("sets the session cookie name when password is valid", async () => {
  process.env.APP_PASSWORD = "pw";
  process.env.JWT_SECRET = "secret";

  await submitPassword("pw");

  await waitFor(() => {
    expect(cookiesSetMock.mock.calls[0]?.[0]).toBe(SESSION_COOKIE_NAME);
  });
});

test("calls redirect when password is valid", async () => {
  process.env.APP_PASSWORD = "pw";
  process.env.JWT_SECRET = "secret";

  await submitPassword("pw");

  await waitFor(() => {
    expect(redirectMock).toHaveBeenCalledWith("/");
  });
});

