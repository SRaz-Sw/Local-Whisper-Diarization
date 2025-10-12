"use client";
// FILE _________ src/app/conversations/components/ConversationsClientPage.tsx
import { useState, useEffect } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import Link from "next/link";
import Chat from "./Chat";
// import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  useCurrentUser,
  useLogin,
  useRegister,
  useLogout,
} from "@/hooks/useAuth";
import { useNewChatStore } from "@/store/useNewChatStore";
import NewChatDialog from "./NewChatDialog";
import { Plus } from "lucide-react";

import {
  ConversationData,
  UserData,
  MessageData,
  FullConversationType,
} from "../../../../types/schemas";

interface ConversationsClientPageProps {
  initialConversations?: ConversationData[];
  initialActiveConversation?: FullConversationType;
  currentUser?: UserData;
}

export default function ConversationsClientPage({
  initialConversations = [],
  initialActiveConversation,
}: ConversationsClientPageProps) {
  const [isMobileNavigatorOpen, setIsMobileNavigatorOpen] =
    useState(false);
  const [conversations, setConversations] = useState<ConversationData[]>(
    initialConversations,
  );
  // set the active conversation  to be the of type string which will represent the conversation id in the initialConversations array
  const [activeConversation, setActiveConversation] = useState<
    FullConversationType | undefined
  >(initialActiveConversation);
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  // const { user, updateUser } = useCurrentUser();
  const { user: currentUser, isLoadingUser } = useCurrentUser();
  const { open: openNewChatDialog } = useNewChatStore();

  // Check if we're on the base conversations route
  const isBaseRoute = pathname === "/conversations";

  // Automatically open mobile navigator when on base route on mobile
  useEffect(() => {
    if (isBaseRoute && window.innerWidth < 768) {
      setIsMobileNavigatorOpen(true);
    }
  }, [isBaseRoute]);

  // Update active conversation when the parameter changes
  useEffect(() => {
    if (initialActiveConversation) {
      setActiveConversation(initialActiveConversation);
    }
  }, [initialActiveConversation]);

  const handleConversationSelect = (id: string) => {
    setIsMobileNavigatorOpen(false);
    router.push(`/conversations/${id}`);
  };

  const currentUserId = (params?.userId as string) || "";

  return (
    <div className="flex h-full flex-col">
      {/* Main content area with responsive layout */}
      <div className="flex h-full flex-1 flex-col overflow-hidden md:flex-row">
        {/* Conversation Navigator - Sidebar on desktop, hidden on mobile */}
        <div
          className={`bg-secondary hidden min-w-[250px] md:flex md:h-full md:max-h-full md:w-1/3 md:flex-col md:overflow-hidden xl:w-1/4`}
        >
          {/* Search bar with New Chat button */}
          <div className="bg-muted-foreground/10 flex shrink-0 items-center justify-between p-3">
            <div className="bg-accent flex-1 rounded-lg p-2">
              Search conversations
            </div>
            <button
              onClick={openNewChatDialog}
              className="bg-primary/90 text-primary-foreground hover:bg-primary/100 ml-2 rounded-full p-2 transition-colors"
              aria-label="New chat"
            >
              <Plus size={20} />
            </button>
          </div>

          {/* Conversation list - scrollable section */}
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {/* Show server-provided conversations */}
            {conversations.map((conversation) => (
              <Link
                href={`/conversations/${conversation.id}`}
                key={conversation.id}
              >
                <div className="bg-accent hover:bg-muted-foreground/10 mb-2 cursor-pointer rounded-lg p-3 shadow-md">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">
                        {conversation.name}
                      </div>
                      <div className="text-muted-foreground truncate text-sm">
                        {conversation.messages &&
                        conversation.messages.length > 0
                          ? conversation.messages[0].body
                          : "No messages yet"}
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-muted-foreground text-xs">
                        {new Date(
                          conversation.lastMessageAt,
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      {/* We need to calculate unread messages count */}
                      {conversation.messages &&
                        conversation.messages.some(
                          (msg: MessageData) =>
                            !msg.usersSeenIds?.includes(currentUserId),
                        ) && (
                          <div className="bg-sidebar-primary text-sidebar-primary-foreground mt-1 flex h-5 w-5 items-center justify-center rounded-full text-xs">
                            {
                              conversation.messages?.filter(
                                (msg: MessageData) =>
                                  !msg.usersSeenIds?.includes(
                                    currentUserId,
                                  ),
                              ).length
                            }
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {/* Add a spacer at the bottom to ensure scrollability */}
            {conversations.length === 0 && (
              <div className="flex h-full items-center justify-center">
                <div className="text-muted-foreground">
                  No conversations yet
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigator (full screen on mobile when open) */}
        {isMobileNavigatorOpen && (
          <div className="bg-secondary fixed inset-0 z-50 flex flex-col md:hidden">
            <div className="bg-primary/100 text-primary-foreground flex shrink-0 items-center justify-between p-4">
              <h2 className="font-bold">Conversations</h2>
              {/* Only show close button if not on base route */}
              {!isBaseRoute && (
                <button
                  onClick={() => setIsMobileNavigatorOpen(false)}
                  className="bg-primary/90 rounded-full p-2"
                >
                  Close
                </button>
              )}
            </div>

            {/* Search bar with New Chat button */}
            <div className="bg-muted-foreground/10 flex shrink-0 items-center justify-between p-3">
              <div className="bg-accent flex-1 rounded-lg p-2">
                Search conversations
              </div>
              <button
                onClick={openNewChatDialog}
                className="bg-primary/90 text-primary-foreground hover:bg-primary/100 ml-2 rounded-full p-2 transition-colors"
                aria-label="New chat"
              >
                <Plus size={20} />
              </button>
            </div>

            {/* Conversation list - scrollable section */}
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="bg-accent hover:bg-muted-foreground/10 mb-2 cursor-pointer rounded-lg p-3 shadow-md"
                  onClick={() => handleConversationSelect(conversation.id)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">
                        {conversation.name}
                      </div>
                      <div className="text-muted-foreground truncate text-sm">
                        {conversation.messages &&
                        conversation.messages.length > 0
                          ? conversation.messages[0].body
                          : "No messages yet"}
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-muted-foreground text-xs">
                        {new Date(
                          conversation.lastMessageAt,
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      {/* We need to calculate unread messages count */}
                      {conversation.messages &&
                        conversation.messages.some(
                          (msg: MessageData) =>
                            !msg.usersSeenIds?.includes(currentUserId),
                        ) && (
                          <div className="bg-sidebar-primary text-sidebar-primary-foreground mt-1 flex h-5 w-5 items-center justify-center rounded-full text-xs">
                            {
                              conversation.messages?.filter(
                                (msg: MessageData) =>
                                  !msg.usersSeenIds?.includes(
                                    currentUserId,
                                  ),
                              ).length
                            }
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              ))}
              {/* Add a spacer at the bottom to ensure scrollability */}
              {conversations.length === 0 && (
                <div className="flex h-full items-center justify-center">
                  <div className="text-muted-foreground">
                    No conversations yet
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat area - either placeholder or conversation content */}
        <div className="h-full flex-1">
          <Chat
            conversationId={params?.conversationId as string}
            // conversation={activeConversation}
          />
        </div>

        {/* New Chat Dialog */}
        <NewChatDialog />
      </div>
    </div>
  );
}
