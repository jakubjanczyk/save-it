"use client";

import { ArrowDownAZ, ArrowUpZA, LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";

import { parseSortOrder } from "./browse-search-params";

function withSearchParams(href: string, queryString: string) {
  return queryString ? `${href}?${queryString}` : href;
}

export function BrowseHeaderControls() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const queryString = searchParams.toString();
  const sortOrder = parseSortOrder(searchParams.get("order"));

  const activeView = pathname.endsWith("/list") ? "list" : "deck";

  const toggleViewHref = useMemo(() => {
    const nextHref = activeView === "deck" ? "/browse/list" : "/browse/deck";
    return withSearchParams(nextHref, queryString);
  }, [activeView, queryString]);

  const orderHref = useMemo(() => {
    const next = sortOrder === "oldest" ? "newest" : "oldest";
    const params = new URLSearchParams(searchParams);
    params.set("order", next);
    return withSearchParams(pathname, params.toString());
  }, [pathname, searchParams, sortOrder]);

  return (
    <div className="flex items-center gap-2">
      <Button
        asChild
        size="sm"
        title={sortOrder === "oldest" ? "Oldest first" : "Newest first"}
        variant="outline"
      >
        <Link href={orderHref}>
          {sortOrder === "oldest" ? (
            <ArrowDownAZ className="h-4 w-4" />
          ) : (
            <ArrowUpZA className="h-4 w-4" />
          )}
          <span className="ml-1 hidden sm:inline">
            {sortOrder === "oldest" ? "Oldest" : "Newest"}
          </span>
        </Link>
      </Button>

      <Button
        asChild
        size="sm"
        title={activeView === "deck" ? "Deck view" : "List view"}
        variant="outline"
      >
        <Link href={toggleViewHref}>
          {activeView === "deck" ? (
            <LayoutGrid className="h-4 w-4" />
          ) : (
            <List className="h-4 w-4" />
          )}
          <span className="ml-1 hidden sm:inline">
            {activeView === "deck" ? "Deck" : "List"}
          </span>
        </Link>
      </Button>
    </div>
  );
}
