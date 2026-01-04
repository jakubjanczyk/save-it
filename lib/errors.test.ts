import { describe, expect, test } from "vitest";

import {
  ExtractionLLMError,
  ExtractionParseError,
  ExtractionTimeout,
  GmailMessageNotFound,
  GmailNetworkError,
  GmailRateLimited,
  GmailTokenExpired,
  GmailTokenRefreshFailed,
  RaindropAuthError,
  RaindropNetworkError,
  RaindropRateLimited,
  RaindropSaveFailed,
} from "./errors";

describe("Gmail errors", () => {
  test("GmailTokenExpired sets _tag", () => {
    expect(new GmailTokenExpired({ message: "expired" })._tag).toBe(
      "GmailTokenExpired"
    );
  });

  test("GmailTokenExpired keeps message", () => {
    expect(new GmailTokenExpired({ message: "expired" }).message).toBe(
      "expired"
    );
  });

  test("GmailTokenRefreshFailed sets _tag", () => {
    expect(new GmailTokenRefreshFailed({ message: "x" })._tag).toBe(
      "GmailTokenRefreshFailed"
    );
  });

  test("GmailTokenRefreshFailed keeps message", () => {
    expect(
      new GmailTokenRefreshFailed({ message: "refresh failed" }).message
    ).toBe("refresh failed");
  });

  test("GmailTokenRefreshFailed keeps cause", () => {
    const error = new Error("nope");
    expect(
      new GmailTokenRefreshFailed({ message: "refresh failed", cause: error })
        .cause
    ).toBe(error);
  });

  test("GmailRateLimited sets _tag", () => {
    expect(new GmailRateLimited({})._tag).toBe("GmailRateLimited");
  });

  test("GmailRateLimited keeps retryAfter", () => {
    expect(new GmailRateLimited({ retryAfter: 123 }).retryAfter).toBe(123);
  });

  test("GmailNetworkError sets _tag", () => {
    expect(new GmailNetworkError({ message: "network" })._tag).toBe(
      "GmailNetworkError"
    );
  });

  test("GmailNetworkError keeps message", () => {
    expect(new GmailNetworkError({ message: "network" }).message).toBe(
      "network"
    );
  });

  test("GmailNetworkError keeps cause", () => {
    expect(
      new GmailNetworkError({ message: "network", cause: "ECONNRESET" }).cause
    ).toBe("ECONNRESET");
  });

  test("GmailMessageNotFound sets _tag", () => {
    expect(new GmailMessageNotFound({ messageId: "abc" })._tag).toBe(
      "GmailMessageNotFound"
    );
  });

  test("GmailMessageNotFound keeps messageId", () => {
    expect(new GmailMessageNotFound({ messageId: "abc" }).messageId).toBe(
      "abc"
    );
  });
});

describe("Raindrop errors", () => {
  test("RaindropAuthError sets _tag", () => {
    expect(new RaindropAuthError({ message: "bad token" })._tag).toBe(
      "RaindropAuthError"
    );
  });

  test("RaindropAuthError keeps message", () => {
    expect(new RaindropAuthError({ message: "bad token" }).message).toBe(
      "bad token"
    );
  });

  test("RaindropRateLimited sets _tag", () => {
    expect(new RaindropRateLimited({})._tag).toBe("RaindropRateLimited");
  });

  test("RaindropRateLimited keeps retryAfter", () => {
    expect(new RaindropRateLimited({ retryAfter: 5 }).retryAfter).toBe(5);
  });

  test("RaindropNetworkError sets _tag", () => {
    expect(new RaindropNetworkError({ message: "timeout" })._tag).toBe(
      "RaindropNetworkError"
    );
  });

  test("RaindropNetworkError keeps message", () => {
    expect(new RaindropNetworkError({ message: "timeout" }).message).toBe(
      "timeout"
    );
  });

  test("RaindropNetworkError keeps cause", () => {
    expect(
      new RaindropNetworkError({
        message: "timeout",
        cause: { code: "ETIMEDOUT" },
      }).cause
    ).toEqual({ code: "ETIMEDOUT" });
  });

  test("RaindropSaveFailed sets _tag", () => {
    expect(new RaindropSaveFailed({ url: "x", message: "y" })._tag).toBe(
      "RaindropSaveFailed"
    );
  });

  test("RaindropSaveFailed keeps url", () => {
    expect(
      new RaindropSaveFailed({ url: "https://example.com", message: "500" }).url
    ).toBe("https://example.com");
  });

  test("RaindropSaveFailed keeps message", () => {
    expect(
      new RaindropSaveFailed({ url: "https://example.com", message: "500" })
        .message
    ).toBe("500");
  });
});

describe("Extraction errors", () => {
  test("ExtractionLLMError sets _tag", () => {
    expect(new ExtractionLLMError({ message: "model error" })._tag).toBe(
      "ExtractionLLMError"
    );
  });

  test("ExtractionLLMError keeps message", () => {
    expect(new ExtractionLLMError({ message: "model error" }).message).toBe(
      "model error"
    );
  });

  test("ExtractionLLMError keeps cause", () => {
    const error = new Error("boom");
    expect(
      new ExtractionLLMError({ message: "model error", cause: error }).cause
    ).toBe(error);
  });

  test("ExtractionParseError sets _tag", () => {
    expect(new ExtractionParseError({ message: "bad json" })._tag).toBe(
      "ExtractionParseError"
    );
  });

  test("ExtractionParseError keeps message", () => {
    expect(new ExtractionParseError({ message: "bad json" }).message).toBe(
      "bad json"
    );
  });

  test("ExtractionParseError keeps rawResponse", () => {
    expect(
      new ExtractionParseError({ message: "bad json", rawResponse: "{" })
        .rawResponse
    ).toBe("{");
  });

  test("ExtractionTimeout sets _tag", () => {
    expect(new ExtractionTimeout({ timeoutMs: 10_000 })._tag).toBe(
      "ExtractionTimeout"
    );
  });

  test("ExtractionTimeout keeps timeoutMs", () => {
    expect(new ExtractionTimeout({ timeoutMs: 10_000 }).timeoutMs).toBe(10_000);
  });
});
