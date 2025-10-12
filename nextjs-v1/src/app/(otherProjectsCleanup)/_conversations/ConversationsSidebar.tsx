"use client";
// src/app/conversations/components/ConversationSidebar.tsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { ConversationData, UserData } from "../../../types/schemas";
import clsx from "clsx"; // Utility for conditional classes (npm install clsx)
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNewChatStore } from "@/store/useNewChatStore";

interface ConversationSidebarProps {
  conversations: ConversationData[];
  currentUser: UserData | null | undefined;
  isLoading: boolean;
  isError: boolean;
}

// Helper function moved outside component to prevent recreation on each render
const getUnreadCount = (
  conversation: ConversationData,
  currentUser: UserData | null | undefined,
): number => {
  if (
    !currentUser ||
    !conversation.messages ||
    conversation.messages.length === 0
  ) {
    return 0;
  }
  // Assuming last message indicates unread if its 'usersSeenIds' doesn't include current user
  // You might have a dedicated unreadCount field from the backend, which is better.
  // Or iterate messages since user's last seen timestamp for this conversation.
  const lastMessage =
    conversation.messages[conversation.messages.length - 1];
  if (
    lastMessage &&
    lastMessage.senderId !== currentUser.id &&
    !lastMessage.usersSeenIds?.includes(currentUser.id)
  ) {
    // This is a very basic guess - Replace with accurate logic
    return conversation.messages.filter(
      (msg) =>
        msg.senderId !== currentUser.id &&
        !msg.usersSeenIds?.includes(currentUser.id),
    ).length;
  }
  return 0;
};

// Helper to get display name for a conversation
const getConversationDisplayName = (
  conversation: ConversationData,
  currentUser: UserData | null | undefined,
): string => {
  // If it's a group chat or has a name, return the name
  if (conversation.isGroup || conversation.name) {
    return conversation.name || "Group Chat";
  }

  // For 1-on-1 conversations, find the other user and display their name
  if (conversation.users && conversation.users.length > 0) {
    const otherUser = conversation.users.find(
      (user) => currentUser && user.id !== currentUser.id,
    );
    if (otherUser) {
      return otherUser.name || "Unknown User";
    }
  }

  // Fallback
  return "Conversation";
};

export default function ConversationSidebar({
  conversations,
  currentUser,
  isLoading,
  isError,
}: ConversationSidebarProps) {
  const [isMobileNavigatorOpen, setIsMobileNavigatorOpen] =
    useState(false);
  const pathname = usePathname();
  const params = useParams(); // Get current route params
  const { open: openNewChatDialog } = useNewChatStore();
  const currentConversationId = params?.conversationId as
    | string
    | undefined;
  const isBaseRoute = pathname === "/conversations";
  const isMobile = useIsMobile();

  // Effect to handle mobile navigator visibility based on route
  useEffect(() => {
    // Close mobile nav when navigating to a specific conversation
    if (currentConversationId && isMobileNavigatorOpen) {
      setIsMobileNavigatorOpen(false);
    }
    // Automatically open on base route on small screens
    if (isBaseRoute && isMobile) {
      setIsMobileNavigatorOpen(true);
    }
  }, [
    currentConversationId,
    isBaseRoute,
    isMobileNavigatorOpen,
    isMobile,
  ]);

  // Memoize the close sidebar function
  const closeMobileNav = useCallback(
    () => setIsMobileNavigatorOpen(false),
    [],
  );

  // Memoize the conversation list to prevent recalculation on every render
  const conversationList = useMemo(() => {
    if (isLoading) {
      return (
        <div className="text-muted-foreground p-4 text-center">
          Loading conversations...
        </div>
      );
    }
    if (isError) {
      return (
        <div className="text-destructive p-4 text-center">
          Error loading conversations.
        </div>
      );
    }
    if (conversations.length === 0) {
      return (
        <div className="text-muted-foreground p-4 text-center">
          No conversations yet.
        </div>
      );
    }

    return conversations.map((conversation) => {
      const lastMessage =
        conversation.messages?.[conversation.messages.length - 1]; // Get the actual last message
      const unreadCount =
        conversation?.unreadMessagesCountByCurrentUser ??
        getUnreadCount(conversation, currentUser); // Prefer backend count, fallback to basic calc

      return (
        <Link
          href={`/conversations/${conversation.id}`}
          key={conversation.id}
          legacyBehavior
        >
          <a
            onClick={closeMobileNav} // Use memoized function
            className={clsx(
              `mb-2 block cursor-pointer rounded-lg p-3 shadow-md transition-colors hover:shadow-sm`,
              currentConversationId === conversation.id
                ? "bg-ring/20 hover:bg-ring/30" // Active conversation style
                : "bg-accent hover:bg-muted-foreground/10", // Default style
            )}
          >
            <div className="flex items-start justify-between">
              <div className="mr-2 flex-1 overflow-hidden">
                {" "}
                {/* Added overflow hidden and margin */}
                <div className="truncate font-medium">
                  {conversation.name ||
                    getConversationDisplayName(conversation, currentUser)}
                </div>{" "}
                {/* Added truncate */}
                <div className="text-muted-foreground truncate text-sm">
                  {lastMessage?.body ?? "No messages yet"}
                </div>
              </div>
              <div className="flex flex-shrink-0 flex-col items-end">
                {" "}
                {/* Prevent shrinking */}
                <div className="text-muted-foreground text-xs whitespace-nowrap">
                  {" "}
                  {/* Prevent wrapping */}
                  {lastMessage?.createdAt
                    ? new Date(lastMessage.createdAt).toLocaleTimeString(
                        [],
                        { hour: "2-digit", minute: "2-digit" },
                      )
                    : ""}
                </div>
                {unreadCount > 0 && (
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground mt-1 flex h-5 w-5 items-center justify-center rounded-full text-xs">
                    {unreadCount}
                  </div>
                )}
              </div>
            </div>
          </a>
        </Link>
      );
    });
  }, [
    conversations,
    currentUser,
    currentConversationId,
    isLoading,
    isError,
    closeMobileNav,
  ]);

  // Memoize toggle function
  const toggleMobileNavigator = useCallback(() => {
    setIsMobileNavigatorOpen((prev) => !prev);
  }, []);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="bg-secondary border-muted-foreground/20 hidden h-full w-full max-w-[400px] border-r md:flex md:w-1/3 md:flex-col">
        <div className="bg-muted-foreground/10 border-muted-foreground/20 flex h-16 shrink-0 items-center justify-between border-b p-3">
          <h2 className="my-auto font-semibold">Chats</h2>
          <Button
            onClick={openNewChatDialog}
            className="bg-primary/90 hover:bg-primary/100 text-primary-foreground"
            size="sm"
          >
            <span className="mr-1">+</span> New Chat
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {conversationList}
        </div>
      </aside>

      {/* Mobile Navigator (Modal-like overlay) */}
      {isMobileNavigatorOpen && (
        <div className="flex w-full flex-1 flex-col md:hidden">
          <div className="bg-muted-foreground/10 border-muted-foreground/20 flex h-16 shrink-0 items-center justify-between border-b p-3">
            <h2 className="font-semibold">Chats</h2>
            <Button
              onClick={openNewChatDialog}
              className="bg-primary/90 hover:bg-primary/100 text-primary-foreground"
              size="sm"
            >
              <span className="mr-1">+</span> New Chat
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {conversationList}
          </div>
        </div>
      )}
    </>
  );
}
