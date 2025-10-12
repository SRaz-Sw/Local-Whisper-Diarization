// Re-export all schemas directly from the shared package
export type {
  ConversationData,
  UserData,
  MessageData,
  FullConversationType,
  CreateUserDataViaEmail,
  LoginWithEmailData
} from '@sraz-sw/fullstack-shared';

// Export values (not types)
export {
  userSchema,
  messageSchema,
  conversationSchema
} from '@sraz-sw/fullstack-shared';

