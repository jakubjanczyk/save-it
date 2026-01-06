import { google } from "@ai-sdk/google";

export type Env = Record<string, string | undefined>;

export function getLlmModelName(env: Env = process.env) {
  return env.LLM_MODEL ?? "gemini-2.5-flash";
}

export function requireGoogleGenerativeAiApiKey(env: Env = process.env) {
  const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY");
  }
  return apiKey;
}

export function createGeminiModel(env: Env = process.env) {
  requireGoogleGenerativeAiApiKey(env);
  return google(getLlmModelName(env));
}
