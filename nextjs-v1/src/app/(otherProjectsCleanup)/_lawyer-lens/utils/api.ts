import axios from "axios";
import config from "../../../../lib/config";
// import { getToken } from '../../../lib/token';
import {
  FileUploadedData,
  SnippetData,
  EntityData,
  fileUploadedSchema,
  snippetSchema,
  entitySchema,
} from "@sraz-sw/copyfact-shared";

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

const processFile = (file: any): FileUploadedData => {
  const normalizedData: FileUploadedData = {
    ...file,
    uploadAt: new Date(file.uploadAt),
    modifiedAt: new Date(file.modifiedAt),
    createdAt: new Date(file.createdAt),
    lastMessageAt: new Date(file.lastMessageAt),
  };
  const validatedFile: FileUploadedData =
    fileUploadedSchema.parse(normalizedData);
  return validatedFile;
};

const processSnippet = (snippet: any): SnippetData => {
  const normalizedData: SnippetData = {
    ...snippet,
    createdAt: new Date(snippet.createdAt),
    modifiedAt: new Date(snippet.modifiedAt),
  };
  const validatedSnippet: SnippetData =
    snippetSchema.parse(normalizedData);
  return validatedSnippet;
};

const processEntity = (entity: any): EntityData => {
  const normalizedData: EntityData = {
    ...entity,
    createdAt: new Date(entity.createdAt),
    modifiedAt: new Date(entity.modifiedAt),
  };
  const validatedEntity: EntityData = entitySchema.parse(normalizedData);
  return validatedEntity;
};

// API service for Lawyer Lens
export const lawyerLensApi = {
  async addFilesToCase(
    caseId: string,
    files: FileUploadedData[],
  ): Promise<FileUploadedData[]> {
    // NOTE  - need to upload files to bucket or send with the request.
    const response = await apiClient.post(`/case/${caseId}/files`, {
      files,
    });
    return response.data.map(processFile);
  },

  async getFilesByCaseId(caseId: string): Promise<FileUploadedData[]> {
    const response = await apiClient.get(`/case/${caseId}/files`);
    return response.data.map(processFile);
  },

  async getFileById(fileId: string): Promise<FileUploadedData> {
    const response = await apiClient.get(`/file/${fileId}`);
    return response.data;
  },
};

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

// API service for file uploads
export const fileUploadApi = {
  /**
   * Upload files to the server
   * @param files Array of files to upload
   * @returns Promise with uploaded file data
   */
  async uploadFiles(files: File[]): Promise<FileUploadedData[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await apiClient.post("/files", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data.files.map(processFile);
  },

  /**
   * Upload files to a specific case
   * @param caseId Case ID
   * @param files Array of files to upload
   * @returns Promise with uploaded file data
   */
  async uploadFilesToCase(
    caseId: string,
    files: File[],
  ): Promise<FileUploadedData[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await apiClient.post(
      `/case/${caseId}/files`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response.data.files.map(processFile);
  },

  /**
   * Upload a single chunk of a file
   * @param chunk Chunk data
   * @param fileName Original file name
   * @param chunkIndex Index of this chunk (0-based)
   * @param totalChunks Total number of chunks
   * @param uploadId Upload ID for resumable uploads
   * @returns Promise with chunk upload result
   */
  async uploadChunk(
    chunk: Blob,
    fileName: string,
    chunkIndex: number,
    totalChunks: number,
    uploadId?: string,
  ): Promise<{
    uploadId: string;
    chunkIndex: number;
    received: boolean;
    chunksReceived: number;
    totalChunks: number;
    expiresAt: Date;
  }> {
    const formData = new FormData();
    formData.append("chunk", chunk);
    formData.append("fileName", fileName);
    formData.append("chunkIndex", String(chunkIndex));
    formData.append("totalChunks", String(totalChunks));
    if (uploadId) {
      formData.append("uploadId", uploadId);
    }

    const response = await apiClient.post("/files/chunk", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return {
      ...response.data,
      expiresAt: new Date(response.data.expiresAt),
    };
  },

  /**
   * Complete a chunked upload
   * @param uploadId Upload ID
   * @param fileName Original file name
   * @param totalChunks Total number of chunks
   * @returns Promise with completed file data
   */
  async completeChunkedUpload(
    uploadId: string,
    fileName: string,
    totalChunks: number,
  ): Promise<FileUploadedData> {
    const response = await apiClient.post(
      "/files/complete-chunked-upload",
      {
        uploadId,
        fileName,
        totalChunks,
      },
    );

    return processFile(response.data);
  },

  /**
   * Get information for resuming an upload
   * @param uploadId Upload ID
   * @returns Promise with resume information
   */
  async getResumeInfo(uploadId: string): Promise<{
    uploadId: string;
    fileName: string;
    fileType: string;
    chunksReceived: number[];
    totalChunks: number;
    createdAt: Date;
    expiresAt: Date;
  }> {
    const response = await apiClient.get(`/files/resume/${uploadId}`);

    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      expiresAt: new Date(response.data.expiresAt),
    };
  },

  /**
   * Delete a file
   * @param fileId File ID
   * @returns Promise with success status
   */
  async deleteFile(fileId: string): Promise<boolean> {
    const response = await apiClient.delete(`/file/${fileId}`);
    return response.data.success;
  },
};

export default mongoSearchApi;
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
