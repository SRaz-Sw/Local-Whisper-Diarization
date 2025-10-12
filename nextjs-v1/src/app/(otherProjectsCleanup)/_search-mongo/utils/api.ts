import axios from "axios";
import config from "../../../../lib/config";
// import { getToken } from '../../../lib/token';
import {
  FileUploadedData,
  SnippetData,
  EntityData,
} from "@sraz-sw/copyfact-shared";
// import {FileUploadedSchema, SnippetSchema, EntitySchema} from '@sraz-sw/copyfact-shared';
// // Define our types locally based on the Prisma schema
// interface FileUploadedData {
//   id: string;
//   fileType: string;
//   fileUrl: string;
//   fileUrl_original?: string;
//   fileName: string;
//   mimeType: string;
//   size: number;
//   contentTypeHighLevel: string[];
//   snippets?: SnippetData[];
//   uploadAt: Date;
//   modifiedAt: Date;
//   status: string;
//   entities?: EntityData[];
//   embeddings?: number[];
//   additionalInfo?: Record<string, any>;
//   userId: string;
//   userUploaded?: any;
// }

// interface SnippetData {
//   id: string;
//   fileId: string;
//   file?: FileUploadedData;
//   type: string;
//   start: number[];
//   end: number[];
//   content?: string;
//   keywords: string[];
//   summary?: string;
//   embeddings?: number[];
//   timestampOfTheContentOfTheSnippet: number[];
//   timeOfTheContentOfTheSnippet?: string;
//   createdAt: Date;
//   modifiedAt: Date;
//   contextWithinTheMainCase?: string;
//   contextWithinTheMainCase_embeddings?: number[];
// }

// interface EntityData {
//   id: string;
//   category: string;
//   subCategory?: string;
//   name: string;
//   description?: string;
//   imageUrl?: string;
//   keywords: string[];
//   id_official?: string;
//   url?: string;
//   score?: number;
//   confidence?: number;
//   numberOfOccurrences?: number;
//   address?: string;
//   latitude?: number;
//   longitude?: number;
//   phoneNumber?: string;
//   email?: string;
//   website?: string;
//   fileUploadedId: string;
//   fileUploaded?: FileUploadedData;
//   contextWithinTheMainCase?: string;
//   contextWithinTheMainCase_embeddings?: number[];
// }

// Define pagination response interface
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Create axios instance with baseURL from environment variable
const apiClient = axios.create({
  baseURL: `${config.apiUrl}/mongo-search-demo`,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add the token to every request
// apiClient.interceptors.request.use((config) => {
//   const token = getToken();

//   // Add token to headers if available
//   if (token) {
//     config.headers['x-access-token'] = token;
//   }

//   return config;
// });

// API service for MongoDB search demo
export const mongoSearchApi = {
  /**
   * Get all uploaded files with pagination
   * @param page Page number (default: 1)
   * @param limit Number of items per page (default: 10)
   * @returns Promise with paginated list of files including snippets and entities
   */
  async getAllFiles(
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<FileUploadedData>> {
    try {
      const response = await apiClient.get("/", {
        params: { page, limit },
      });

      return {
        data: response.data.files,
        pagination: response.data.pagination,
      };
    } catch (error) {
      console.error("Error fetching files:", error);
      throw error;
    }
  },

  /**
   * Get a specific file by ID
   * @param id File ID
   * @returns Promise with file data including snippets and entities
   */
  async getFileById(id: string): Promise<FileUploadedData> {
    try {
      const response = await apiClient.get(`/${id}`);
      return response.data.file;
    } catch (error) {
      console.error(`Error fetching file with ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Search files by term with pagination
   * @param searchTerm Term to search for
   * @param page Page number (default: 1)
   * @param limit Number of items per page (default: 10)
   * @returns Promise with paginated search results
   */
  async searchFiles(
    searchTerm: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<FileUploadedData>> {
    try {
      const response = await apiClient.get(`/search/${searchTerm}`, {
        params: { page, limit },
      });

      return {
        data: response.data.files,
        pagination: response.data.pagination,
      };
    } catch (error) {
      console.error(
        `Error searching files with term "${searchTerm}":`,
        error,
      );
      throw error;
    }
  },

  /**
   * Search files by snippets with pagination and optional vector search
   * @param searchTerm Term to search for
   * @param page Page number (default: 1)
   * @param limit Number of items per page (default: 10)
   * @param useVector Whether to use vector search (default: false)
   * @returns Promise with paginated search results
   */
  async searchSnippetsGetFiles(
    searchTerm: string,
    page: number = 1,
    limit: number = 10,
    useVector: boolean = true,
  ): Promise<PaginatedResponse<FileUploadedData>> {
    try {
      console.log(
        `Searching snippets with term: "${searchTerm}", page: ${page}, limit: ${limit}, useVector: ${useVector}`,
      );

      // Validate parameters
      if (!searchTerm || searchTerm.trim() === "") {
        return {
          data: [],
          pagination: {
            page: page,
            limit: limit,
            total: 0,
            pages: 0,
          },
        };
      }

      // Make the API request with proper error handling
      const response = await apiClient.get(
        `/searchSnippets/${encodeURIComponent(searchTerm)}`,
        {
          params: {
            page,
            limit,
            useVector: useVector.toString(),
          },
          timeout: 20000, // Increase timeout for potentially longer searches
        },
      );

      console.log(
        "Search response received:",
        response.data?.files?.length
          ? `${response.data.files.length} files found`
          : "No files found",
      );

      // Ensure we have a properly structured response
      if (!response.data || !Array.isArray(response.data.files)) {
        console.error("Invalid response format:", response.data);
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            pages: 0,
          },
        };
      }

      return {
        data: response.data.files,
        pagination: response.data.pagination || {
          page,
          limit,
          total: response.data.files.length,
          pages: Math.ceil(response.data.files.length / limit),
        },
      };
    } catch (error: any) {
      console.error(
        `Error searching files with term "${searchTerm}":`,
        error,
      );
      console.error(
        "Error details:",
        error.response?.data || error.message,
      );

      // Return an empty result rather than throwing
      return {
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0,
        },
      };
    }
  },

  /**
   * Get autocomplete suggestions for a search term
   * @param searchTerm Term to search for
   * @returns Promise with autocomplete suggestions
   */
  async getAutocompleteSuggestions(searchTerm: string): Promise<string[]> {
    try {
      const response = await apiClient.get(
        `/autocomplete/${encodeURIComponent(searchTerm)}`,
      );
      console.log("Autocomplete response received:", response.data);
      // return summary with enumeration
      return response.data.cursor.firstBatch.map(
        (item: any, index: number) => `${index + 1}. ${item.summary}`,
      );
    } catch (error) {
      console.error(
        `Error getting autocomplete suggestions for term "${searchTerm}":`,
        error,
      );
      throw error;
    }
  },
  /**
   * Seed the database with test data
   * @returns Promise with success message
   */
  async seedDatabase(): Promise<{ message: string }> {
    try {
      const response = await apiClient.post("/seed");
      return response.data;
    } catch (error) {
      console.error("Error seeding database:", error);
      throw error;
    }
  },
};

export default mongoSearchApi;
