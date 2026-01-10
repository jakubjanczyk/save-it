import type { ReactNode } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-3 sm:h-12 sm:px-4">
          <SidebarTrigger className="size-9" />
          <div className="font-medium">Save it</div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
