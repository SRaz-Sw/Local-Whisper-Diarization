"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarGroupLabel,
  SidebarMenuItem,
  SidebarMenuButton,
} from "../ui/sidebar";
import { useTranscripts } from "@/app/web-transc/hooks/useTranscripts";
import { useRouterStore } from "@/app/web-transc/store/useRouterStore";

const TranscriptsSection = () => {
  const {
    save: saveTranscript,
    transcripts: savedTranscripts,
    loading: transcriptsLoading,
    remove: removeTranscript,
    getWithAudio,
    updateMetadata,
  } = useTranscripts();

  const navigate = useRouterStore((state) => state.navigate);
  const currentView = useRouterStore((state) => state.currentView);
  const params = useRouterStore((state) => state.params);

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
                isActive={
                  currentView === "transcript" && params.id === item.id
                }
                onClick={() => navigate("transcript", { id: item.id })}
              >
                <span className="truncate text-sm">
                  {item.metadata.conversationName ||
                    item.metadata.fileName}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};
export default TranscriptsSection;
