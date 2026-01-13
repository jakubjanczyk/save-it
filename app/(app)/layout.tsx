import type { ReactNode } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset className="pb-[calc(theme(spacing.20)+env(safe-area-inset-bottom))] md:pb-0">
        <header className="flex h-14 items-center gap-2 border-b px-3 sm:h-12 sm:px-4">
          <SidebarTrigger className="hidden size-9 md:inline-flex" />
          <div className="font-medium">Save it</div>
        </header>
        {children}
      </SidebarInset>
      <MobileBottomNav />
    </SidebarProvider>
  );
}
