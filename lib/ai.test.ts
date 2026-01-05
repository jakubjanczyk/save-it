import { expect, test } from "vitest";

import {
  createGeminiModel,
  type Env,
  getLlmModelName,
  requireGoogleGenerativeAiApiKey,
} from "./ai";

test("getLlmModelName defaults to gemini-3-flash", () => {
  expect(getLlmModelName({} satisfies Env)).toBe("gemini-3-flash");
});

test("getLlmModelName reads LLM_MODEL", () => {
  expect(getLlmModelName({ LLM_MODEL: "gemini-x" } satisfies Env)).toBe(
    "gemini-x"
  );
});

test("requireGoogleGenerativeAiApiKey throws when missing", () => {
  expect(() => requireGoogleGenerativeAiApiKey({} satisfies Env)).toThrowError(
    "Missing GOOGLE_GENERATIVE_AI_API_KEY"
  );
});

test("requireGoogleGenerativeAiApiKey returns the key", () => {
  expect(
    requireGoogleGenerativeAiApiKey({
      GOOGLE_GENERATIVE_AI_API_KEY: "key",
    } satisfies Env)
  ).toBe("key");
});

test("createGeminiModel throws when key is missing", () => {
  expect(() => createGeminiModel({} satisfies Env)).toThrowError(
    "Missing GOOGLE_GENERATIVE_AI_API_KEY"
  );
});
