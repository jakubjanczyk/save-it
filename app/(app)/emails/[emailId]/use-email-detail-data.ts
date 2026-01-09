"use client";

import { useQuery } from "convex/react";
import type { GenericId } from "convex/values";

import { listLinksByEmail, listWithPendingLinks } from "../../home-convex-refs";
import { toSelectableLinks } from "./to-selectable-links";

export function useEmailDetailData(params: {
  emailId: GenericId<"emails"> | null;
}) {
  const emails = useQuery(listWithPendingLinks, {});
  const links = useQuery(
    listLinksByEmail,
    params.emailId ? { emailId: params.emailId } : "skip"
  );

  return {
    emails,
    linksLoading: links === undefined,
    listViewLinks: toSelectableLinks(links),
  };
}
