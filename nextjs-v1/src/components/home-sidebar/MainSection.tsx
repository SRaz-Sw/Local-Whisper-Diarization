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
import Link from "next/link";

const items = [
  {
    title: "Web Transcribe",
    url: "/web-transc",
    icon: <DatabaseIcon />,
    auth: true,
  },
  //   {
  //     title: "Lawyer Lens",
  //     url: "/lawyer-lens",
  //     icon: <FileIcon />,
  //     auth: true,
  //   },
  // {
  // 	title: 'React Query',
  // 	url: '/query-test',
  // 	icon: <DatabaseIcon />,
  // 	auth: true,
  // },
  // {
  // 	title: 'Lawyer Lens',
  // 	url: '/lawyer-lens',
  // 	icon: <FileIcon />,
  // 	auth: true,
  // },
  // {
  //     title: "RealtimeDemo",
  //     url: "/realtime-demo",
  //     icon: <MessageCircleIcon />,
  //     auth: true,
  // },
  // {
  // 	title: 'Chats',
  // 	url: '/conversations',
  // 	icon: <MessageCircleIcon />,
  // 	auth: true,
  // },
  // {
  // 	title: 'Home',
  // 	url: '/',
  // 	icon: <HomeIcon />,
  // 	auth: false,
  // },
  // {
  // 	title: 'Search MongoDB',
  // 	url: '/search-mongo',
  // 	icon: <SearchIcon />,
  // 	auth: true,
  // },
  // {
  // 	title: 'Compare',
  // 	url: '/compare',
  // 	icon: <FileIcon />,
  // 	auth: true,
  // },
  // {
  //     title: "Groups",
  //     url: "/groups",
  //     icon: <UsersIcon />,
  //     auth: true,
  // },
  // {
  //     title: "Calls",
  //     url: "/calls",
  //     icon: <PhoneCallIcon />,
  //     auth: true,
  // }
];

const MainSection = () => {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                asChild
                isActive={false} // TODO: look at current pathname
                onClick={() => {}} // TODO: do something on click
              >
                <Link href={item.url} className="flex items-center gap-4">
                  {item.icon}
                  <span className="text-sm">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};
export default MainSection;
