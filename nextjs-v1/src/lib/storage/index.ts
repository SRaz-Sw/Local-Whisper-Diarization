/**
 * Storage Service Factory
 * 
 * This module exports functions and singleton instances for file storage services.
 * It provides a centralized way to access the active storage service defined in the configuration.
 */

import { FileStorageService, StorageProviderType } from "./types";
import { ACTIVE_STORAGE_PROVIDER } from "@/config/storage";
// Import the UploadThing service dynamically to avoid SSR issues with React components
// We need to use dynamic imports because the UploadThing adapter contains JSX
// and we need to make sure it's only loaded in the browser environment

// Singleton instance of the active storage service
let _storageService: FileStorageService | null = null;

/**
 * Get the storage service for the specified provider type
 * 
 * @param providerType Type of provider to get the service for
 * @returns A FileStorageService implementation for the requested provider
 */
export async function getStorageService(
  providerType: StorageProviderType = ACTIVE_STORAGE_PROVIDER
): Promise<FileStorageService> {
  
  // Return the singleton instance if already created
  if (_storageService) {
    return _storageService;
  }
  
  // Create the appropriate service based on provider type
  try {
    switch (providerType) {
      case 'uploadthing': {
        // Dynamic import to avoid issues with server-side rendering
        const { UploadThingStorageService } = await import('./providers/uploadthingService');
        _storageService = new UploadThingStorageService();
        break;
      }
      
      case 'cloudinary': {
        // Dynamic import to avoid issues with server-side rendering
        const { CloudinaryStorageService } = await import('./providers/cloudinaryService');
        _storageService = new CloudinaryStorageService();
        break;
      }
      
      case 's3': {
        // To be implemented when S3 support is added
        console.warn('AWS S3 storage provider not yet implemented, falling back to UploadThing');
        const { UploadThingStorageService } = await import('./providers/uploadthingService');
        _storageService = new UploadThingStorageService();
        break;
      }
      
      case 'firebase': {
        // To be implemented when Firebase support is added
        console.warn('Firebase storage provider not yet implemented, falling back to UploadThing');
        const { UploadThingStorageService } = await import('./providers/uploadthingService');
        _storageService = new UploadThingStorageService();
        break;
      }
      
      case 'mock': {
        // Load the mock service for testing
        console.log('Using mock storage provider for testing');
        const { MockStorageService } = await import('./providers/mockStorageService');
        _storageService = new MockStorageService();
        break;
      }
      
      default: {
        // Fall back to UploadThing if the provider is not recognized
        console.warn(`Unknown storage provider: ${providerType}, falling back to UploadThing`);
        const { UploadThingStorageService } = await import('./providers/uploadthingService');
        _storageService = new UploadThingStorageService();
      }
    }
  } catch (error) {
    console.error("Error initializing storage service:", error);
    // If there was an error loading the requested service, try to load UploadThing as fallback
    try {
      const { UploadThingStorageService } = await import('./providers/uploadthingService');
      _storageService = new UploadThingStorageService();
      console.warn("Falling back to UploadThing storage service after error");
    } catch (fallbackError) {
      console.error("Failed to load fallback storage service:", fallbackError);
      throw new Error("Could not initialize any storage service");
    }
  }
  
  // At this point, _storageService should be initialized
  if (!_storageService) {
    throw new Error("Failed to initialize storage service");
  }
  
  // We can safely assert this is not null now
  return _storageService;
}

/**
 * Get a lazy-loaded singleton instance of the file storage service.
 * 
 * This function is designed to be used in React components that need
 * access to the storage service. It uses React Suspense for loading.
 * 
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const [file, setFile] = useState<File | null>(null);
 *   
 *   // Handle file upload
 *   const handleUpload = async () => {
 *     if (!file) return;
 *     const storageService = await initializeStorageService();
 *     const result = await storageService.uploadFile(file);
 *     console.log('Upload result:', result);
 *   };
 *   
 *   return (
 *     <div>
 *       <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
 *       <button onClick={handleUpload}>Upload</button>
 *     </div>
 *   );
 * }
 * ```
 */
export async function initializeStorageService(): Promise<FileStorageService> {
  return getStorageService();
}

// Export a function to reset the service (mainly for testing)
export function resetStorageService(): void {
  _storageService = null;
} 