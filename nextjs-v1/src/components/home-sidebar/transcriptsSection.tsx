"use client";

import {
  HomeIcon,
  MessageCircleIcon,
  UsersIcon,
  PhoneCallIcon,
  HistoryIcon,
  HeartIcon,
  ImageIcon,
  SearchIcon,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarGroupLabel,
  SidebarMenuItem,
  SidebarMenuButton,
} from "../ui/sidebar";
import Link from "next/link";
import { useTranscripts } from "@/app/web-transc/hooks/useTranscripts";

const TranscriptsSection = () => {
  const {
    save: saveTranscript,
    transcripts: savedTranscripts,
    loading: transcriptsLoading,
    remove: removeTranscript,
    getWithAudio,
    updateMetadata,
  } = useTranscripts();

  if (transcriptsLoading) {
    return <div>Loading...</div>;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Recordings</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {savedTranscripts.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                tooltip={item.metadata.fileName}
                asChild
                isActive={false} // TODO: look at current pathname
                onClick={() => {}} // TODO: do something on click
              >
                <Link
                  href={`/web-transc/transcript/${item.id}`}
                  className="flex items-center gap-4"
                >
                  <span className="max-w-[100px] truncate text-sm">
                    {item.metadata.fileName}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};
export default TranscriptsSection;
