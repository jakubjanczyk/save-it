import type { GenericId } from "convex/values";

import type { FocusViewItem } from "@/components/focus-view";

export function toFocusViewItem(item: {
  description: string;
  email: {
    from: string;
    id: GenericId<"emails">;
    receivedAt: number;
    subject: string;
  };
  id: GenericId<"links">;
  title: string;
  url: string;
}): FocusViewItem {
  return {
    description: item.description,
    email: {
      from: item.email.from,
      id: item.email.id,
      receivedAt: item.email.receivedAt,
      subject: item.email.subject,
    },
    id: item.id,
    title: item.title,
    url: item.url,
  };
}
