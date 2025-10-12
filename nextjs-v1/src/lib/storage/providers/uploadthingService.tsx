/**
 * UploadThing Storage Service Adapter
 * 
 * This adapter implements the FileStorageService interface for UploadThing.
 * It handles file uploads using UploadThing's React components and SDK.
 */

import React, { ReactElement } from "react";
import { 
  FileStorageService, 
  FileUploadOptions, 
  FileUploadProgressEvent, 
  FileUploadResponse 
} from "../types";
import { storageConfig } from "@/config/storage";
import { UploadButton, UploadDropzone } from "@/lib/uploadthing";

// Interface for the UploadThing specific response
interface UploadThingResponse {
  url?: string;
  fileUrl?: string;
  file?: {
    url?: string;
    name?: string;
    size?: number;
    type?: string;
  };
  name?: string;
  size?: number;
  key?: string;
}

// Interface for UploadThing component options
interface UploadThingComponentOptions {
  endpoint?: string;
  onClientUploadComplete?: (res?: any[]) => void;
  onUploadError?: (error: Error) => void;
  onUploadBegin?: () => void;
  appearance?: Record<string, any>;
}

// Function to generate an upload endpoint based on file type
const getEndpointForFileType = (type?: string): string => {
  if (!type) return "imageUploader";
  
  if (type.startsWith("image/")) return "imageUploader";
  if (type.startsWith("video/")) return "videoUploader";
  if (type.startsWith("audio/")) return "audioUploader";
  if (type.match(/pdf|doc|xls|txt|rtf|csv/i)) return "documentUploader";
  
  // Default to image uploader
  return "imageUploader";
}

/**
 * UploadThing adapter for the FileStorageService interface.
 * IMPORTANT: This service requires custom UI components for uploads as UploadThing
 * does not support direct file uploads without their React components.
 */
export class UploadThingStorageService implements FileStorageService {
  readonly provider = "uploadthing";
  readonly requiresCustomUI = true;
  
  private progressCallbacks: ((event: FileUploadProgressEvent) => void)[] = [];
  private config = storageConfig.uploadthing;
  private progressInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    console.log("Initialized UploadThingStorageService");
    
    // Bind methods to preserve 'this' context
    this.uploadFile = this.uploadFile.bind(this);
    this.uploadFiles = this.uploadFiles.bind(this);
    this.deleteFile = this.deleteFile.bind(this);
    this.onProgress = this.onProgress.bind(this);
    this.emitProgress = this.emitProgress.bind(this);
    this.getUploadButton = this.getUploadButton.bind(this);
    this.getUploadDropzone = this.getUploadDropzone.bind(this);
    this.handleUploadBegin = this.handleUploadBegin.bind(this);
    this.handleUploadComplete = this.handleUploadComplete.bind(this);
    this.handleUploadError = this.handleUploadError.bind(this);
  }
  
  /**
   * Handler for upload beginning
   */
  handleUploadBegin() {
    console.log("Upload beginning");
    // Start progress at 0%
    this.emitProgress({ progress: 0 });
    
    // Clear any existing interval
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
    
    // Simulate incremental progress
    let progress = 0;
    this.progressInterval = setInterval(() => {
      progress += 5;
      if (progress <= 90) {
        this.emitProgress({ progress });
      } else {
        if (this.progressInterval) {
          clearInterval(this.progressInterval);
          this.progressInterval = null;
        }
      }
    }, 200);
  }
  
  /**
   * Handler for upload completion
   */
  handleUploadComplete(res?: any[]) {
    console.log("Upload complete", res);
    // Clear progress interval
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    
    // Set progress to 100%
    this.emitProgress({ progress: 100 });
  }
  
  /**
   * Handler for upload errors
   */
  handleUploadError(error: Error) {
    console.log("Upload error", error);
    // Clear progress interval
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    
    // Reset progress
    this.emitProgress({ progress: 0 });
  }
  
  /**
   * Upload a single file using UploadThing
   * 
   * NOTE: UploadThing primarily works through its React components rather than direct API calls.
   * This method exists for compatibility with the FileStorageService interface but has limitations.
   * For proper UploadThing uploads, use the getUploadButton or getUploadDropzone methods instead.
   */
  async uploadFile(file: File, options?: FileUploadOptions): Promise<FileUploadResponse> {
    console.warn(
      "UploadThing adapter: Direct file uploads are not fully supported. " +
      "UploadThing requires using their React components for proper uploads. " +
      "Consider using a provider that supports direct uploads or access the UploadThing " +
      "components through getUploadButton/getUploadDropzone methods."
    );
    
    try {
      this.emitProgress({ progress: 0 });
      
      return new Promise((resolve, reject) => {
        reject(new Error(
          "Direct uploads not fully supported with UploadThing. " +
          "Please use the UI components instead through FileUploader."
        ));
      });
    } catch (error) {
      console.error("Error uploading with UploadThing:", error);
      throw error;
    }
  }
  
  /**
   * Upload multiple files - same limitations as uploadFile
   */
  async uploadFiles(files: File[], options?: FileUploadOptions): Promise<FileUploadResponse[]> {
    console.warn(
      "UploadThing adapter: Batch uploads are not fully supported. " +
      "UploadThing requires using their React components for proper uploads."
    );
    
    throw new Error(
      "Batch uploads not supported with UploadThing directly. " +
      "Please use the UI components instead."
    );
  }
  
  /**
   * Delete a file - note that this may not be fully supported by UploadThing
   * in their free tier or without server-side integration
   */
  async deleteFile(urlOrPath: string): Promise<boolean> {
    console.warn("UploadThing adapter: deleteFile may not be fully supported in client-side implementation");
    
    // In a real implementation, this would call UploadThing's deletion API
    // For now, we'll just assume success
    return Promise.resolve(true);
  }
  
  /**
   * Register progress callback
   */
  onProgress(callback: (event: FileUploadProgressEvent) => void): () => void {
    this.progressCallbacks.push(callback);
    
    // Return an unsubscribe function
    return () => {
      this.progressCallbacks = this.progressCallbacks.filter(cb => cb !== callback);
    };
  }
  
  /**
   * Emit progress to all registered callbacks
   */
  private emitProgress(event: FileUploadProgressEvent): void {
    this.progressCallbacks.forEach(callback => callback(event));
  }
  
  /**
   * Get a React component for UploadThing's UploadButton
   * This is the recommended way to use UploadThing with our abstraction
   */
  getUploadButton(options: UploadThingComponentOptions): ReactElement {
    const endpoint = options.endpoint || "imageUploader";
    
    // Create wrapper functions that call our bound class methods and then the provided callbacks
    const onUploadBegin = () => {
      this.handleUploadBegin();
      if (options.onUploadBegin) {
        options.onUploadBegin();
      }
    };
    
    const onClientUploadComplete = (res?: any[]) => {
      this.handleUploadComplete(res);
      if (options.onClientUploadComplete) {
        options.onClientUploadComplete(res);
      }
    };
    
    const onUploadError = (error: Error) => {
      this.handleUploadError(error);
      if (options.onUploadError) {
        options.onUploadError(error);
      }
    };
    
    return (
      <UploadButton
        endpoint={endpoint}
        onClientUploadComplete={onClientUploadComplete}
        onUploadError={onUploadError}
        onUploadBegin={onUploadBegin}
        appearance={options.appearance}
      />
    );
  }
  
  /**
   * Get a React component for UploadThing's UploadDropzone
   */
  getUploadDropzone(options: UploadThingComponentOptions): ReactElement {
    const endpoint = options.endpoint || "imageUploader";
    
    // Create wrapper functions that call our bound class methods and then the provided callbacks
    const onUploadBegin = () => {
      this.handleUploadBegin();
      if (options.onUploadBegin) {
        options.onUploadBegin();
      }
    };
    
    const onClientUploadComplete = (res?: any[]) => {
      this.handleUploadComplete(res);
      if (options.onClientUploadComplete) {
        options.onClientUploadComplete(res);
      }
    };
    
    const onUploadError = (error: Error) => {
      this.handleUploadError(error);
      if (options.onUploadError) {
        options.onUploadError(error);
      }
    };
    
    return (
      <UploadDropzone
        endpoint={endpoint}
        onClientUploadComplete={onClientUploadComplete}
        onUploadError={onUploadError}
        onUploadBegin={onUploadBegin}
        appearance={options.appearance}
      />
    );
  }
  
  /**
   * Map UploadThing response to our standardized FileUploadResponse
   */
  private mapUploadThingResponse(response: UploadThingResponse): FileUploadResponse {
    return {
      url: response.url || response.fileUrl || response.file?.url || "",
      name: response.name || response.file?.name,
      size: response.size || response.file?.size,
      type: response.file?.type,
      metadata: {
        key: response.key,
        provider: 'uploadthing'
      }
    };
  }
} 