"use client";
import { SettingsIcon, UserIcon, LogOutIcon, Loader2 } from "lucide-react";
import { SidebarGroup, 
    SidebarGroupContent, 
    SidebarMenu, 
    SidebarGroupLabel,
    SidebarMenuItem,
    SidebarMenuButton } from "../ui/sidebar";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { useCurrentUser } from "@/hooks/useAuth";
import { Separator } from "../ui/separator";
import { useEffect, useState } from "react";


// const settingsItems = [
// {
//     title: "Settings",
//     url: "/settings",
//     icon: <SettingsIcon />,
//     auth: true,
// }
// ];

  
const BottomSection = () => {
    const { user, isLoadingUser } = useCurrentUser();
    const [isClient, setIsClient] = useState(false);
    // useEffect runs only on the client, after the initial render
    useEffect(() => {
      setIsClient(true);
    }, []); // Empty dependency array ensures it runs only once on mount
    if (!isClient || isLoadingUser) {
      return <>
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
      </>;
    }
    
    return (
        <>
            <SidebarGroup>

                <SidebarGroupContent>
                    <SidebarMenu>
                        {/* {settingsItems.map((item) => (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton 
                                tooltip={item.title}
                                asChild
                                isActive={false} // TODO: look at current pathname
                                // onClick={() => {}} // TODO: do something on click
                                > 
                                    <Link href={item.url} className="flex items-center gap-4">
                                        {item.icon}
                                        <span className="text-sm">{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))} */}
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
            
            <SidebarGroup>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton 
                            tooltip="Profile"
                            asChild
                            isActive={false}
                            // onClick={() => {}}
                            > 
                                <Link href="/profile" className="flex items-center gap-4">
                                    <Avatar className="h-4 w-4">

                                        <AvatarImage src={user?.image || "/avatar-placeholder.png"} alt={user?.name || "User"} />
                                        {/* <AvatarImage src={defaultUser.profilePicture} alt={defaultUser.name} /> */}
                                        <AvatarFallback className="flex items-center gap-4">
                                            <UserIcon className="h-4 w-4" />
                                        </AvatarFallback>
                                    </Avatar>
                                    {/* <span className="text-sm">{defaultUser.name}</span> */}
                                    <span className="text-sm">{user?.name || "Guest User"}</span>

                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        </>
    )
}   
export default BottomSection;