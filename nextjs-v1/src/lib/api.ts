import axios from "axios";
import {
  ConversationData,
  UserData,
  MessageData,
  FullConversationType,
  userSchema,
  messageSchema,
  conversationSchema,
  CreateUserDataViaEmail,
  LoginWithEmailData,
} from "../types/schemas";
import config from "./config";
import { getToken } from "./token";

// Constants - Use environment variables for API URL with fallback
//

// Create axios instance with baseURL from environment variable
const apiClient = axios.create({
  baseURL: config.apiUrl,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add the token to every request
apiClient.interceptors.request.use((config) => {
  const token = getToken();

  // Add token to headers if available
  if (token) {
    config.headers["x-access-token"] = token;
  }

  return config;
});

// Define the structure of the paged response
interface MessagesPageResponse {
  data: any[]; // Raw data from API
  nextPageCursor?: string | null;
}

interface ProcessedMessagesPage {
  data: MessageData[];
  nextPageCursor?: string | null;
}

// Process User data with Zod validation
const processUser = (userData: any): UserData => {
  try {
    // First normalize dates that need to be converted from strings
    const normalizedData = {
      ...userData,
      // Convert null values to undefined for optional fields to pass Zod validation
      image: userData.image || undefined,
      createdAt: userData.createdAt
        ? new Date(userData.createdAt)
        : undefined,
      updatedAt: userData.updatedAt
        ? new Date(userData.updatedAt)
        : undefined,
    };

    // Parse and validate with Zod schema
    const validatedUser: UserData = userSchema.parse(normalizedData);
    return validatedUser;
  } catch (error) {
    console.error("User data validation failed:", error);
    console.error("Received invalid user data:", userData);

    // Still return the best effort data we can, but log the error
    return {
      ...userData,
      // Ensure image is undefined instead of null
      image: userData.image || undefined,
      createdAt: userData.createdAt
        ? new Date(userData.createdAt)
        : undefined,
      updatedAt: userData.updatedAt
        ? new Date(userData.updatedAt)
        : undefined,
    };
  }
};

// Process Message data with Zod validation
const processMessage = (messageData: any): MessageData => {
  try {
    // Prepare sender with null image handling
    let processedSender = undefined;
    if (messageData.sender) {
      // Make a copy to avoid modifying the original
      const senderData = { ...messageData.sender };
      if (senderData.image === null) {
        senderData.image = undefined;
      }
      processedSender = processUser(senderData);
    }

    // First normalize dates and handle null values for optional fields
    const normalizedData = {
      ...messageData,
      // Convert null values to undefined for optional fields
      image: messageData.image || undefined,
      body: messageData.body || undefined,
      createdAt: messageData.createdAt
        ? new Date(messageData.createdAt)
        : undefined,
      // Use the processed sender with fixed image field
      sender: processedSender,
      usersSeen:
        messageData.usersSeen?.map((user: any) => {
          // Handle null image for each user in usersSeen
          const userData = { ...user };
          if (userData.image === null) {
            userData.image = undefined;
          }
          return processUser(userData);
        }) || [],
    };

    // Parse and validate with Zod schema
    const validatedMessage: MessageData =
      messageSchema.parse(normalizedData);
    return validatedMessage;
  } catch (error) {
    console.error("Message data validation failed:", error);
    console.error("Received invalid message data:", messageData);

    // Return best effort data with proper date conversion and null handling
    return {
      id: messageData.id || "",
      body: messageData.body || undefined,
      image: messageData.image || undefined, // Convert null to undefined
      createdAt: messageData.createdAt
        ? new Date(messageData.createdAt)
        : new Date(),
      senderId: messageData.senderId || "",
      conversationId: messageData.conversationId || undefined,
      usersSeenIds: messageData.usersSeenIds || [],
      usersSeen:
        messageData.usersSeen?.map((user: any) => {
          // Handle null image for each user
          const userData = { ...user };
          if (userData.image === null) {
            userData.image = undefined;
          }
          return processUser(userData);
        }) || [],
      sender: messageData.sender
        ? (() => {
            // Handle null image in sender
            const senderData = { ...messageData.sender };
            if (senderData.image === null) {
              senderData.image = undefined;
            }
            return processUser(senderData);
          })()
        : undefined,
      status: messageData.status || undefined,
    };
  }
};

// Process Conversation data with Zod validation
const processConversation = (conversationData: any): ConversationData => {
  try {
    // First normalize dates that need to be converted from strings
    const normalizedData = {
      ...conversationData,
      createdAt: new Date(conversationData.createdAt),
      lastMessageAt: new Date(conversationData.lastMessageAt),
      // Ensure name and isGroup are never null
      name: conversationData.name || "", // Convert null to empty string
      isGroup:
        conversationData.isGroup === null
          ? false
          : conversationData.isGroup, // Default to false
      messages: conversationData.messages?.map(processMessage) || [],
      users: conversationData.users?.map(processUser) || [],
    };

    // Parse and validate with Zod schema
    const validatedConversation: ConversationData =
      conversationSchema.parse(normalizedData);
    return validatedConversation;
  } catch (error) {
    console.error("Conversation data validation failed:", error);
    console.error("Received invalid conversation data:", conversationData);

    // Return best effort data
    return {
      ...conversationData,
      createdAt: new Date(conversationData.createdAt),
      lastMessageAt: new Date(conversationData.lastMessageAt),
      // Ensure name and isGroup are never null in fallback case too
      name: conversationData.name || "",
      isGroup:
        conversationData.isGroup === null
          ? false
          : !!conversationData.isGroup,
      messages: conversationData.messages?.map(processMessage) || [],
      users: conversationData.users?.map(processUser) || [],
    };
  }
};

// API methods
export const apiService = {
  // Conversations
  async getConversations(): Promise<ConversationData[]> {
    const response = await apiClient.get("/conversations");
    return response.data.map(processConversation);
  },

  async getConversation(id: string): Promise<FullConversationType> {
    const response = await apiClient.get(`/conversations/${id}`);
    return processConversation(response.data) as FullConversationType;
  },

  async createConversation(data: {
    userIds: string[];
    isGroup?: boolean;
    name?: string;
  }): Promise<ConversationData> {
    const response = await apiClient.post("/conversations", data);
    return processConversation(response.data);
  },

  async updateConversation(
    conversationId: string,
    data: {
      name?: string;
      addMembers?: string[];
      removeMembers?: string[];
      imageUrl?: string;
    },
  ): Promise<ConversationData> {
    const response = await apiClient.put(
      `/conversations/${conversationId}`,
      data,
    );
    return processConversation(response.data);
  },

  // Messages
  async sendMessage(
    conversationId: string,
    body: string,
    image?: string,
  ): Promise<MessageData> {
    const response = await apiClient.post(
      `/conversations/${conversationId}/messages`,
      {
        body,
        image,
      },
    );
    // const response = await apiClient.post(`/messages`, {
    //   conversationId,
    //   body,
    //   image
    // });
    return processMessage(response.data);
  },

  /**
   * Fetches a page of messages for a conversation.
   * @param conversationId - The ID of the conversation.
   * @param cursor - Optional cursor (ISO timestamp string) to fetch messages older than this.
   * @param limit - Optional number of messages to fetch per page.
   * @returns An object containing the messages data and the next page cursor.
   */
  async getMessagesPage(
    conversationId: string,
    cursor?: string,
    limit: number = 30, // Default limit matching backend recommendation
  ): Promise<ProcessedMessagesPage> {
    const params = new URLSearchParams();
    params.append("limit", String(limit));
    if (cursor) {
      params.append("cursor", cursor);
    }

    try {
      const response = await apiClient.get<MessagesPageResponse>(
        `/conversations/${conversationId}/messages?${params.toString()}`,
      );

      console.log("response.data", response.data);

      // Process each message in the data array
      const processedMessages = response.data.data.map(processMessage);

      return {
        data: processedMessages,
        nextPageCursor: response.data.nextPageCursor,
      };
    } catch (error) {
      console.error("Error fetching messages page:", error);
      // Return empty data on error
      return {
        data: [],
        nextPageCursor: null,
      };
    }
  },

  // register
  async register(data: CreateUserDataViaEmail): Promise<UserData> {
    const response = await apiClient.post("/auth/register", data);

    // Handle case where user data is nested inside a 'user' property
    const userData = response.data.user
      ? response.data.user
      : response.data;
    return processUser(userData);
  },

  // login
  async login(data: LoginWithEmailData): Promise<UserData> {
    const response = await apiClient.post("/auth/login", data);

    // Handle case where user data is nested inside a 'user' property
    const userData = response.data.user
      ? response.data.user
      : response.data;
    return processUser(userData);
  },

  // logout
  async logout(): Promise<void> {
    await apiClient.post("/auth/logout", {});
  },

  // ___________  Users ________________
  async getCurrentUser(): Promise<UserData | undefined> {
    try {
      const response = await apiClient.get("/users/me");
      return processUser(response.data);
    } catch (error) {
      console.log("Error fetching current user:", error);
      // console.error('Error fetching current user:', error);
      // throw error;
      return undefined;
    }
  },

  // update current user
  async updateCurrentUser(userData: Partial<UserData>): Promise<UserData> {
    // For all user updates, including images
    const payload: Partial<UserData> = { ...userData };

    // If updating an image, use imageUrl property for backward compatibility
    if (userData.image) {
      payload.image = userData.image;
    }

    const response = await apiClient.patch("/users/me", payload);
    return processUser(response.data);
  },

  // Get all users
  async getUsers(): Promise<UserData[]> {
    const response = await apiClient.get("/users");
    return response.data.map(processUser);
  },

  // DEPRECATED: Use updateCurrentUser instead
  updateUser: async (userData: {
    name?: string;
    email?: string;
    image?: string;
  }): Promise<any> => {
    console.warn(
      "api.updateUser is deprecated, please use updateCurrentUser instead",
    );
    try {
      const payload: any = { ...userData };

      // If updating an image, use imageUrl property for backward compatibility
      if (userData.image) {
        payload.imageUrl = userData.image;
      }

      const response = await apiClient.patch("/users/me", payload);
      return processUser(response.data);
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  },
};

export default apiService;
