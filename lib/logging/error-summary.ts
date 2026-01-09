function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function summarizeError(error: unknown): Record<string, unknown> {
  if (!isRecord(error)) {
    return { value: error };
  }

  const record = error as Record<string, unknown>;

  let cause: Record<string, unknown> | undefined;
  if ("cause" in record && record.cause != null) {
    const recordCause = record.cause;

    if (isRecord(recordCause)) {
      const causeRecord = recordCause as { name?: unknown; message?: unknown };

      cause = {
        name:
          typeof causeRecord.name === "string" ? causeRecord.name : undefined,
        message:
          typeof causeRecord.message === "string"
            ? causeRecord.message
            : undefined,
      };
    } else {
      cause = { value: recordCause };
    }
  }

  return {
    name: typeof record.name === "string" ? record.name : undefined,
    tag: typeof record._tag === "string" ? record._tag : undefined,
    message: typeof record.message === "string" ? record.message : undefined,
    cause,
  };
}
