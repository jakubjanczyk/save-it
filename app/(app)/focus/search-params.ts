export interface FocusSearchParams {
  linkId?: string | string[];
}

async function resolveSearchParams(
  value: FocusSearchParams | Promise<FocusSearchParams> | undefined
) {
  return value ? await value : undefined;
}

function firstSearchParamValue(value: string | string[] | undefined) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return undefined;
}

export async function resolveRequestedLinkId(
  searchParams: FocusSearchParams | Promise<FocusSearchParams> | undefined
) {
  const resolved = await resolveSearchParams(searchParams);
  return firstSearchParamValue(resolved?.linkId) ?? null;
}
