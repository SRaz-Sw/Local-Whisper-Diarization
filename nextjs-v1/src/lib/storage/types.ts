/**
 * File Storage Service - Core Types and Interfaces
 * 
 * This file defines the core interfaces and types for the file storage abstraction layer.
 * It provides a common interface that all storage provider adapters must implement.
 */

/**
 * Response type for file upload operations
 */
export interface FileUploadResponse {
  /** The URL where the uploaded file can be accessed */
  url: string;
  /** Optional file name */
  name?: string;
  /** Optional file size in bytes */
  size?: number;
  /** Optional file MIME type */
  type?: string;
  /** Optional metadata associated with the file */
  metadata?: Record<string, any>;
}

/**
 * Event type for tracking upload progress
 */
export interface FileUploadProgressEvent {
  /** Progress percentage (0-100) */
  progress: number;
  /** Optional bytes transferred so far */
  bytesTransferred?: number;
  /** Optional total bytes to transfer */
  totalBytes?: number;
}

/**
 * Options for file upload operations
 */
export interface FileUploadOptions {
  /** Optional folder or path to store the file in */
  folder?: string;
  /** Type of content being uploaded */
  type?: 'image' | 'document' | 'video' | 'audio' | 'avatar' | 'other';
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Allowed file types (MIME types or extensions) */
  allowedFileTypes?: string[];
  /** Whether the file should be publicly accessible */
  public?: boolean;
  /** Additional metadata to associate with the file */
  metadata?: Record<string, any>;
}

/**
 * Core interface that all storage providers must implement
 */
export interface FileStorageService {
  /**
   * Get the name of this storage provider
   */
  readonly provider: string;

  /**
   * Upload a single file
   * @param file The file to upload
   * @param options Upload options
   * @returns Promise resolving to the upload response
   */
  uploadFile(file: File, options?: FileUploadOptions): Promise<FileUploadResponse>;

  /**
   * Upload multiple files
   * @param files Array of files to upload
   * @param options Upload options
   * @returns Promise resolving to an array of upload responses
   */
  uploadFiles(files: File[], options?: FileUploadOptions): Promise<FileUploadResponse[]>;

  /**
   * Delete a file by its URL or path
   * @param urlOrPath The URL or path of the file to delete
   * @returns Promise resolving to boolean indicating success
   */
  deleteFile(urlOrPath: string): Promise<boolean>;

  /**
   * Register a callback to be called with progress updates during upload
   * @param callback Function to call with progress updates
   * @returns Function to unregister the callback
   */
  onProgress(callback: (event: FileUploadProgressEvent) => void): () => void;

  /**
   * Whether this provider requires UI integration with its own components
   * for optimal functionality (true) or can work with standard file inputs (false)
   */
  readonly requiresCustomUI: boolean;
}

/**
 * Types of supported storage providers
 */
export type StorageProviderType = 'uploadthing' | 'cloudinary' | 's3' | 'firebase' | 'mock'; 