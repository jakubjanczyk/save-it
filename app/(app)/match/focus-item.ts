import type { GenericId } from "convex/values";

export interface FocusItem {
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
}
