/**
 * Storage Configuration
 * 
 * This file contains configuration settings for the file storage services.
 * Each storage provider can have its own specific configuration options.
 */

import { StorageProviderType } from "@/lib/storage/types";

/**
 * The currently active storage provider, determined from environment variables.
 * Defaults to 'uploadthing' if not specified.
 */
export const ACTIVE_STORAGE_PROVIDER: StorageProviderType = 
  (process.env.NEXT_PUBLIC_STORAGE_PROVIDER as StorageProviderType) || 'uploadthing';

/**
 * Configuration object containing settings for all supported storage providers
 */
export const storageConfig = {
  /**
   * UploadThing specific configuration
   */
  uploadthing: {
    // URL for the UploadThing API, can be overridden for testing
    apiUrl: process.env.NEXT_PUBLIC_UPLOADTHING_URL || 'https://uploadthing.com',
    // The application ID for UploadThing
    appId: process.env.NEXT_PUBLIC_UPLOADTHING_APP_ID,
  },
  
  /**
   * Cloudinary specific configuration
   */
  cloudinary: {
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
    apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  },
  
  /**
   * AWS S3 specific configuration
   */
  s3: {
    region: process.env.NEXT_PUBLIC_AWS_REGION,
    bucket: process.env.NEXT_PUBLIC_S3_BUCKET,
    // Note: For S3 direct uploads, you would typically use pre-signed URLs
    // generated on your server, not keys directly in the client
  },
  
  /**
   * Firebase specific configuration
   */
  firebase: {
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  },
  
  /**
   * Mock storage for testing
   */
  mock: {
    // Delay in ms to simulate network latency
    simulatedDelay: 1500,
    // Whether the mock should simulate errors occasionally
    simulateErrors: false,
    // Base URL for mock file URLs
    baseUrl: 'https://mockfiles.example.com/',
  }
}; 