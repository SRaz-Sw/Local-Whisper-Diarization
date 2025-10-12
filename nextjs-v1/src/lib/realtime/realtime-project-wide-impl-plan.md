# Implementation Summary - Real-time Messaging System

As of [DATE], we have successfully implemented the core real-time messaging functionality in both the backend and frontend:

## What's Working
- **Backend**: 
  - Completed the implementation of the message posting endpoint that saves messages to the database
  - Added real-time event triggering using SocketIO to notify clients of new messages
  - Ensured complete message objects (with sender and seen data) are sent through the real-time channels

- **Frontend**:
  - Implemented optimistic UI updates when sending messages via `useSendMessage` hook
  - Added real-time message reception and integration with React Query caches in `useMessages` hook
  - Updated both message and conversation caches when receiving real-time events
  - Set up proper unread message count handling based on user's current view

## Next Steps
- Refine the SocketIOClient implementation to improve event handling efficiency
- Add support for more real-time events (message seen, typing indicators, etc.)
- Enhance status indicators for messages (sent, delivered, read)

---

# Real-time Message Sending & Updates Plan

This document outlines the steps to implement real-time message updates with optimistic UI for sending new messages.

## Backend Steps

-   [x] **Endpoint Setup:** Ensure the `POST /conversations/:conversationId/messages` endpoint exists, authenticates the user, and validates they belong to the conversation.
-   [x] **Database Save:** Save the new message to the database, connecting it to the conversation, sender, and marking the sender as having "seen" their own message initially. Get the final `MessageData` object including ID and `createdAt`.
-   [x] **Update Conversation:** Update the `lastMessageAt` timestamp on the parent `Conversation` record.
-   [x] **Trigger Real-time Event:**
    -   Immediately after successfully saving the message and updating the conversation in the database:
    -   Get the `realtimeProvider` instance.
    *   Define the correct channel name (e.g., `conversation:${conversationId}`).
    *   Define the correct event type (e.g., `RealtimeEventType.MESSAGE_UPDATE`).
    *   Trigger the event on the channel, sending the **complete, final `MessageData` object** (the one saved to the DB, potentially after processing/including relations like `sender` if needed by the client handler).
    ```typescript
    // Example in POST /conversations/:conversationId/messages endpoint
    // ... after saving newMessage and updatedConversation ...

    const realtimeProvider = getRealtimeProvider();
    const channelName = `conversation:${conversationId}`;
    // Ensure newMessage has all necessary data (like sender object if client needs it)
    // You might need to refetch the message with includes after creation if relations aren't auto-populated
    const finalMessageToSend = await prisma.message.findUnique({
        where: { id: newMessage.id },
        include: { sender: true, seen: true } // Include data client needs
    });

    if (finalMessageToSend) {
        await realtimeProvider.trigger(
            channelName,
            RealtimeEventType.MESSAGE_UPDATE, // Use the correct enum member
            finalMessageToSend // Send the final, complete message object
        );
        console.log(`Realtime event ${RealtimeEventType.MESSAGE_UPDATE} triggered on channel ${channelName}`);
    } else {
        console.error("Failed to fetch final message for realtime trigger:", newMessage.id);
    }

    // Send HTTP response AFTER triggering the event (or concurrently if non-critical)
    return res.status(201).json(finalMessageToSend || newMessage); // Return the final message
    ```
-   [x] **HTTP Response:** Return the final saved `MessageData` object in the HTTP response (status 201).

## Frontend Steps

### `useSendMessage` Hook

-   [x] **Implement Hook:** Create the `useSendMessage` hook using `useMutation`.
    ```typescript
    // src/hooks/useSendMessage.ts
    import { useMutation, useQueryClient } from '@tanstack/react-query';
    import { v4 as uuidv4 } from 'uuid'; // For temporary IDs
    import apiService from '@/lib/api';
    import { MessageData } from '@fullstack-final-project/shared/schemas';
    import { AxiosError } from 'axios';
    import { messageKeys, MessagesPage, updateMessagePages } from './useMessages'; // Import keys and types/helper
    import { conversationKeys } from './useConversations'; // Import conversation keys
    import { useCurrentUser } from './useAuth';
    import { InfiniteData } from '@tanstack/react-query';

    interface SendMessageVariables {
      conversationId: string;
      body: string;
      image?: string; // Optional image
    }

    export function useSendMessage() {
      const queryClient = useQueryClient();
      const { user: currentUser } = useCurrentUser();

      return useMutation<
        MessageData, // Type returned by mutationFn on success (the saved message)
        AxiosError, // Error type
        SendMessageVariables // Input variables type
      >({
        // mutationFn: Calls the API service to send the message
        mutationFn: ({ conversationId, body, image }) =>
          apiService.sendMessage(conversationId, body, image),

        // onMutate: Executes *before* mutationFn for optimistic update
        onMutate: async ({ conversationId, body, image }) => {
          if (!currentUser) return; // Should be logged in to send

          const tempId = `temp-${uuidv4()}`; // Generate unique temporary ID
          console.log(`Optimistic Update: Adding message with temp ID ${tempId}`);

          // 1. Cancel ongoing fetches for messages for this chat
          await queryClient.cancelQueries({ queryKey: messageKeys.infiniteList(conversationId) });

          // 2. Snapshot previous messages state (important for rollback)
          const previousMessagesData = queryClient.getQueryData<InfiniteData<MessagesPage>>(
            messageKeys.infiniteList(conversationId)
          );

          // 3. Create the optimistic message object
          const optimisticMessage: MessageData = {
            id: tempId,
            conversationId: conversationId,
            senderId: currentUser.id,
            sender: currentUser, // Include sender object if needed immediately
            body: body,
            image: image,
            createdAt: new Date(), // Use current date/time
            status: 'pending', // Custom status for optimistic UI
            usersSeenIds: [currentUser.id], // Sender has seen it
            usersSeen: [currentUser], // Include sender object
          };

          // 4. Update the cache optimistically using the *same* helper function
          queryClient.setQueryData<InfiniteData<MessagesPage>>(
            messageKeys.infiniteList(conversationId),
            (oldData) => updateMessagePages(oldData, optimisticMessage, currentUser.id)
          );

          // 5. Return context containing snapshot and temp ID
          return { previousMessagesData, optimisticMessageId: tempId };
        },

        // onError: Executes if mutationFn fails
        onError: (error, variables, context) => {
          console.error("Send Message Error:", error);
          // Rollback: Restore previous messages state from snapshot
          if (context?.previousMessagesData) {
            queryClient.setQueryData(
              messageKeys.infiniteList(variables.conversationId),
              context.previousMessagesData
            );
          }
          // Optionally: Update the optimistic message status to 'failed'
          // This requires finding it again in the (potentially rolled back) cache
          // queryClient.setQueryData(...)
          // TODO: Implement error feedback to user (e.g., toast)
        },

        // onSuccess: Executes after mutationFn succeeds (API returns 201)
        // NOTE: We primarily rely on the socket event for the *final* state confirmation.
        // This callback might be useful for secondary actions if needed.
        onSuccess: (savedMessage, variables, context) => {
             console.log("Send Message API Success. Server returned:", savedMessage);
             // We *could* manually replace the temp message with the savedMessage here,
             // but the socket handler should achieve the same result more consistently.
             // Let's rely on the socket event triggered by the backend.
        },

        // onSettled: Executes after mutation finishes (success or error)
        onSettled: (data, error, variables, context) => {
          console.log("Send Message Settled.");
          // Invalidate conversation list to update preview, regardless of success/error
          // (though on error, preview might not have changed)
          queryClient.invalidateQueries({ queryKey: conversationKeys.all });

          // Optionally, always refetch the message list after settling to ensure
          // consistency if the socket event was somehow missed. This might cause
          // a flicker if the optimistic update was slightly different.
          // queryClient.invalidateQueries({ queryKey: messageKeys.infiniteList(variables.conversationId) });
        },
      });
    }

    ```

### `useMessages` Hook Modifications

-   [x] **`updateMessagePages` Helper:** Review and confirm the logic for finding and replacing optimistic messages (using `status === 'pending'` and `id.startsWith('temp-')`) is robust. Ensure it correctly adds *new* messages (not found) to the start of page 0.
-   [x] **Real-time Listener (`useEffect`):** Confirm the listener correctly receives `MESSAGE_UPDATE` events and passes the data to `updateMessagePages`. When the sender receives the `MESSAGE_UPDATE` for their own message, `updateMessagePages` should find the 'pending' message and replace it with the final one from the server (which should have `status: 'sent'` or similar, and the real ID).
-   [x] **Update Conversation List Cache:** Enhance the real-time listener (`useEffect` in `useMessages` or a separate global hook) to *also* update the `conversations` cache (`queryClient.setQueryData(conversationKeys.all, ...)`) when a `MESSAGE_UPDATE` event occurs. This should update the last message preview and potentially the unread count for the relevant conversation in the sidebar list.

    ```typescript
    // Inside useEffect in useMessages.ts

    useEffect(() => {
        if (lastEvent && conversationId && userId && currentUser) { // Added currentUser check
          const { type, data } = lastEvent;

          if (type === RealtimeEventType.MESSAGE_UPDATE) {
            const message = data as MessageData;
            if (message.conversationId === conversationId) {
              console.log(`Updating message cache for conv ${conversationId} with msg ${message.id}`);
              // --- Update Messages Cache (Existing Logic) ---
              queryClient.setQueryData<InfiniteData<MessagesPage>>(
                messageKeys.infiniteList(conversationId),
                (oldData) => updateMessagePages(oldData, message, userId)
              );

              // --- Update Conversations List Cache ---
              console.log(`Updating conversations cache for msg ${message.id} in conv ${conversationId}`);
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
                                // Note: conversationSchema expects full MessageData or null
                                messages: [message], // Replace messages array? Or just update lastMessageAt? API Service might return only lastMessage snippet. Adjust based on ConversationData structure.
                                lastMessageAt: new Date(message.createdAt), // Update timestamp
                                // Update unread count if needed
                                unreadCount: shouldIncrementUnread
                                               ? (conv.unreadCount ?? 0) + 1 // Increment if needed
                                               : conv.unreadCount // Keep existing count otherwise
                            };
                        }
                        return conv;
                    });
                }
              );
            }
          }
        }
      }, [lastEvent, queryClient, conversationId, userId, currentUser]); // Added currentUser dependency
    ```
    *Self-correction:* Updating `conv.messages` with `[message]` might be wrong if `ConversationData` expects the full list or just a snippet. Adjust this update based on your actual `ConversationData` schema and how the list is displayed. Often, just updating `lastMessageAt` and `unreadCount` is sufficient for the list view.

### `Chat.tsx` Component Modifications

-   [x] **Import & Use `useSendMessage`:** Import the hook and get the `mutate` function and `isPending` state.
    ```typescript
    // At top of Chat.tsx
    import { useSendMessage } from '@/hooks/useSendMessage';

    // Inside Chat component:
    const { mutate: sendMessage, isPending: isSendingMessage } = useSendMessage();
    ```
-   [x] **Call `mutate`:** Modify `handleSendMessage` to call `sendMessage({ conversationId, body: newMessageBody });`.
-   [x] **Disable Input:** Use the `isSendingMessage` state to disable the input field and send button while the mutation is pending.
-   [x] **Display Message Status:** Modify the message rendering loop to display indicators based on `message.status`:
    *   `pending`: Show a clock icon ⏳.
    *   `sent`: Show a single checkmark ✓.
    *   (Future): `delivered` (✓✓ gray), `read` (✓✓ blue).

    ```jsx
     // Inside messages.map in Chat.tsx
     {isSender && (
       <span className="text-xs text-gray-500">
         {message.status === 'pending' && '⏳'}
         {message.status === 'sent' && '✓'}
         {/* Add delivered/read icons later */}
       </span>
     )}
    ```

### Real-time Provider (`SocketIOClient.ts`)

-   [ ] **Event Handling Scope:** Review the `handleEvent` method in `SocketIOClient.ts`. Currently, it calls *all* callbacks for *all* subscribed channels whenever *any* event comes in. This is likely inefficient and incorrect. It should only call callbacks registered for the *specific channel* the event was intended for. The backend `trigger` already sends to a specific channel (`conversation:${id}`). The client needs to associate callbacks with channels properly.
    *   **Proposed Fix:** Modify `handleEvent` to look up callbacks based on channel information if the backend includes it with the event, OR modify the server `trigger` and client `subscribe` to handle events *per channel* more directly (which `socket.io` rooms allow). The current `useRealtime` hook subscribes per-channel, but the underlying `SocketIOClient` seems to broadcast events globally to all handlers.

    ```typescript
    // SocketIOClient.ts - Potential Improvement (conceptual)

    // Modify how events are listened to and handled:
    // Option A: Backend sends channel info with event data
    // Option B: Socket.IO handles room emission properly, client listens directly

    // --- Option B (More typical Socket.IO pattern) ---
    // Change subscribe to NOT use a generic handler map internally
    // Instead, rely on socket.io's built-in event listening per event type

    subscribe(channel: string, callback: (eventType: RealtimeEventType, data: any) => void): void {
        if (!this.socket) throw new Error('Socket.IO not connected.');

        // Join the Socket.IO room on the server
        this.socket.emit('join-channel', channel);

        // Instead of storing callbacks in a map here, the `useRealtime` hook
        // should directly listen for the specific events it cares about.
        // Let's adjust `useRealtime` instead.
    }

    unsubscribe(channel: string, callback?: any): void { // Callback type not needed here
        if (!this.socket) return;
        this.socket.emit('leave-channel', channel);
        // Event listeners should be removed by useRealtime hook's cleanup
    }

    // REMOVE the internal handleEvent method and the central eventHandlers map
    // REMOVE the Object.values loop setting up generic listeners in connect()
    ```
    Then, modify `useRealtime` to add/remove specific listeners:
    ```typescript
    // useRealtime.ts - Revised useEffect

    useEffect(() => {
        let socketInstance: Socket | null = null; // Keep track of the socket instance

        const setupListeners = (socket: Socket) => {
            // Add specific listeners based on 'events' array
            events.forEach(eventType => {
                socket.on(eventType, (data: any) => {
                    // Check if the event data relates to the subscribed channel?
                    // This depends on whether the backend emits globally or to rooms.
                    // If backend emits to room `conversation:${channel}`, these listeners
                    // might only fire if the client socket is in that room.
                    // Let's assume backend emits correctly to the room/channel.
                    console.log(`useRealtime received event [${eventType}] on channel [${channel}]`, data);
                    handleEvent(eventType, data); // Call the state update handler
                });
            });
        };

        const cleanupListeners = (socket: Socket) => {
             events.forEach(eventType => {
                socket.off(eventType); // Remove listeners by event type
             });
        };


        if (autoConnect) {
          const provider = getRealtimeProvider() as SocketIOClient; // Cast if needed
          // Connect returns a promise but also sets up the socket internally
          provider.connect().then(() => {
            socketInstance = provider.getSocket(); // Need a way to get the socket instance
            if (socketInstance) {
                socketInstance.emit('join-channel', channel); // Ensure joining the channel
                setupListeners(socketInstance);
                setIsConnected(true); // Update connection state
            }
          }).catch(err => setIsConnected(false));
        }

        // Cleanup
        return () => {
          const provider = getRealtimeProvider() as SocketIOClient;
          socketInstance = provider.getSocket(); // Get socket instance again
          if (socketInstance) {
            cleanupListeners(socketInstance);
            socketInstance.emit('leave-channel', channel); // Leave channel
          }
          // Decide if provider.disconnect() should be called here
          // Probably not if connection is shared globally
        };
      }, [channel, autoConnect, events, handleEvent]); // Added 'events' dependency

    // Need to add `getSocket()` method to SocketIOClient class
    // SocketIOClient.ts
    public getSocket(): Socket | null {
        return this.socket;
    }
    ```

This refined plan addresses the optimistic update flow and the necessary adjustments for real-time synchronization using Socket.IO with React Query. Remember to implement `useSendMessage` and adjust the real-time provider/hook interaction as needed.