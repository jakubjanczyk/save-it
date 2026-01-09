import type { SelectableLink } from "./use-link-selection";

export function toSelectableLinks(
  links:
    | Array<{
        description: string;
        _id: string;
        status: "pending" | "saved" | "discarded";
        title: string;
        url: string;
      }>
    | undefined
): SelectableLink[] {
  if (!links) {
    return [];
  }

  return links.map((link) => ({
    description: link.description,
    id: link._id as SelectableLink["id"],
    status: link.status,
    title: link.title,
    url: link.url,
  }));
}
