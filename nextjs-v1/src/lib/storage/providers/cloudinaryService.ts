/**
 * Cloudinary Storage Service Adapter
 * 
 * This adapter implements the FileStorageService interface for Cloudinary.
 * It handles direct file uploads to Cloudinary using their Upload Widget or REST API.
 */

import { 
  FileStorageService, 
  FileUploadOptions, 
  FileUploadProgressEvent,  
  FileUploadResponse 
} from "../types";
import { storageConfig } from "@/config/storage";

// Define Cloudinary specific interfaces
interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  original_filename?: string;
  bytes?: number;
  format?: string;
  resource_type?: string;
  created_at?: string;
  etag?: string;
  url?: string;
}

interface CloudinaryUploadParams {
  file: File;
  upload_preset: string;
  cloud_name: string;
  folder?: string;
  tags?: string[];
  public_id?: string;
  context?: Record<string, string>;
  [key: string]: any;
}

/**
 * Cloudinary adapter for the FileStorageService interface.
 * This service uses direct uploads to Cloudinary.
 */
export class CloudinaryStorageService implements FileStorageService {
  readonly provider = "cloudinary";
  readonly requiresCustomUI = false;
  
  private progressCallbacks: ((event: FileUploadProgressEvent) => void)[] = [];
  private config = storageConfig.cloudinary;
  
  constructor() {
    console.log("Initialized CloudinaryStorageService with config:", {
      cloudName: this.config.cloudName,
      uploadPreset: this.config.uploadPreset ? 'configured' : 'not-configured'
    });
    
    // Bind methods to preserve context
    this.uploadFile = this.uploadFile.bind(this);
    this.uploadFiles = this.uploadFiles.bind(this);
    this.deleteFile = this.deleteFile.bind(this);
    this.onProgress = this.onProgress.bind(this);
    this.emitProgress = this.emitProgress.bind(this);
  }
  
  /**
   * Upload a single file to Cloudinary using their REST API
   */
  async uploadFile(file: File, options?: FileUploadOptions): Promise<FileUploadResponse> {
    try {
      // Validate config
      if (!this.config.cloudName || !this.config.uploadPreset) {
        throw new Error("Cloudinary configuration is incomplete. Please provide cloud_name and upload_preset.");
      }
      
      // Start progress at 0
      this.emitProgress({ progress: 0 });
      
      // Create a FormData object to send to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', this.config.uploadPreset);
      
      // Add folder if specified in options
      if (options?.folder) {
        formData.append('folder', options.folder);
      }
      
      // Add any metadata
      if (options?.metadata) {
        for (const [key, value] of Object.entries(options.metadata)) {
          formData.append(`context`, `${key}=${value}`);
        }
      }
      
      // Create URL
      const url = `https://api.cloudinary.com/v1_1/${this.config.cloudName}/auto/upload`;
      
      // Create upload request with progress tracking
      const xhr = new XMLHttpRequest();
      
      // Return a promise that resolves on upload completion
      return new Promise((resolve, reject) => {
        // Track upload progress
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            this.emitProgress({ 
              progress, 
              bytesTransferred: event.loaded, 
              totalBytes: event.total 
            });
          }
        };
        
        // Handle completion
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = JSON.parse(xhr.responseText) as CloudinaryUploadResult;
            this.emitProgress({ progress: 100 });
            
            resolve({
              url: response.secure_url,
              name: response.original_filename,
              size: response.bytes,
              type: response.format ? `image/${response.format}` : undefined,
              metadata: {
                provider: 'cloudinary',
                publicId: response.public_id,
                resourceType: response.resource_type,
                createdAt: response.created_at
              }
            });
          } else {
            this.emitProgress({ progress: 0 });
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
          }
        };
        
        // Handle errors
        xhr.onerror = () => {
          this.emitProgress({ progress: 0 });
          reject(new Error('Network error during upload'));
        };
        
        // Handle aborts
        xhr.onabort = () => {
          this.emitProgress({ progress: 0 });
          reject(new Error('Upload aborted'));
        };
        
        // Open and send the request
        xhr.open('POST', url, true);
        xhr.send(formData);
      });
    } catch (error) {
      console.error("Error uploading to Cloudinary:", error);
      this.emitProgress({ progress: 0 });
      throw error;
    }
  }
  
  /**
   * Upload multiple files in sequence
   */
  async uploadFiles(files: File[], options?: FileUploadOptions): Promise<FileUploadResponse[]> {
    const responses: FileUploadResponse[] = [];
    const totalFiles = files.length;
    
    // Process files sequentially
    for (let i = 0; i < totalFiles; i++) {
      // Calculate per-file weight
      const perFileWeight = 100 / totalFiles;
      const baseProgress = i * perFileWeight;
      
      // Create a progress handler for this file
      const unsubscribe = this.onProgress((event) => {
        // Scale the individual file progress to the overall progress
        const scaledProgress = (event.progress * perFileWeight) / 100;
        const overallProgress = Math.round(baseProgress + scaledProgress);
        
        // Emit the overall progress
        this.emitProgress({ 
          progress: overallProgress,
          bytesTransferred: event.bytesTransferred,
          totalBytes: event.totalBytes
        });
      });
      
      // Upload the file
      try {
        const response = await this.uploadFile(files[i], options);
        responses.push(response);
      } finally {
        // Clean up the progress handler
        unsubscribe();
      }
    }
    
    // Set final progress to 100%
    this.emitProgress({ progress: 100 });
    
    return responses;
  }
  
  /**
   * Delete a file from Cloudinary
   * Note: This requires either server-side implementation or Cloudinary credentials with appropriate permissions
   */
  async deleteFile(urlOrPath: string): Promise<boolean> {
    // Extract the public ID from the URL
    const publicId = this.extractPublicIdFromUrl(urlOrPath);
    
    if (!publicId) {
      console.error("Could not extract public ID from URL:", urlOrPath);
      return false;
    }
    
    console.warn("Client-side deletion with Cloudinary requires server-side support.");
    console.warn("Implement a server endpoint to handle Cloudinary deletions securely.");
    console.warn("For now, this is a simulated deletion.");
    
    // In a real implementation, we would call a server endpoint to delete the file
    // For now, return true to simulate successful deletion
    return Promise.resolve(true);
  }
  
  /**
   * Register a progress callback
   */
  onProgress(callback: (event: FileUploadProgressEvent) => void): () => void {
    this.progressCallbacks.push(callback);
    
    return () => {
      this.progressCallbacks = this.progressCallbacks.filter(cb => cb !== callback);
    };
  }
  
  /**
   * Extract the public ID from a Cloudinary URL
   */
  private extractPublicIdFromUrl(url: string): string | null {
    try {
      // Cloudinary URLs typically have format:
      // https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
      const urlObj = new URL(url);
      if (!urlObj.hostname.includes('cloudinary.com')) {
        return null;
      }
      
      // Parse the path to extract the public ID
      const pathParts = urlObj.pathname.split('/');
      if (pathParts.length < 5) {
        return null;
      }
      
      // The public ID is everything after "upload/" except the file extension
      const uploadIndex = pathParts.findIndex(part => part === 'upload');
      if (uploadIndex === -1 || uploadIndex === pathParts.length - 1) {
        return null;
      }
      
      // Get everything after "upload/" and before file extension
      const publicIdWithExt = pathParts.slice(uploadIndex + 1).join('/');
      const lastDotIndex = publicIdWithExt.lastIndexOf('.');
      
      if (lastDotIndex === -1) {
        return publicIdWithExt;
      }
      
      return publicIdWithExt.substring(0, lastDotIndex);
    } catch (error) {
      console.error("Error extracting public ID from URL:", error);
      return null;
    }
  }
  
  /**
   * Emit progress to all registered callbacks
   */
  private emitProgress(event: FileUploadProgressEvent): void {
    this.progressCallbacks.forEach(callback => callback(event));
  }
} 