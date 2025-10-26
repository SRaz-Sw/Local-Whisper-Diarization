"use client";

import {
  HomeIcon,
  DatabaseIcon,
  UploadIcon,
  PlaneIcon,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "../ui/sidebar";
import { useRouterStore } from "@/app/web-transc/store/useRouterStore";
import type { ViewName } from "@/app/web-transc/router/types";

interface NavItem {
  title: string;
  view: ViewName;
  icon: React.ReactNode;
}

const items: NavItem[] = [
  {
    title: "Landing Page",
    view: "landing",
    icon: <PlaneIcon />,
  },
  {
    title: "Upload",
    view: "upload",
    icon: <UploadIcon />,
  },
];

const MainSection = () => {
  const navigate = useRouterStore((state) => state.navigate);
  const currentView = useRouterStore((state) => state.currentView);

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={currentView === item.view}
                onClick={() => navigate(item.view)}
              >
                <div className="flex items-center gap-4">
                  {item.icon}
                  <span className="text-sm">{item.title}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};
export default MainSection;
