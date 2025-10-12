// src/hooks/useMessages.ts

import { useMemo, useEffect } from 'react';
import {
  useInfiniteQuery,
  useQueryClient,
  InfiniteData,
} from '@tanstack/react-query';
import { MessageData, ConversationData } from '@sraz-sw/fullstack-shared';
import { RealtimeEventType } from '@sraz-sw/fullstack-shared';
import apiService from '@/lib/api';
import { AxiosError } from 'axios';
import { useCurrentUser } from './useAuth';
import { useRealtime } from './useRealtime';
import { conversationKeys } from './useConversations';

// --- Query Key Factory ---
export const messageKeys = {
  all: ['messages'] as const,
  infiniteList: (conversationId: string) =>
    [...messageKeys.all, 'infiniteList', conversationId] as const,
};


// Define expected API response structure for a page
export interface MessagesPage {
  data: MessageData[];
  nextPageCursor?: string | null;
}
// Define a default page size constant for the hook
const MESSAGES_PER_PAGE_CLIENT = 30; // Consistent with backend default is good

// --- Helper Function to update cache ---
const updateMessagePages = (
  oldData: InfiniteData<MessagesPage> | undefined,
  newMessageOrUpdate: MessageData,
  currentUserId: string | undefined
): InfiniteData<MessagesPage> => {
  if (!oldData) {
    return {
      pages: [{ data: [newMessageOrUpdate], nextPageCursor: null }],
      pageParams: [undefined]
    };
  }

  let messageFound = false;
  const newPages = oldData.pages.map((page) => {
    const pageMessages = page.data;
    const messageIndex = pageMessages.findIndex(
      (msg) =>
        msg.id === newMessageOrUpdate.id || // Match by actual ID
        (msg.status === 'pending' && // Match potential optimistic message
         msg.senderId === currentUserId &&
         msg.body === newMessageOrUpdate.body &&
         msg.id.startsWith('temp-')) // Match temporary IDs for optimistic updates
    );

    if (messageIndex !== -1) {
      messageFound = true;
      const updatedMessages = [...pageMessages];
      updatedMessages[messageIndex] = {
        ...newMessageOrUpdate,
        createdAt: new Date(newMessageOrUpdate.createdAt)
      };
      return { ...page, data: updatedMessages };
    }
    return page;
  });

  // If it's a new message, add it to the most recent page
  if (!messageFound) {
    const lastPageIndex = 0; // Most recent page is first
    const lastPage = newPages[lastPageIndex];
    const updatedLastPageMessages = [
      {
        ...newMessageOrUpdate,
        createdAt: new Date(newMessageOrUpdate.createdAt)
      },
      ...lastPage.data
    ];
    newPages[lastPageIndex] = { ...lastPage, data: updatedLastPageMessages };
  }

  return { ...oldData, pages: newPages };
};

export function useMessages(conversationId: string | null | undefined) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useCurrentUser();
  const userId = currentUser?.id;

  const isEnabled = !!conversationId && !!userId;
  
  // Memoize the channel name to prevent recreation on render
  const channel = useMemo(() => 
    conversationId ? `conversation:${conversationId}` : '',
    [conversationId]
  );

  const { isConnected: isRealtimeConnected, lastEvent } = useRealtime({
    channel,
    events: [RealtimeEventType.MESSAGE_UPDATE],
    autoConnect: isEnabled,
  });

  const queryResult = useInfiniteQuery<
    MessagesPage,
    AxiosError,
    InfiniteData<MessagesPage>,
    ReturnType<typeof messageKeys.infiniteList>,
    string | undefined // Type of the pageParam (cursor) is string | undefined
  >({
    queryKey: messageKeys.infiniteList(conversationId!),
    // --- UPDATED queryFn ---
    queryFn: async ({ pageParam }) => {
      // pageParam here IS the cursor (an ISO timestamp string or undefined for the first page)
      return apiService.getMessagesPage(
          conversationId!,
          pageParam, // Pass the cursor
          MESSAGES_PER_PAGE_CLIENT // Pass the desired limit
      );
    },
    // --- END UPDATED queryFn ---
    initialPageParam: undefined, // First page has no cursor
    getNextPageParam: (lastPage, allPages) => {
        // lastPage is the object { data: [...], nextPageCursor: '...' | null }
        // Return the cursor provided by the backend for the next older page
        return lastPage.nextPageCursor;
    },
    enabled: isEnabled,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    // Important for infinite scroll: keep previous data while fetching next page
    // to prevent UI jumps if possible (depends on how you render loading state)
    // keepPreviousData: true, // Consider enabling this
  });

  // Handle real-time events
  useEffect(() => {
    if (lastEvent && conversationId && userId) {
      const { type, data } = lastEvent;

      if (type === RealtimeEventType.MESSAGE_UPDATE) {
        const message = data as MessageData;
        if (message.conversationId === conversationId) {
          // --- Update Messages Cache (Existing Logic) ---
          queryClient.setQueryData<InfiniteData<MessagesPage>>(
            messageKeys.infiniteList(conversationId),
            (oldData) => updateMessagePages(oldData, message, userId)
          );

          // --- Update Conversations List Cache ---
          queryClient.setQueryData<ConversationData[]>(
            conversationKeys.all,
            (oldConvData) => {
                if (!oldConvData) return oldConvData;

                return oldConvData.map(conv => {
                    if (conv.id === conversationId) {
                        // Determine if this update should increment unread count
                        // Usually: if message sender is not current user AND user isn't looking at chat
                        // This requires knowing if the chat is currently "active" in the UI
                        const isViewingThisChat = window.location.pathname.includes(`/conversations/${conversationId}`); // Basic check
                        const shouldIncrementUnread = message.senderId !== userId && !isViewingThisChat;

                        return {
                            ...conv,
                            // Update last message based on the new one
                            lastMessageAt: new Date(message.createdAt), // Update timestamp
                            // Update unread count if needed
                            unreadMessagesCountByCurrentUser: shouldIncrementUnread
                                           ? (conv.unreadMessagesCountByCurrentUser ?? 0) + 1 // Increment if needed
                                           : conv.unreadMessagesCountByCurrentUser // Keep existing count otherwise
                        };
                    }
                    return conv;
                });
            }
          );
        }
      }
    }
  }, [lastEvent, queryClient, conversationId, userId]);

  // // Flatten and sort messages
  // const messages = useMemo(() => {
  //   return queryResult.data?.pages.flatMap(page => 
  //     page.data.map(msg => ({
  //       ...msg,
  //       createdAt: new Date(msg.createdAt)
  //     }))
  //   ) ?? [];
  // }, [queryResult.data]);

    // Flatten pages
    const messages = useMemo(() => {
      // Assuming API returns pages newest-to-oldest (page 0 is newest)
      // and messages within a page are newest-to-oldest (due to backend orderBy: 'desc')
      // flatMap processes pages in order [page0, page1, page2...]
      // page.data needs reversing because backend sent newest first within page
      return queryResult.data?.pages.flatMap(page =>
          [...page.data].reverse().map(msg => ({
            ...msg, 
            createdAt: msg.createdAt instanceof Date ? msg.createdAt : new Date(msg.createdAt) // TODO: Check why we need it if we convert in the api
          }))
       ) ?? [];
    }, [queryResult.data]);
    // const messages = useMemo(() => {
    //   return queryResult.data?.pages.flatMap(page =>
    //       [...page.data].reverse() // Just reverse the array from the page
    //    ) ?? [];
    // }, [queryResult.data]);

  // Sort messages chronologically (oldest first) for display
  const sortedMessages = useMemo(() => {
    // Create a new array before sorting to avoid mutating the memoized 'messages'
    return [...messages].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    // return [...messages].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }, [messages]); // Depends only on the flattened messages


  return {
    messages: sortedMessages,
    isLoading: queryResult.isLoading, // True only for the initial page load
    isError: queryResult.isError,
    error: queryResult.error,
    fetchNextPage: queryResult.fetchNextPage, // Function to load older messages
    hasNextPage: !!queryResult.hasNextPage, // Boolean indicating if older messages exist
    isFetchingNextPage: queryResult.isFetchingNextPage, // True while loading older pages
    isRealtimeConnected,
    refetch: queryResult.refetch, // Get refetch function from useInfiniteQuery result
    isRefetching: queryResult.isRefetching, // Check if refetching first page
  };
}