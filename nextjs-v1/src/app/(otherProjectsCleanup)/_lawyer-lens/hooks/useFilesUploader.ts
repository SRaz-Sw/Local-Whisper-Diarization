// File upload hook for handling client side logic for uploading files
// and saving them in our react-query persistent storage.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileUploadedData } from '@sraz-sw/copyfact-shared';
import { lawyerLensApi } from '../utils/api';
import { useState, useCallback, useEffect, useRef } from 'react';
import { initializeStorageService } from "@/lib/storage/index";
import { toast } from "sonner";

// Default chunk size (5MB)
const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;

// Extended version of FileUploadedData that includes our additional properties
interface ExtendedFileUploadedData extends FileUploadedData {
  uploadId?: string;
  chunksTotal?: number;
  chunksUploaded?: number;
}

// Progress tracking interface
export interface UploadProgress {
  file: File;
  progress: number; // 0-100
  status: 'queued' | 'uploading' | 'processing' | 'complete' | 'error' | 'paused';
  error?: Error;
  chunksTotal?: number;
  chunksUploaded?: number;
  uploadId?: string;
  // Add more file details for UI display
  uploadDate: Date;
  fileId: string; // Client-generated ID that matches the key in uploadProgress
  // Final file information (filled after successful upload)
  fileUrl?: string;
  serverFileId?: string; // ID returned from server
  finalFileName?: string;
  finalMimeType?: string;
  finalSize?: number;
  contractInfo?: any; // Document analysis results if available
}

// Hook options interface
export interface UseFileUploaderOptions {
  onSuccess?: (fileData: FileUploadedData[]) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: Record<string, UploadProgress>) => void;
  maxFileSize?: number; // in bytes
  allowedFileTypes?: string[]; // MIME types
  caseId?: string; // optional case association
  chunkSize?: number; // Size of each chunk for chunked uploads (default: 5MB)
  resumable?: boolean; // Whether to enable resumable uploads
  concurrentUploads?: number; // Max number of concurrent uploads
}

// Hook return type
export interface UseFileUploaderReturn {
  uploadFiles: (files: File[]) => Promise<FileUploadedData[]>;
  cancelUpload: (fileId: string) => void;
  pauseUpload: (fileId: string) => void;
  resumeUpload: (fileId: string) => void;
  isUploading: boolean;
  uploadProgress: Record<string, UploadProgress>;
  clearUploadStates: () => void;
  clearUploadProgressEntry: (fileId: string) => void; // New function to remove a file from state
}

// Use the Storage library types directly
import { FileUploadOptions } from "@/lib/storage/types";

// Default options
const DEFAULT_MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const DEFAULT_ALLOWED_TYPES: string[] = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
  'audio/mpeg',
  'audio/wav',
  'video/mp4',
  'video/quicktime'
];

// Storage key for resumable uploads
const STORAGE_KEY_UPLOAD_STATES = 'copyfact-resumable-uploads';

/**
 * Custom hook for handling file uploads
 */
export const useFilesUploader = (options: UseFileUploaderOptions = {}): UseFileUploaderReturn => {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});
  const [activeUploads, setActiveUploads] = useState<Set<string>>(new Set());
  const chunkUploadControllers = useRef<Record<string, AbortController>>({});
  const uploadOperations = useRef<Record<string, { pause: () => void, resume: () => void }>>({});

  // Extract options with defaults
  const {
    onSuccess,
    onError,
    onProgress,
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    allowedFileTypes = DEFAULT_ALLOWED_TYPES,
    caseId,
    chunkSize = DEFAULT_CHUNK_SIZE,
    resumable = true,
    concurrentUploads = 3
  } = options;

  // Load saved upload states on mount
  useEffect(() => {
    if (resumable) {
      try {
        const savedStates = localStorage.getItem(STORAGE_KEY_UPLOAD_STATES);
        if (savedStates) {
          const parsedStates = JSON.parse(savedStates);
          
          // Filter to only include states that have uploadId and aren't complete
          const validStates = Object.entries(parsedStates).reduce((acc, [key, state]) => {
            const uploadState = state as any;
            if (uploadState.uploadId && uploadState.status !== 'complete') {
              acc[key] = {
                ...uploadState,
                file: new File([], uploadState.fileName, {
                  type: uploadState.fileType
                }),
                uploadDate: new Date(uploadState.uploadDate || Date.now()),
                fileId: key
              };
            }
            return acc;
          }, {} as Record<string, UploadProgress>);
          
          if (Object.keys(validStates).length > 0) {
            setUploadProgress(prev => ({
              ...prev,
              ...validStates
            }));
            
            // Notify user about resumable uploads
            toast.info(
              `You have ${Object.keys(validStates).length} unfinished upload(s)`, 
              {
                action: {
                  label: "Resume All",
                  onClick: () => resumeAllUploads(Object.keys(validStates))
                }
              }
            );
          }
        }
      } catch (error) {
        console.error('Error loading saved upload states:', error);
        // Clear potentially corrupted state
        localStorage.removeItem(STORAGE_KEY_UPLOAD_STATES);
      }
    }
  }, [resumable]);

  // Save upload states when they change
  useEffect(() => {
    if (resumable && Object.keys(uploadProgress).length > 0) {
      // Only save states that have uploadId
      const statesToSave = Object.entries(uploadProgress).reduce((acc, [key, state]) => {
        if (state.uploadId) {
          acc[key] = {
            uploadId: state.uploadId,
            fileName: state.file.name,
            fileType: state.file.type,
            fileSize: state.file.size,
            chunksTotal: state.chunksTotal,
            chunksUploaded: state.chunksUploaded,
            status: state.status,
            progress: state.progress,
            uploadDate: state.uploadDate.toISOString(),
            fileId: state.fileId,
            fileUrl: state.fileUrl,
            serverFileId: state.serverFileId,
            finalFileName: state.finalFileName,
            finalMimeType: state.finalMimeType,
            finalSize: state.finalSize
          };
        }
        return acc;
      }, {} as Record<string, any>);
      
      if (Object.keys(statesToSave).length > 0) {
        localStorage.setItem(STORAGE_KEY_UPLOAD_STATES, JSON.stringify(statesToSave));
      }
    }
  }, [uploadProgress, resumable]);

  // Function to clear all upload states
  const clearUploadStates = useCallback(() => {
    setUploadProgress({});
    localStorage.removeItem(STORAGE_KEY_UPLOAD_STATES);
  }, []);

  // Function to clear a specific upload progress entry
  const clearUploadProgressEntry = useCallback((fileId: string) => {
    setUploadProgress(prev => {
      const updatedProgress = { ...prev };
      delete updatedProgress[fileId];
      
      // Update localStorage if needed
      if (resumable) {
        try {
          const savedStates = localStorage.getItem(STORAGE_KEY_UPLOAD_STATES);
          if (savedStates) {
            const parsedStates = JSON.parse(savedStates);
            delete parsedStates[fileId];
            localStorage.setItem(STORAGE_KEY_UPLOAD_STATES, JSON.stringify(parsedStates));
          }
        } catch (error) {
          console.error('Error updating localStorage:', error);
        }
      }
      
      return updatedProgress;
    });
  }, [resumable]);

  // Validate file before upload
  const validateFile = useCallback((file: File): Error | null => {
    // Size validation
    if (file.size > maxFileSize) {
      return new Error(`File ${file.name} exceeds maximum size of ${Math.round(maxFileSize / (1024 * 1024))}MB`);
    }

    // Type validation (if allowedFileTypes is provided)
    if (allowedFileTypes.length > 0 && !allowedFileTypes.includes(file.type)) {
      return new Error(`File type ${file.type} is not allowed. Allowed types: ${allowedFileTypes.join(', ')}`);
    }

    return null;
  }, [maxFileSize, allowedFileTypes]);

  // Update progress for a specific file
  const updateProgress = useCallback((fileId: string, progressData: Partial<UploadProgress>) => {
    setUploadProgress(prev => {
      const updatedProgress = {
        ...prev,
        [fileId]: {
          ...prev[fileId],
          ...progressData
        }
      };
      
      // Call onProgress callback if provided
      if (onProgress) {
        onProgress(updatedProgress);
      }
      
      return updatedProgress;
    });
  }, [onProgress]);

  // Generate a unique ID for upload
  const generateUploadId = useCallback((file: File) => {
    return `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}`;
  }, []);

  // Split file into chunks
  const splitFileIntoChunks = useCallback((file: File, chunkSize: number) => {
    const chunks: Blob[] = [];
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      chunks.push(file.slice(start, end));
    }
    
    return { chunks, totalChunks };
  }, []);

  // Upload a single chunk
  const uploadChunk = useCallback(async (
    chunk: Blob, 
    index: number, 
    totalChunks: number, 
    file: File, 
    uploadId: string,
    fileId: string
  ) => {
    // Create form data for chunk upload
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('fileName', file.name);
    formData.append('chunkIndex', index.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('uploadId', uploadId);
    
    // Create abort controller for this chunk
    const controller = new AbortController();
    chunkUploadControllers.current[`${fileId}-${index}`] = controller;
    
    try {
      // Mock API call - replace with actual API
      // const response = await fetch('/api/lawyer-lens/files/chunk', {
      //   method: 'POST',
      //   body: formData,
      //   signal: controller.signal
      // });
      
      // if (!response.ok) {
      //   throw new Error(`Failed to upload chunk ${index + 1}/${totalChunks}`);
      // }
      
      // const data = await response.json();
      
      // Simulate API response for now
      await new Promise(resolve => setTimeout(resolve, 500));
      const data = { chunkId: `chunk-${index}`, uploadId };
      
      // Clean up controller reference
      delete chunkUploadControllers.current[`${fileId}-${index}`];
      
      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Upload cancelled');
      }
      throw error;
    }
  }, []);

  // Upload file using chunked approach
  const uploadFileWithChunks = useCallback(async (
    file: File, 
    fileId: string,
    existingUploadId?: string,
    existingUploadedChunks: number[] = []
  ) => {
    try {
      // If upload was already started, use the existing upload ID
      const uploadId = existingUploadId || generateUploadId(file);
      
      // Split file into chunks
      const { chunks, totalChunks } = splitFileIntoChunks(file, chunkSize);
      
      // Update initial state
      updateProgress(fileId, {
        status: 'uploading',
        chunksTotal: totalChunks,
        chunksUploaded: existingUploadedChunks.length,
        uploadId,
        progress: Math.round((existingUploadedChunks.length / totalChunks) * 100)
      });
      
      // Determine which chunks need to be uploaded
      const chunksToUpload = chunks.filter((_, index) => !existingUploadedChunks.includes(index));
      const chunkIndexesToUpload = [...Array(totalChunks).keys()]
        .filter(index => !existingUploadedChunks.includes(index));
      
      // Create a queue of chunk uploads with concurrency limit
      let activeUploads = 0;
      let currentChunkIndex = 0;
      let uploadedChunks = [...existingUploadedChunks];
      let isPaused = false;
      
      // Define pause/resume functions for this upload
      const pause = () => {
        isPaused = true;
        // Abort any active chunk uploads
        chunkIndexesToUpload.forEach(index => {
          const controller = chunkUploadControllers.current[`${fileId}-${index}`];
          if (controller) {
            controller.abort();
            delete chunkUploadControllers.current[`${fileId}-${index}`];
          }
        });
        
        updateProgress(fileId, {
          status: 'paused'
        });
      };
      
      const resume = () => {
        if (isPaused) {
          isPaused = false;
          updateProgress(fileId, {
            status: 'uploading'
          });
          // Restart the upload process
          processQueue();
        }
      };
      
      // Store the operations for external control
      uploadOperations.current[fileId] = { pause, resume };
      
      // Function to process the queue with concurrency control
      const processQueue = async () => {
        if (isPaused) return;
        
        while (activeUploads < concurrentUploads && currentChunkIndex < chunkIndexesToUpload.length) {
          const chunkIndex = chunkIndexesToUpload[currentChunkIndex];
          const chunk = chunks[chunkIndex];
          
          activeUploads++;
          currentChunkIndex++;
          
          // Upload chunk
          uploadChunk(chunk, chunkIndex, totalChunks, file, uploadId, fileId)
            .then(() => {
              if (isPaused) return;
              
              // Update progress
              uploadedChunks.push(chunkIndex);
              updateProgress(fileId, {
                chunksUploaded: uploadedChunks.length,
                progress: Math.round((uploadedChunks.length / totalChunks) * 100)
              });
              
              // Continue processing queue
              activeUploads--;
              processQueue();
              
              // If all chunks are uploaded, complete the upload
              if (uploadedChunks.length === totalChunks) {
                completeUpload();
              }
            })
            .catch(error => {
              if (isPaused) return;
              
              console.error(`Error uploading chunk ${chunkIndex}:`, error);
              
              // Retry logic could be added here
              
              // Continue with other chunks
              activeUploads--;
              processQueue();
            });
        }
      };
      
      // Function to complete the upload after all chunks are uploaded
      const completeUpload = async () => {
        try {
          updateProgress(fileId, {
            status: 'processing',
            progress: 100
          });
          
          // Call API to complete the upload
          // const response = await fetch('/api/lawyer-lens/files/complete-chunked-upload', {
          //   method: 'POST',
          //   headers: {
          //     'Content-Type': 'application/json'
          //   },
          //   body: JSON.stringify({
          //     uploadId,
          //     fileName: file.name,
          //     totalChunks
          //   })
          // });
          
          // if (!response.ok) {
          //   throw new Error('Failed to complete upload');
          // }
          
          // const data = await response.json();
          
          // Simulate API response
          await new Promise(resolve => setTimeout(resolve, 800));
          const data = {
            fileId: `server-${fileId}`,
            fileUrl: `https://example.com/uploads/${file.name}`
          };
          
          // Convert to FileUploadedData format
          const fileData: ExtendedFileUploadedData = {
            id: data.fileId || fileId,
            fileType: file.type.split('/')[0],
            fileUrl: data.fileUrl,
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
            contentTypeHighLevel: [file.type.split('/')[0]],
            uploadAt: new Date(),
            modifiedAt: new Date(),
            status: 'completed',
            userId: 'current-user-id', // This should be replaced with actual user ID
            uploadId
          };
          
          // Update status to complete with final file information
          updateProgress(fileId, {
            status: 'complete',
            fileUrl: data.fileUrl,
            serverFileId: data.fileId || fileId,
            finalFileName: file.name,
            finalMimeType: file.type,
            finalSize: file.size,
            progress: 100
          });
          
          // Clean up references
          delete uploadOperations.current[fileId];
          
          return fileData;
        } catch (error) {
          updateProgress(fileId, {
            status: 'error',
            error: error instanceof Error ? error : new Error(String(error))
          });
          
          // Clean up references
          delete uploadOperations.current[fileId];
          
          throw error;
        }
      };
      
      // Start processing the queue
      processQueue();
      
      // Return a promise that resolves when the upload is complete
      return new Promise<ExtendedFileUploadedData>((resolve, reject) => {
        const checkCompletion = setInterval(() => {
          const progress = uploadProgress[fileId];
          
          if (progress?.status === 'complete') {
            clearInterval(checkCompletion);
            
            // Create a proper FileUploadedData object instead of casting the progress object
            const fileData: ExtendedFileUploadedData = {
              id: progress.serverFileId || fileId,
              fileType: file.type.split('/')[0],
              fileUrl: progress.fileUrl || `https://example.com/uploads/${file.name}`,
              fileName: progress.finalFileName || file.name,
              mimeType: progress.finalMimeType || file.type,
              size: progress.finalSize || file.size,
              contentTypeHighLevel: [file.type.split('/')[0]],
              uploadAt: new Date(),
              modifiedAt: new Date(),
              status: 'completed',
              userId: 'current-user-id',
              uploadId
            };
            
            resolve(fileData);
          } else if (progress?.status === 'error') {
            clearInterval(checkCompletion);
            reject(progress.error || new Error('Upload failed'));
          }
        }, 500);
      });
    } catch (error) {
      console.error('Error uploading file with chunks:', error);
      
      updateProgress(fileId, {
        status: 'error',
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      throw error;
    }
  }, [chunkSize, concurrentUploads, generateUploadId, splitFileIntoChunks, updateProgress, uploadChunk, uploadProgress]);

  // Check for resumable uploads
  const checkResumableUpload = useCallback(async (fileId: string, file: File) => {
    if (!resumable) return null;
    
    try {
      // Try to find an existing upload in local state first
      const existingProgress = uploadProgress[fileId];
      if (existingProgress?.uploadId && existingProgress.status !== 'complete') {
        return {
          uploadId: existingProgress.uploadId,
          completedChunks: Array.from({ length: existingProgress.chunksUploaded || 0 }, (_, i) => i)
        };
      }
      
      // If not found in local state, check with the server
      // In a real implementation, we would call the server API here
      // const response = await fetch(`/api/lawyer-lens/files/resume/${generateUploadId(file)}`);
      // if (response.ok) {
      //   const data = await response.json();
      //   return {
      //     uploadId: data.uploadId,
      //     completedChunks: data.chunksReceived
      //   };
      // }
      
      return null;
    } catch (error) {
      console.error('Error checking resumable upload:', error);
      return null;
    }
  }, [resumable, uploadProgress]);

  // Standard file upload (non-chunked) using storage service
  const uploadFileStandard = useCallback(async (file: File, fileId: string) => {
    try {
      // Initialize storage service
      const storageService = await initializeStorageService();
      
      // Update status to uploading
      updateProgress(fileId, {
        status: 'uploading',
        progress: 0
      });
      
      // Upload file
      const storageOptions = {
        type: 'document' as const,
        maxFileSize,
        allowedFileTypes,
        folder: caseId
      };
      
      // Register a progress handler
      const unsubscribe = storageService.onProgress(event => {
        updateProgress(fileId, { 
          progress: event.progress,
          status: uploadProgress[fileId]?.status === 'error' ? 'error' : 'uploading'
        });
      });
      
      try {
        // Upload the file
        const result = await storageService.uploadFile(file, storageOptions);
        
        // Unsubscribe from progress updates
        unsubscribe();
        
        // Create file record in database
        let fileData: FileUploadedData;
        
        if (caseId) {
          // If caseId is provided, add file to case
          const response = await lawyerLensApi.addFilesToCase(caseId, [{
            id: fileId,
            fileType: file.type.split('/')[0],
            fileUrl: result.url,
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
            contentTypeHighLevel: [],
            uploadAt: new Date(),
            modifiedAt: new Date(),
            status: 'completed',
            userId: 'current-user-id' // This should be replaced with actual user ID
          }]);
          
          fileData = response[0];
        } else {
          // Otherwise, create standalone file record
          // This implementation depends on your API structure
          fileData = {
            id: fileId,
            fileType: file.type.split('/')[0],
            fileUrl: result.url,
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
            contentTypeHighLevel: [],
            uploadAt: new Date(),
            modifiedAt: new Date(),
            status: 'completed',
            userId: 'current-user-id' // This should be replaced with actual user ID
          };
        }
        
        // Update status to complete with final file information
        updateProgress(fileId, {
          status: 'complete',
          progress: 100,
          fileUrl: result.url,
          serverFileId: fileData.id,
          finalFileName: fileData.fileName,
          finalMimeType: fileData.mimeType,
          finalSize: fileData.size,
          contractInfo: fileData.additionalInfo?.contractInfo
        });
        
        return fileData;
      } catch (error) {
        console.error('Error uploading file standard:', error);
        
        // Update status to error
        updateProgress(fileId, {
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error))
        });
        
        throw error;
      }
    } catch (error) {
      console.error('Error uploading file standard:', error);
      
      // Update status to error
      updateProgress(fileId, {
        status: 'error',
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      throw error;
    }
  }, [caseId, updateProgress, uploadProgress]);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]): Promise<FileUploadedData[]> => {
      try {
        const uploadedFiles: FileUploadedData[] = [];
        
        // Create a unique ID for each file
        const fileIds = files.map(file => `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}`);
        
        // Initialize progress tracking for each file
        files.forEach((file, index) => {
          const fileId = fileIds[index];
          setActiveUploads(prev => new Set(prev).add(fileId));
          
          // Add more comprehensive initial state
          updateProgress(fileId, {
            file,
            progress: 0,
            status: 'queued',
            uploadDate: new Date(),
            fileId
          });
        });
        
        // Upload files sequentially or in parallel depending on needs
        // For simplicity, we'll use Promise.all here to upload in parallel
        const uploadPromises = files.map(async (file, index) => {
          const fileId = fileIds[index];
          
          try {
            // Validate file
            const validationError = validateFile(file);
            if (validationError) {
              throw validationError;
            }
            
            // Determine upload method based on file size
            let uploadResult: FileUploadedData;
            
            if (file.size > chunkSize) {
              // Check for resumable upload
              const resumableInfo = await checkResumableUpload(fileId, file);
              
              // Use chunked upload for large files
              uploadResult = await uploadFileWithChunks(
                file, 
                fileId,
                resumableInfo?.uploadId,
                resumableInfo?.completedChunks
              );
            } else {
              // Use standard upload for smaller files
              uploadResult = await uploadFileStandard(file, fileId);
            }
            
            return uploadResult;
          } catch (error) {
            // Update status to error if not already set
            if (uploadProgress[fileId]?.status !== 'error') {
              updateProgress(fileId, {
                status: 'error',
                error: error instanceof Error ? error : new Error(String(error))
              });
            }
            
            // Re-throw to be caught by the outer try/catch
            throw error;
          } finally {
            // Remove from active uploads
            setActiveUploads(prev => {
              const updated = new Set(prev);
              updated.delete(fileId);
              return updated;
            });
          }
        });
        
        // Wait for all uploads to complete or fail
        const results = await Promise.allSettled(uploadPromises);
        
        // Process results
        results.forEach(result => {
          if (result.status === 'fulfilled') {
            uploadedFiles.push(result.value);
          }
        });
        
        // Check if any uploads failed
        const failedUploads = results.filter(result => result.status === 'rejected');
        if (failedUploads.length > 0 && failedUploads.length === files.length) {
          // All uploads failed
          throw new Error('All file uploads failed');
        } else if (failedUploads.length > 0) {
          // Some uploads failed, but not all
          console.warn(`${failedUploads.length} out of ${files.length} uploads failed`);
        }
        
        return uploadedFiles;
      } catch (error) {
        console.error('Error uploading files:', error);
        if (onError) {
          onError(error instanceof Error ? error : new Error(String(error)));
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh file list
      queryClient.invalidateQueries({ queryKey: ['files'] });
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(data);
      }
      
      // Show success toast
      toast.success(`${data.length} file(s) uploaded successfully`);
    },
    onError: (error) => {
      console.error('Upload mutation error:', error);
      
      // Call onError callback if provided
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
      
      // Show error toast
      toast.error(`Upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // Cancel upload
  const cancelUpload = useCallback((fileId: string) => {
    // Check if the file is currently uploading
    if (activeUploads.has(fileId)) {
      // Cancel chunked uploads if any
      Object.keys(chunkUploadControllers.current)
        .filter(key => key.startsWith(`${fileId}-`))
        .forEach(key => {
          const controller = chunkUploadControllers.current[key];
          controller.abort();
          delete chunkUploadControllers.current[key];
        });
      
      // Update progress
      updateProgress(fileId, {
        status: 'error',
        error: new Error('Upload cancelled')
      });
      
      // Remove from active uploads
      setActiveUploads(prev => {
        const updated = new Set(prev);
        updated.delete(fileId);
        return updated;
      });
      
      // Clean up operations
      delete uploadOperations.current[fileId];
    }
  }, [activeUploads, updateProgress]);

  // Pause upload
  const pauseUpload = useCallback((fileId: string) => {
    const operations = uploadOperations.current[fileId];
    if (operations?.pause) {
      operations.pause();
    }
  }, []);

  // Resume upload
  const resumeUpload = useCallback((fileId: string) => {
    const operations = uploadOperations.current[fileId];
    if (operations?.resume) {
      operations.resume();
    }
  }, []);

  // Resume all uploads
  const resumeAllUploads = useCallback((fileIds: string[]) => {
    fileIds.forEach(fileId => {
      const state = uploadProgress[fileId];
      if (state && state.status === 'paused' && state.file) {
        // Need to restart the upload process for this file
        uploadFileWithChunks(
          state.file, 
          fileId, 
          state.uploadId, 
          Array.from({ length: state.chunksUploaded || 0 }, (_, i) => i)
        ).catch(console.error);
      }
    });
  }, [uploadProgress, uploadFileWithChunks]);

  // Return hook API
  return {
    uploadFiles: uploadMutation.mutateAsync,
    cancelUpload,
    pauseUpload,
    resumeUpload,
    isUploading: uploadMutation.isPending || activeUploads.size > 0,
    uploadProgress,
    clearUploadStates,
    clearUploadProgressEntry
  };
};

export default useFilesUploader;

