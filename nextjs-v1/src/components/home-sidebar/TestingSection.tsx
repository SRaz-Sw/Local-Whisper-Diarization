// "use client";

// import { HomeIcon, MessageCircleIcon, UsersIcon, PhoneCallIcon, HistoryIcon, HeartIcon, ImageIcon, BabyIcon, MusicIcon, Type, Brain, Save } from "lucide-react";
// import { SidebarGroup, 
//     SidebarGroupContent, 
//     SidebarMenu, 
//     SidebarGroupLabel,
//     SidebarMenuItem,
//      SidebarMenuButton } from "../ui/sidebar";
// import Link from "next/link";
// import { IconPhotoScan } from "@tabler/icons-react";

// const items = [

// {
//     title: "OCR",
//     url: "/ocr-test",
//     icon: <Brain />,
//     auth: false,
// },

// plan: 
// 1. Entry point - get pdfs/images in base64 format
// 2. { in parallel:
//         a. save pdfs / images to bucket -> (Save to original_files_paths)
//         b. process OCR -> Markdown + photos
//     }

// ]

// const FullstackPortfolioSection = () => {
//     return (
//         <SidebarGroup>
//             <SidebarGroupLabel>OCR Tests</SidebarGroupLabel>
//             <SidebarGroupContent>
//                 <SidebarMenu>
//                     {items.map((item) => (
//                         <SidebarMenuItem key={item.title}>
//                             <SidebarMenuButton 
//                             tooltip={item.title}
//                             asChild
//                             isActive={false} // TODO: look at current pathname
//                             onClick={() => {}} // TODO: do something on click
//                             > 
//                                 <Link href={item.url} className="flex items-center gap-4">
//                                     {item.icon}
//                                     <span className="text-sm">{item.title}</span>
//                                 </Link>
//                             </SidebarMenuButton>
//                         </SidebarMenuItem>
//                     ))}
//                 </SidebarMenu>
//                 </SidebarGroupContent>
//         </SidebarGroup>
//     )
// }   
// export default FullstackPortfolioSection;