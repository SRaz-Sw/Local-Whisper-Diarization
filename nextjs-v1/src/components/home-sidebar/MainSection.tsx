"use client";

import {
  HomeIcon,
  MessageCircleIcon,
  UsersIcon,
  PhoneCallIcon,
  DatabaseIcon,
  FileIcon,
  SearchIcon,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "../ui/sidebar";
import { useRouterStore } from "@/app/web-transc/store/useRouterStore";

const items = [
  {
    title: "Web Transcribe",
    url: "/web-transc",
    icon: <DatabaseIcon />,
    auth: true,
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
                isActive={currentView === "upload"}
                onClick={() => navigate("upload")}
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
