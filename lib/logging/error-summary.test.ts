import { expect, test } from "vitest";

import { summarizeError } from "./error-summary";

test("summarizeError returns { value } for non-objects", () => {
  expect(summarizeError("nope")).toEqual({ value: "nope" });
});

test("summarizeError includes name/message/tag when present", () => {
  expect(
    summarizeError({ _tag: "Tagged", message: "msg", name: "ErrName" })
  ).toEqual({
    cause: undefined,
    message: "msg",
    name: "ErrName",
    tag: "Tagged",
  });
});

test("summarizeError includes cause name/message when cause is an object", () => {
  expect(
    summarizeError({ cause: { message: "inner", name: "Inner" } })
  ).toEqual({
    cause: { message: "inner", name: "Inner" },
    message: undefined,
    name: undefined,
    tag: undefined,
  });
});

test("summarizeError includes cause value when cause is not an object", () => {
  expect(summarizeError({ cause: 123 })).toEqual({
    cause: { value: 123 },
    message: undefined,
    name: undefined,
    tag: undefined,
  });
});
