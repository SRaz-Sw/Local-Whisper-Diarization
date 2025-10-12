// src/hooks/useConversations.ts (New or Existing File)

import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { ConversationData } from '@sraz-sw/fullstack-shared';
import apiService from '@/lib/api';
import { AxiosError } from 'axios';
import { useCurrentUser } from './useAuth'; // Import useCurrentUser to check login status

// __________ conversationKeys.ts  ___________ Start
// Using 'as const' provides better type safety and autocompletion
export const conversationKeys = {
    all: ['conversations'] as const, // Key for the list of all user conversations
    detail: (id: string) => [...conversationKeys.all, 'detail', id] as const, // Key for a single conversation's full data
  };
// __________ conversationKeys.ts  ___________ End

/**
 * Fetches the list of conversations for the currently logged-in user.
 *
 * This hook relies on `useCurrentUser` to ensure the user is authenticated.
 * It will only attempt to fetch conversations if a user is successfully loaded.
 */
export function useConversations(): UseQueryResult<ConversationData[], AxiosError> {
  // Get the current user status to enable/disable the query
  const { user, isLoadingUser } = useCurrentUser();

  // Determine if the query should be enabled
  // - Don't run if we are still loading the user info
  // - Don't run if we know the user is not logged in (user is null)
  const isEnabled = !isLoadingUser && !!user;

  const queryResult = useQuery<ConversationData[], AxiosError>({
    // queryKey: Use the key factory for consistency. This identifies the cached data.
    queryKey: conversationKeys.all,

    // queryFn: The function to fetch the data. It calls our API service method.
    // React Query expects this to return a Promise. apiService.getConversations already does.
    queryFn: apiService.getConversations,

    // --- Configuration ---

    // enabled: Controls whether the query will automatically run.
    // We only enable it if we have successfully loaded a logged-in user.
    enabled: isEnabled,

    // staleTime: How long the data is considered fresh (won't refetch on mount/focus).
    // 5 minutes might be appropriate for the conversation list. Socket events
    // will handle more immediate updates to specific conversation summaries.
    staleTime: 1000 * 60 * 5, // 5 minutes

    // gcTime: How long the data remains in cache after it's unused.
    // Works well with persistence.
    gcTime: 1000 * 60 * 60 * 24, // 24 hours

    // refetchOnWindowFocus: Good default for lists that might change while user is away.
    refetchOnWindowFocus: true,

    // retry: Default retry logic is usually fine here. If the API fails with 401
    // due to an expired token, the `useCurrentUser` hook or global interceptors
    // should ideally handle the logout process.
  });

  // Return the raw query result object. The component using this hook
  // can destructure what it needs (data, isLoading, isError, error, etc.).
  return queryResult;
}

/**
 * Hook to create a new conversation with React Query's useMutation
 * This ensures the conversation list is updated after creation
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (conversationData: { userIds: string[], isGroup: boolean, name: string }) => 
      apiService.createConversation(conversationData),
    
    onSuccess: (newConversation) => {
      // Update the conversations list cache
      queryClient.invalidateQueries({ queryKey: conversationKeys.all });
      
      // Optionally pre-populate the detail cache to avoid a fetch when navigating
      queryClient.setQueryData(
        conversationKeys.detail(newConversation.id), 
        newConversation
      );
    },
  });
}

/**
 * (Optional but recommended) Hook to fetch details for a SINGLE conversation.
 * Useful when navigating into a specific chat if the initial list doesn't
 * contain all necessary details (like the full participant user objects or recent messages).
 */
export function useConversation(
  conversationId: string | null | undefined
): UseQueryResult<ConversationData, AxiosError> { // Note: Fetches ConversationData now
  const { user, isLoadingUser } = useCurrentUser();

  // Enable only if we have a user AND a valid conversationId
  const isEnabled = !isLoadingUser && !!user && !!conversationId;

  return useQuery<ConversationData, AxiosError>({
    queryKey: conversationKeys.detail(conversationId!), // Use the detail key
    queryFn: () => {
      // queryFn needs a function if it depends on variables
      if (!conversationId) {
        // Should not happen if enabled is false, but good practice
        return Promise.reject(new Error("No conversation ID provided"));
      }
      return apiService.getConversation(conversationId); // Call the specific API
    },
    enabled: isEnabled,
    staleTime: 1000 * 60 * 2, // Details might get stale quicker, e.g., participant list changes. 2 mins.
    gcTime: 1000 * 60 * 60 * 1, // 1 hour
  });
}

/**
 * Explanation:

useQuery: The core hook for fetching data.

queryKey: conversationKeys.all (for list) / conversationKeys.detail(id) (for single): Uniquely identifies the data in the cache. Using the key factory ensures consistency.

queryFn: apiService.getConversations / () => apiService.getConversation(id): The async function that actually fetches the data. It directly uses your updated apiService methods which handle Zod parsing.

enabled: isEnabled: This is crucial. It prevents React Query from trying to fetch conversations if the user isn't logged in (user is null) or if their status is still being checked (isLoadingUser is true). This avoids unnecessary 401 errors just because the auth check hasn't finished yet.

staleTime / gcTime: Standard cache configuration, adjusted slightly for the nature of conversation data.

useCurrentUser Dependency: The hook relies on useCurrentUser to determine if it should run (enabled). This creates a clear dependency: auth state must be known before fetching protected data.

useConversation Hook: Added a separate hook for fetching a single conversation's details using apiService.getConversation. This is useful for loading more complete data when a user enters a specific chat. It uses a different query key (['conversations', 'detail', id]) to cache this detailed data separately from the main list.

Return Value: The hooks return the entire UseQueryResult object provided by useQuery. This gives the consuming component access to data, isLoading, isFetching, isError, error, etc.


 * 
 */