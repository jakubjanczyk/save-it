import { expect, test, vi } from "vitest";

const { cookiesMock, cookiesSetMock, redirectMock } = vi.hoisted(() => {
  const cookiesSetMock = vi.fn();
  const cookiesMock = vi.fn(() => ({ set: cookiesSetMock }));
  const redirectMock = vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  });

  return { cookiesMock, cookiesSetMock, redirectMock };
});

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import { login } from "./actions";
import {SESSION_COOKIE_NAME} from "@/lib/auth"

test("returns config error when APP_PASSWORD missing", async () => {
  process.env.APP_PASSWORD = "";
  process.env.JWT_SECRET = "secret";

  const formData = new FormData();
  formData.set("password", "anything");

  const result = await login({}, formData);
  expect(result.error).toBe("Server is missing auth configuration");
});

test("returns config error when JWT_SECRET missing", async () => {
  process.env.APP_PASSWORD = "pw";
  process.env.JWT_SECRET = "";

  const formData = new FormData();
  formData.set("password", "pw");

  const result = await login({}, formData);
  expect(result.error).toBe("Server is missing auth configuration");
});

test("returns error when password is invalid", async () => {
  process.env.APP_PASSWORD = "pw";
  process.env.JWT_SECRET = "secret";

  const formData = new FormData();
  formData.set("password", "wrong");

  const result = await login({}, formData);
  expect(result.error).toBe("Invalid password");
});

test("does not set cookie when password is invalid", async () => {
  process.env.APP_PASSWORD = "pw";
  process.env.JWT_SECRET = "secret";

  cookiesSetMock.mockClear();

  const formData = new FormData();
  formData.set("password", "wrong");

  await login({}, formData);
  expect(cookiesSetMock).not.toHaveBeenCalled();
});

test("calls redirect after successful login", async () => {
  process.env.APP_PASSWORD = "pw";
  process.env.JWT_SECRET = "secret";

  redirectMock.mockClear();

  const formData = new FormData();
  formData.set("password", "pw");

  await expect(login({}, formData)).rejects.toThrow("NEXT_REDIRECT");
});

test("sets cookie name on successful login", async () => {
  process.env.APP_PASSWORD = "pw";
  process.env.JWT_SECRET = "secret";

  cookiesSetMock.mockClear();

  const formData = new FormData();
  formData.set("password", "pw");

  await expect(login({}, formData)).rejects.toThrow("NEXT_REDIRECT");

  expect(cookiesSetMock.mock.calls[0]?.[0]).toBe(SESSION_COOKIE_NAME);
});

test("sets JWT-like cookie value on successful login", async () => {
  process.env.APP_PASSWORD = "pw";
  process.env.JWT_SECRET = "secret";

  cookiesSetMock.mockClear();

  const formData = new FormData();
  formData.set("password", "pw");

  await expect(login({}, formData)).rejects.toThrow("NEXT_REDIRECT");

  const token = String(cookiesSetMock.mock.calls[0]?.[1] ?? "");
  expect(token.split(".")).toHaveLength(3);
});

test("sets httpOnly cookie on successful login", async () => {
  process.env.APP_PASSWORD = "pw";
  process.env.JWT_SECRET = "secret";

  cookiesSetMock.mockClear();

  const formData = new FormData();
  formData.set("password", "pw");

  await expect(login({}, formData)).rejects.toThrow("NEXT_REDIRECT");

  expect(cookiesSetMock.mock.calls[0]?.[2]?.httpOnly).toBe(true);
});
