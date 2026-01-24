"use client";

import { BookmarkIcon, HomeIcon, MenuIcon, TargetIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

function isNavItemActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/" || pathname.startsWith("/match");
  }

  if (href === "/inbox") {
    return pathname === "/inbox" || pathname.startsWith("/emails");
  }

  if (href === "/browse") {
    return pathname === "/browse";
  }

  return pathname === href;
}

const primaryItems = [
  {
    title: "Match",
    href: "/",
    icon: TargetIcon,
  },
  {
    title: "Browse",
    href: "/browse",
    icon: BookmarkIcon,
  },
  {
    title: "Inbox",
    href: "/inbox",
    icon: HomeIcon,
  },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const { openMobile, setOpenMobile } = useSidebar();
  const isPrimaryActive = primaryItems.some((item) =>
    isNavItemActive(pathname, item.href)
  );
  const isMoreActive = !isPrimaryActive;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
    >
      <div className="grid grid-cols-4 gap-1 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        {primaryItems.map((item) => {
          const isActive = isNavItemActive(pathname, item.href);
          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-12 flex-col items-center justify-center gap-1 rounded-md text-muted-foreground text-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                isActive && "bg-accent text-accent-foreground"
              )}
              href={item.href}
              key={item.href}
            >
              <item.icon className="size-5" />
              <span>{item.title}</span>
            </Link>
          );
        })}

        <button
          aria-current={isMoreActive ? "page" : undefined}
          className={cn(
            "flex h-12 flex-col items-center justify-center gap-1 rounded-md text-muted-foreground text-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
            isMoreActive && "bg-accent text-accent-foreground"
          )}
          onClick={() => {
            setOpenMobile(!openMobile);
          }}
          type="button"
        >
          <MenuIcon className="size-5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
