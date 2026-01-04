import { Data } from "effect";

// Gmail errors
export class GmailTokenExpired extends Data.TaggedError("GmailTokenExpired")<{
  message: string;
}> {}

export class GmailTokenRefreshFailed extends Data.TaggedError(
  "GmailTokenRefreshFailed"
)<{
  message: string;
  cause?: unknown;
}> {}

export class GmailRateLimited extends Data.TaggedError("GmailRateLimited")<{
  retryAfter?: number;
}> {}

export class GmailNetworkError extends Data.TaggedError("GmailNetworkError")<{
  message: string;
  cause?: unknown;
}> {}

export class GmailMessageNotFound extends Data.TaggedError(
  "GmailMessageNotFound"
)<{
  messageId: string;
}> {}

// Raindrop errors
export class RaindropAuthError extends Data.TaggedError("RaindropAuthError")<{
  message: string;
}> {}

export class RaindropRateLimited extends Data.TaggedError(
  "RaindropRateLimited"
)<{
  retryAfter?: number;
}> {}

export class RaindropNetworkError extends Data.TaggedError(
  "RaindropNetworkError"
)<{
  message: string;
  cause?: unknown;
}> {}

export class RaindropSaveFailed extends Data.TaggedError("RaindropSaveFailed")<{
  url: string;
  message: string;
}> {}

// Link extraction errors
export class ExtractionLLMError extends Data.TaggedError("ExtractionLLMError")<{
  message: string;
  cause?: unknown;
}> {}

export class ExtractionParseError extends Data.TaggedError(
  "ExtractionParseError"
)<{
  message: string;
  rawResponse?: string;
}> {}

export class ExtractionTimeout extends Data.TaggedError("ExtractionTimeout")<{
  timeoutMs: number;
}> {}
