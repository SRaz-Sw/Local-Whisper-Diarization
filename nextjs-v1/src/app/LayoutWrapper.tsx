"use client";

import { useRouterStore } from "./web-transc/store/useRouterStore";
import { SidebarProvider } from "@/components/ui/sidebar";
import HomeNavbar from "@/components/home-navbar/HomeNavbar";
import HomeSidebar from "@/components/home-sidebar/HomeSidebar";
import { Toaster } from "sonner";

export function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentView = useRouterStore((state) => state.currentView);
  const showSidebar = currentView !== "landing";

  return (
    <SidebarProvider>
      <div className="relative w-full">
        <HomeNavbar />
        <div className="mx-auto flex h-full max-h-[calc(100svw-4rem)] max-w-svh pt-[4rem]">
          {showSidebar && <HomeSidebar />}
          <main className="w-full">{children}</main>
          <Toaster position="top-center" />
        </div>
      </div>
    </SidebarProvider>
  );
}
