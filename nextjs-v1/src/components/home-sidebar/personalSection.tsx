"use client";

import { HomeIcon, MessageCircleIcon, UsersIcon, PhoneCallIcon, HistoryIcon, HeartIcon, ImageIcon, SearchIcon } from "lucide-react";
import { SidebarGroup, 
    SidebarGroupContent, 
    SidebarMenu, 
    SidebarGroupLabel,
    SidebarMenuItem,
     SidebarMenuButton } from "../ui/sidebar";
import Link from "next/link";

const items = [
{
    title: "History",
    url: "/history",
    icon: <HistoryIcon />,
    auth: true,
},
{
    title: "Liked media",
    url: "/liked-media",
    icon: <HeartIcon />,
    auth: true,
},
{
    title: "All media",
    url: "/all-media",
    icon: <ImageIcon />,
    auth: true,
},

]

const PersonalSection = () => {
    return (
        <SidebarGroup>
            <SidebarGroupLabel>Personal</SidebarGroupLabel>
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
    )
}   
export default PersonalSection;