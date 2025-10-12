"use client";

/**
 * FileUploader Component
 * 
 * A generic file upload component that abstracts away the underlying
 * storage provider. This component can adapt to different storage providers
 * based on the application configuration.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { initializeStorageService } from "@/lib/storage/index";
import { FileStorageService, FileUploadProgressEvent } from "@/lib/storage/types";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, UploadCloud, Check, AlertCircle } from "lucide-react";

interface FileUploaderProps {
  /**
   * Callback called when a file upload is completed successfully
   */
  onUploadComplete: (url: string) => void;
  
  /**
   * Callback called when an upload fails with an error
   */
  onUploadError?: (error: Error) => void;
  
  /**
   * The type of content being uploaded (affects validation and endpoint)
   */
  type?: 'image' | 'document' | 'video' | 'audio' | 'avatar';
  
  /**
   * The upload endpoint to use (for services like UploadThing)
   * If not specified, it will be determined automatically based on 'type'
   */
  endpoint?: string;
  
  /**
   * Button variant
   */
  variant?: "default" | "outline" | "ghost" | "link";
  
  /**
   * Text to display on the upload button
   */
  buttonText?: string;
  
  /**
   * Additional CSS class names
   */
  className?: string;
  
  /**
   * Whether multiple files can be selected
   */
  multiple?: boolean;
  
  /**
   * Whether to show the progress bar
   */
  showProgress?: boolean;
  
  /**
   * Maximum file size in bytes (defaults to 4MB)
   */
  maxSize?: number;
  
  /**
   * Allow file types (e.g. ['image/jpeg', 'image/png'])
   */
  allowedTypes?: string[];
}

export default function FileUploader({
  onUploadComplete,
  onUploadError,
  type = 'image',
  endpoint,
  variant = "default",
  buttonText,
  className = "",
  multiple = false,
  showProgress = true,
  maxSize = 4 * 1024 * 1024, // 4MB default
  allowedTypes,
}: FileUploaderProps) {
  // State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [storageService, setStorageService] = useState<FileStorageService | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Reference to file input element for standard uploads
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Initialize storage service on component mount
  useEffect(() => {
    let isMounted = true;
    
    const loadStorageService = async () => {
      try {
        const service = await initializeStorageService();
        if (isMounted) {
          setStorageService(service);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to initialize storage service:", err);
        if (isMounted) {
          setError("Failed to initialize upload service");
          setIsLoading(false);
        }
      }
    };
    
    loadStorageService();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Progress handler for standard uploads
  const handleProgress = useCallback((event: FileUploadProgressEvent) => {
    setUploadProgress(event.progress);
    
    // Mark as success when progress reaches 100%
    if (event.progress === 100 && !success) {
      setTimeout(() => {
        setSuccess(true);
        
        // Reset state after a brief delay
        setTimeout(() => {
          setSuccess(false);
          setUploadProgress(0);
          setIsUploading(false);
        }, 2000);
      }, 500);
    }
  }, [success]);
  
  // Register progress callback when storage service is available
  useEffect(() => {
    if (!storageService) return;
    
    // Register progress callback
    const unsubscribe = storageService.onProgress(handleProgress);
    
    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [storageService, handleProgress]);
  
  // Handle file selection and upload for standard file input
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!storageService) {
      setError("Storage service not initialized");
      return;
    }
    
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validate file type if allowedTypes is provided
    if (allowedTypes && allowedTypes.length > 0) {
      if (!allowedTypes.includes(file.type)) {
        const error = new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
        setError(error.message);
        if (onUploadError) onUploadError(error);
        return;
      }
    }
    
    // Validate file size
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      const error = new Error(`File is too large. Maximum size allowed is ${maxSizeMB}MB`);
      setError(error.message);
      if (onUploadError) onUploadError(error);
      return;
    }
    
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);
    
    try {
      // Upload file using storage service
      const result = await storageService.uploadFile(file, {
        type,
        maxFileSize: maxSize,
        allowedFileTypes: allowedTypes,
        // Use endpoint as folder if provided
        folder: endpoint
      });
      
      // Handle successful upload
      setUploadProgress(100);
      setSuccess(true);
      
      // Call onUploadComplete with the URL
      onUploadComplete(result.url);
      
      // Reset state after a delay
      setTimeout(() => {
        setSuccess(false);
        setIsUploading(false);
        setUploadProgress(0);
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 2000);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown upload error');
      console.error("Error uploading file:", error);
      setError(error.message);
      setIsUploading(false);
      setUploadProgress(0);
      
      if (onUploadError) onUploadError(error);
    }
  }, [storageService, type, maxSize, allowedTypes, endpoint, onUploadComplete, onUploadError]);
  
  // Determine the button text
  const displayButtonText = buttonText || (
    type === 'image' ? 'Upload Image' : 
    type === 'document' ? 'Upload Document' : 
    type === 'video' ? 'Upload Video' : 
    type === 'audio' ? 'Upload Audio' : 
    'Upload File'
  );
  
  // Trigger file selection
  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Handle providers that require custom UI components (like UploadThing)
  if (storageService?.requiresCustomUI && storageService.provider === 'uploadthing') {
    // If using UploadThing, render its components through our adapter
    // This requires that the UploadThingStorageService implements the following methods
    if ('getUploadButton' in storageService) {
      // Cast to a type that includes the getUploadButton method
      const uploadThingService = storageService as unknown as { 
        getUploadButton: (options: any) => React.ReactElement 
      };
      
      // Option to directly render the UploadThing button through our adapter
      return (
        <div className={className}>
          {uploadThingService.getUploadButton({
            endpoint: endpoint || (type === 'image' ? 'imageUploader' : 
                      type === 'document' ? 'documentUploader' : 
                      type === 'video' ? 'videoUploader' : 
                      type === 'audio' ? 'audioUploader' : 'imageUploader'),
            onClientUploadComplete: (res?: any[]) => {
              if (res && res.length > 0) {
                const url = res[0].url || res[0].fileUrl || res[0].file?.url;
                if (url) {
                  onUploadComplete(url);
                }
              }
            },
            onUploadError: (error: Error) => {
              if (onUploadError) onUploadError(error);
            },
            appearance: {
              button: `ut-button:${variant === 'default' ? 'bg-primary' : 'bg-transparent'} ut-button:rounded-md ut-button:w-full`,
              allowedContent: "text-sm text-muted-foreground"
            }
          })}
          
          {/* Show progress if needed */}
          {showProgress && isUploading && (
            <div className="mt-2 space-y-1">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : "Processing..."}
              </p>
            </div>
          )}
          
          {/* Show error if present */}
          {error && (
            <div className="mt-2 flex items-center gap-1 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
          
          {/* Show success message if upload completed */}
          {success && (
            <div className="mt-2 flex items-center gap-1 text-sm text-green-600">
              <Check className="h-4 w-4" />
              <span>Upload successful!</span>
            </div>
          )}
        </div>
      );
    }
    
    // If the provider requires custom UI but our adapter doesn't support it,
    // show an error
    return (
      <div className={className}>
        <Button variant="destructive" disabled>
          Unsupported Provider UI
        </Button>
        <p className="text-xs text-destructive mt-1">
          The current storage provider requires custom UI components that are not implemented.
        </p>
      </div>
    );
  }
  
  // For providers that don't require custom UI (S3, Cloudinary, etc.)
  // or as a fallback, render a standard file input with our own UI
  return (
    <div className={className}>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept={allowedTypes?.join(',')}
        onChange={handleFileChange}
        className="hidden"
        disabled={isLoading || isUploading}
      />
      
      {/* Custom button that triggers the file input */}
      <Button
        variant={variant}
        onClick={handleButtonClick}
        disabled={isLoading || isUploading}
        className="w-full"
      >
        {isLoading ? (
          <div className="flex items-center gap-1">
            <Loader2 className="h-4 w-4 animate-spin" /> 
            Initializing...
          </div>
        ) : isUploading ? (
          <div className="flex items-center gap-1">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading...
          </div>
        ) : success ? (
          <div className="flex items-center gap-1">
            <Check className="h-4 w-4" />
            Upload Complete
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <UploadCloud className="h-4 w-4" />
            {displayButtonText}
          </div>
        )}
      </Button>
      
      {/* Show progress if needed */}
      {showProgress && isUploading && (
        <div className="mt-2 space-y-1">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : "Processing..."}
          </p>
        </div>
      )}
      
      {/* Show error if present */}
      {error && (
        <div className="mt-2 flex items-center gap-1 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Show success message if upload completed */}
      {success && (
        <div className="mt-2 flex items-center gap-1 text-sm text-green-600">
          <Check className="h-4 w-4" />
          <span>Upload successful!</span>
        </div>
      )}
    </div>
  );
} 