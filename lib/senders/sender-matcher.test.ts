import { expect, test } from "vitest";

import {
  findSenderId,
  parseEmailAddress,
  senderMatches,
} from "./sender-matcher";

test("parseEmailAddress returns email inside angle brackets", () => {
  expect(parseEmailAddress("Newsletter <news@example.com>")).toBe(
    "news@example.com"
  );
});

test("parseEmailAddress returns email token when no angle brackets", () => {
  expect(parseEmailAddress("Hello from news@example.com today")).toBe(
    "news@example.com"
  );
});

test("senderMatches returns true for exact match (case-insensitive)", () => {
  expect(senderMatches("NEWS@EXAMPLE.COM", "news@example.com")).toBe(true);
});

test("senderMatches returns true for wildcard domain match", () => {
  expect(senderMatches("*@example.com", "news@example.com")).toBe(true);
});

test("findSenderId returns the matching sender id", () => {
  const senders = [
    { _id: "a", email: "one@example.com" },
    { _id: "b", email: "*@example.com" },
  ] as const;

  expect(findSenderId(senders, "Newsletter <news@example.com>")).toBe("b");
});
