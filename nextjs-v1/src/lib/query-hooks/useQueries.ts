// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import apiService from '@/lib/api';
// // import { ConversationData, UserData, MessageData } from '../../types/schemas';

// // Query keys for caching
// export const queryKeys = {
//   conversations: 'conversations',
//   conversation: (id: string) => ['conversation', id],
//   users: 'users',
//   currentUser: 'currentUser',
//   messages: (conversationId: string) => ['messages', conversationId],
// };

// // Custom hooks for conversations
// export function useConversations() {
//   return useQuery({
//     queryKey: [queryKeys.conversations],
//     queryFn: () => apiService.getConversations(),
//   });
// }

// export function useConversation(id: string) {
//   return useQuery({
//     queryKey: queryKeys.conversation(id),
//     queryFn: () => apiService.getConversation(id),
//     enabled: !!id, // Only run if ID is provided
//   });
// }

// export function useCreateConversation() {
//   const queryClient = useQueryClient();
  
//   return useMutation({
//     mutationFn: (data: { userIds: string[], isGroup?: boolean, name?: string }) => 
//       apiService.createConversation(data),
//     onSuccess: () => {
//       // Invalidate the conversations list to trigger a refetch
//       queryClient.invalidateQueries({ queryKey: [queryKeys.conversations] });
//     },
//   });
// }

// // Custom hooks for users
// export function useUsers() {
//   return useQuery({
//     queryKey: [queryKeys.users],
//     queryFn: () => apiService.getUsers(),
//   });
// }

// export function useCurrentUser() {
//   return useQuery({
//     queryKey: [queryKeys.currentUser],
//     queryFn: () => apiService.getCurrentUser(),
//   });
// }

// // Custom hooks for messages
// export function useSendMessage() {
//   const queryClient = useQueryClient();
  
//   return useMutation({
//     mutationFn: ({ conversationId, body }: { conversationId: string, body: string }) => 
//       apiService.sendMessage(conversationId, body),
//     onSuccess: (_, variables) => {
//       // Invalidate the conversation to refresh messages
//       queryClient.invalidateQueries({ 
//         queryKey: queryKeys.conversation(variables.conversationId) 
//       });
//       // Also invalidate the conversations list to update last message
//       queryClient.invalidateQueries({ 
//         queryKey: [queryKeys.conversations] 
//       });
//     },
//   });
// } 