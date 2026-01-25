import { redirect } from "next/navigation";

function toQueryString(
  searchParams: Record<string, string | string[] | undefined>
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      params.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        params.append(key, entry);
      }
    }
  }

  return params.toString();
}

export default function BrowsePage(props: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const qs = toQueryString(props.searchParams);
  redirect(qs ? `/browse/deck?${qs}` : "/browse/deck");
}
