/**
 * Mock Storage Service for Testing
 * 
 * This service provides a mock implementation of the FileStorageService interface
 * for testing purposes. It simulates file uploads with configurable delays and behavior.
 */

import { 
  FileStorageService, 
  FileUploadOptions, 
  FileUploadProgressEvent, 
  FileUploadResponse 
} from "../types";
import { storageConfig } from "@/config/storage";

export class MockStorageService implements FileStorageService {
  readonly provider = "mock";
  readonly requiresCustomUI = false;
  
  private progressCallbacks: ((event: FileUploadProgressEvent) => void)[] = [];
  private config = storageConfig.mock;
  private uploadedFiles: Map<string, FileUploadResponse> = new Map();
  
  constructor() {
    console.log("Initialized MockStorageService with config:", this.config);
  }
  
  /**
   * Upload a single file with simulated progress events
   */
  async uploadFile(file: File, options?: FileUploadOptions): Promise<FileUploadResponse> {
    console.log("MockStorageService: uploadFile called with:", file.name, options);
    
    // Simulate errors if configured to do so
    if (this.config.simulateErrors && Math.random() < 0.2) {
      const error = new Error("Simulated upload error");
      console.error("MockStorageService: Simulating upload error", error);
      throw error;
    }
    
    // Start progress at 0
    this.emitProgress({ progress: 0 });
    
    // Generate a unique file ID
    const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // Create a realistic mock URL based on the file type and configured options
    const fileUrl = this.generateMockUrl(file, fileId, options);
    
    // Return a promise that resolves after the configured delay
    return new Promise((resolve) => {
      let progress = 0;
      
      // Simulate progress updates
      const interval = setInterval(() => {
        progress += 10;
        
        if (progress <= 100) {
          this.emitProgress({ 
            progress,
            bytesTransferred: Math.floor((file.size * progress) / 100),
            totalBytes: file.size
          });
        }
        
        if (progress >= 100) {
          clearInterval(interval);
          
          // Create the response
          const response: FileUploadResponse = {
            url: fileUrl,
            name: file.name,
            size: file.size,
            type: file.type,
            metadata: {
              mockId: fileId,
              provider: 'mock',
              ...options?.metadata
            }
          };
          
          // Store the response for deletion later
          this.uploadedFiles.set(fileUrl, response);
          
          // Log for debugging
          console.log("MockStorageService: Upload completed", response);
          
          // Resolve with the response
          resolve(response);
        }
      }, this.config.simulatedDelay / 10);
    });
  }
  
  /**
   * Upload multiple files
   */
  async uploadFiles(files: File[], options?: FileUploadOptions): Promise<FileUploadResponse[]> {
    console.log("MockStorageService: uploadFiles called with", files.length, "files");
    
    // Simulate errors if configured to do so
    if (this.config.simulateErrors && Math.random() < 0.2) {
      const error = new Error("Simulated batch upload error");
      console.error("MockStorageService: Simulating batch upload error", error);
      throw error;
    }
    
    const responses: FileUploadResponse[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const perFileWeight = 100 / files.length;
      
      // Register a progress handler for this file
      const unsubscribe = this.onProgress((event) => {
        const overallProgress = (i * perFileWeight) + (event.progress * perFileWeight / 100);
        this.emitProgress({ 
          progress: Math.round(overallProgress),
          bytesTransferred: event.bytesTransferred,
          totalBytes: event.totalBytes
        });
      });
      
      // Upload the file
      const response = await this.uploadFile(files[i], options);
      responses.push(response);
      
      // Unregister the progress handler
      unsubscribe();
    }
    
    return responses;
  }
  
  /**
   * Delete a file by URL
   */
  async deleteFile(urlOrPath: string): Promise<boolean> {
    console.log("MockStorageService: deleteFile called for", urlOrPath);
    
    // Simulate errors if configured to do so
    if (this.config.simulateErrors && Math.random() < 0.2) {
      const error = new Error("Simulated deletion error");
      console.error("MockStorageService: Simulating deletion error", error);
      throw error;
    }
    
    // Check if the file exists
    if (!this.uploadedFiles.has(urlOrPath)) {
      console.warn("MockStorageService: File not found for deletion", urlOrPath);
      return false;
    }
    
    // Remove the file from the map
    this.uploadedFiles.delete(urlOrPath);
    console.log("MockStorageService: File deleted", urlOrPath);
    
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, this.config.simulatedDelay / 2));
    
    return true;
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
   * Emit a progress event to all registered callbacks
   */
  private emitProgress(event: FileUploadProgressEvent): void {
    this.progressCallbacks.forEach(callback => callback(event));
  }
  
  /**
   * Clear all stored files (for testing)
   */
  clearFiles(): void {
    this.uploadedFiles.clear();
    console.log("MockStorageService: All files cleared");
  }
  
  /**
   * Generate a realistic mock URL based on file type and options
   */
  private generateMockUrl(file: File, fileId: string, options?: FileUploadOptions): string {
    const { baseUrl } = this.config;
    const fileType = file.type.split('/')[0] || 'file';
    const folder = options?.folder || fileType + 's';
    const timestamp = Date.now();
    const fileName = encodeURIComponent(file.name.replace(/\s+/g, '-'));
    
    return `${baseUrl}${folder}/${timestamp}-${fileId}-${fileName}`;
  }
  
  /**
   * Get all stored files (for testing)
   */
  getAllFiles(): FileUploadResponse[] {
    return Array.from(this.uploadedFiles.values());
  }
  
  /**
   * Set whether to simulate errors (for testing)
   */
  setSimulateErrors(simulate: boolean): void {
    this.config.simulateErrors = simulate;
    console.log("MockStorageService: Simulate errors set to", simulate);
  }
} 