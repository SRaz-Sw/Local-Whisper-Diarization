// src/hooks/useSendMessage.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid'; // For temporary IDs
import { MessageData } from '@sraz-sw/fullstack-shared';
import apiService from '@/lib/api';
import { AxiosError } from 'axios';
import { messageKeys, MessagesPage } from './useMessages'; // Import keys and Page type
import { conversationKeys } from './useConversations'; // Import conversation keys
import { useCurrentUser } from './useAuth'; // To get current user ID
import { InfiniteData } from '@tanstack/react-query';

// Type for the variables passed to the mutate function
interface SendMessageVariables {
  conversationId: string;
  body: string;
  image?: string; // Optional image
}

// Define the context type for the mutation
interface SendMessageContext {
  previousMessagesData?: InfiniteData<MessagesPage>;
  optimisticMessageId: string;
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useCurrentUser();

  return useMutation<
    MessageData,        // Type returned by mutationFn on success (the confirmed message)
    AxiosError,         // Error type
    SendMessageVariables, // Variables type
    SendMessageContext   // Context type
  >({
    // mutationFn: Calls the API service to send the message
    mutationFn: ({ conversationId, body, image }) => {
        // Ensure currentUser is available (should be if sending messages is allowed)
        if (!currentUser) {
            return Promise.reject(new Error("User not authenticated"));
        }
        // Call the API service and return the promise
        return apiService.sendMessage(conversationId, body, image)
          .then(response => {
            return response;
          })
          .catch(error => {
            throw error;
          });
    },

    // onMutate: Executes *before* the mutationFn. Perfect for optimistic updates.
    onMutate: async (variables) => {
      const { conversationId, body } = variables;
      if (!currentUser) {
        return; // Should ideally not happen
      }

      // 1. Cancel any outgoing refetches for messages in this conversation
      await queryClient.cancelQueries({ queryKey: messageKeys.infiniteList(conversationId) });

      // 2. Get a snapshot of the current messages state
      const previousMessagesData = queryClient.getQueryData<InfiniteData<MessagesPage>>(
        messageKeys.infiniteList(conversationId)
      );

      // 3. Create the optimistic message object
      const optimisticMessage: MessageData = {
        id: `temp-${uuidv4()}`, // Temporary, client-generated ID
        conversationId: conversationId,
        senderId: currentUser.id,
        sender: currentUser, // Include sender object optimistically
        body: body,
        image: variables.image, // Include image if provided
        createdAt: new Date(), // Use client time optimistically
        status: 'pending', // Indicate it's being sent
        usersSeenIds: [currentUser.id], // Sender has seen their own message
        usersSeen: [currentUser], // Include sender in seenBy optimistically
      };

      // 4. Update the cache optimistically
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        messageKeys.infiniteList(conversationId),
        (oldData) => {
          // Use a slightly modified update helper logic, always add to the start of the first page
          if (!oldData || !oldData.pages || oldData.pages.length === 0) {
            // If cache is empty or invalid, create it
            return {
              pages: [{ data: [optimisticMessage], nextPageCursor: null }],
              pageParams: [undefined],
            };
          }

          // Add to the beginning of the first page's data array
          const newPages = [...oldData.pages];
          const firstPage = newPages[0];
          newPages[0] = {
            ...firstPage,
            data: [optimisticMessage, ...firstPage.data], // Prepend optimistic message
          };

          return { ...oldData, pages: newPages };
        }
      );

      // 5. Return context containing the snapshot and optimistic message ID
      return { previousMessagesData, optimisticMessageId: optimisticMessage.id };
    },

    // Define the context type for onError and onSuccess
    onError: (err, variables, context) => {
      // Rollback to the previous state using the snapshot
      if (context?.previousMessagesData) {
        queryClient.setQueryData(
          messageKeys.infiniteList(variables.conversationId),
          context.previousMessagesData
        );
      }
      // Optionally: Update the optimistic message status to 'failed' (more complex)
      // Show error feedback to user (e.g., toast notification)
    },

    // onSuccess: Executes after mutationFn succeeds (API call returns)
    onSuccess: (serverMessage, variables, context) => {
        // The API call was successful. The server will emit a socket event.
        // We usually rely on the socket event handler in useMessages
        // to update the message from 'pending' to 'sent' and replace the temp ID.
    },

    // onSettled: Executes after mutation finishes (either success or error)
    onSettled: (data, error, variables) => {
      // Invalidate conversation list to update previews (last message snippet)
      queryClient.invalidateQueries({ queryKey: conversationKeys.all });
    },
  });
}