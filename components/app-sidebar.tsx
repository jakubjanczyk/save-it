"use client";

import {
  HistoryIcon,
  HomeIcon,
  LogsIcon,
  SettingsIcon,
  TargetIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  {
    title: "Match",
    href: "/",
    icon: TargetIcon,
  },
  {
    title: "Inbox",
    href: "/inbox",
    icon: HomeIcon,
  },
  {
    title: "Senders",
    href: "/senders",
    icon: UsersIcon,
  },
  {
    title: "Sync logs",
    href: "/sync-logs",
    icon: LogsIcon,
  },
  {
    title: "Sync runs",
    href: "/sync-runs",
    icon: HistoryIcon,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: SettingsIcon,
  },
] as const;

function isNavItemActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/" || pathname.startsWith("/match");
  }

  if (href === "/inbox") {
    return pathname === "/inbox" || pathname.startsWith("/emails");
  }

  return pathname === href;
}

export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Save it</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = isNavItemActive(pathname, item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link
                        href={item.href}
                        onClick={() => {
                          if (isMobile) {
                            setOpenMobile(false);
                          }
                        }}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
