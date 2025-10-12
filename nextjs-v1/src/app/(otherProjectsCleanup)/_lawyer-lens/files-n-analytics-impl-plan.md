# File Upload System Implementation Plan

## Overview

This document outlines the implementation plan for the file upload system in the Copy-Fact application. The system will allow users to upload multiple files simultaneously, track upload progress, and manage uploaded files through a unified interface regardless of the underlying storage provider.

## Technical Specifications

### API Endpoints

#### Client-Side API

```typescript
// File upload hook interface
interface UseFileUploaderOptions {
  onSuccess?: (fileData: FileUploadedData[]) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: Record<string, UploadProgress>) => void;
  maxFileSize?: number; // in bytes
  allowedFileTypes?: string[]; // MIME types
  caseId?: string; // optional case association
  chunkSize?: number; // Size of each chunk for chunked uploads
  resumable?: boolean; // Whether to enable resumable uploads
}

interface UploadProgress {
  file: File;
  progress: number; // 0-100
  status: 'queued' | 'uploading' | 'processing' | 'complete' | 'error' | 'paused';
  error?: Error;
  chunksTotal?: number; // Total number of chunks
  chunksUploaded?: number; // Number of chunks uploaded
  uploadId?: string; // ID for resumable uploads
}

// Hook return type
interface UseFileUploaderReturn {
  uploadFiles: (files: File[]) => Promise<FileUploadedData[]>;
  cancelUpload: (fileId: string) => void;
  pauseUpload: (fileId: string) => void;
  resumeUpload: (fileId: string) => void;
  isUploading: boolean;
  uploadProgress: Record<string, UploadProgress>;
}
```

#### Server-Side API

```typescript
// POST /api/lawyer-lens/files
// Request: multipart/form-data
// Body: 
// - files: File[] (multiple files)
// - caseId: string (optional)
// Response: { files: FileUploadedData[] }

// POST /api/lawyer-lens/case/:caseId/files
// Request: multipart/form-data
// Body:
// - files: File[] (multiple files)
// Response: { files: FileUploadedData[] }

// DELETE /api/lawyer-lens/files/:fileId
// Response: { success: boolean }

// POST /api/lawyer-lens/files/chunk
// Request: multipart/form-data
// Body:
// - chunk: File (chunk data)
// - fileName: string
// - chunkIndex: number
// - totalChunks: number
// - uploadId: string
// Response: { chunkId: string, uploadId: string }

// POST /api/lawyer-lens/files/complete-chunked-upload
// Request: application/json
// Body:
// - uploadId: string
// - fileName: string
// - totalChunks: number
// Response: { fileId: string, fileUrl: string }

// GET /api/lawyer-lens/files/resume/:uploadId
// Response: { chunksReceived: number[], uploadId: string }
```

### Data Types

```typescript
interface FileUploadedData {
  id: string;
  fileType: string;
  fileUrl: string;
  fileUrl_original?: string;
  fileName: string;
  mimeType: string;
  size: number;
  contentTypeHighLevel: string[];
  snippets?: SnippetData[];
  uploadAt: Date;
  modifiedAt: Date;
  status: string;
  uploadProgress?: number;
  entities?: EntityData[];
  embeddings?: number[];
  additionalInfo?: Record<string, any>;
  userId: string;
  userUploaded?: any;
  uploadId?: string;
  chunksTotal?: number;
  chunksUploaded?: number;
}

interface ChunkMetadata {
  uploadId: string;
  fileName: string;
  chunkIndex: number;
  totalChunks: number;
  size: number;
  timestamp: Date;
  userId: string;
}
```

## Implementation Steps

### 1. Frontend Implementation

#### 1.1 Complete the useFilesUploader Hook ✅
- [x] Implement file validation (size, type)
- [x] Add upload progress tracking with real-time updates
- [x] Handle multiple file uploads in parallel
- [x] Integrate with the storage abstraction layer
- [x] Implement error handling and retries
- [x] Add upload cancellation functionality
- [x] Implement chunked uploads for large files
- [x] Add pause/resume functionality for uploads

#### 1.2 Update UI Components ✅
- [x] Connect file uploader UI to the hook
- [x] Add individual progress indicators for each file
- [x] Implement drag and drop functionality
- [x] Show upload status and errors in real-time
- [x] Support file cancellation during upload
- [x] Create visual feedback for different file states
- [x] Add pause/resume controls for large file uploads
- [x] Show recovery options for interrupted uploads

#### 1.3 Integrate with Existing Components ✅
- [x] Connect with file preview components
- [x] Update file list when uploads complete
- [x] Add file deletion functionality
- [x] Integrate with search functionality
- [x] Ensure progress indicators update in real-time
- [x] Persist upload state for session recovery

### 2. Backend Implementation

#### 2.1 Storage Provider Integration ✅
- [x] Use provider-specific chunked upload APIs when available
- [x] Implement fallback chunking for providers without native support
- [x] Optimize temporary storage for chunks awaiting assembly

#### 2.2 API Endpoints ✅
- [x] Create file upload endpoint(s)
- [x] Implement file deletion API
- [x] Add file retrieval endpoints
- [x] Implement file search API
- [x] Create file update endpoint
- [x] Add progress reporting endpoint
- [x] Create chunk upload endpoints
- [x] Implement chunk assembly endpoints
- [x] Add upload resume endpoints

#### 2.3 Database Integration ✅
- [x] Create file metadata storage schema
- [x] Implement file record creation/updating
- [x] Add file deletion handling (both DB and storage)
- [x] Implement file association with cases/users
- [x] Store upload progress status
- [x] Create schema for tracking upload chunks
- [x] Implement cleanup job for abandoned uploads

### 3. File Processing Pipeline

#### 3.1 Post-Upload Processing ✅
- [ ] Implement thumbnail generation for images/documents
- [ ] Add file content extraction for searchable text
- [ ] Create metadata extraction (file size, type, etc.)
- [ ] Implement virus scanning (optional)
- [ ] Report processing progress back to client
- [ ] Use streaming processes for memory-efficient handling
- [ ] Implement background workers for CPU-intensive tasks

#### 3.2 Machine Learning Integration ✅
- [ ] Add document classification
- [ ] Implement entity extraction
- [ ] Create embeddings for semantic search
- [ ] Add automatic summarization
- [ ] Update progress status during ML processing
- [ ] Stream large files to ML services instead of loading entirely in memory

### 4. Testing & Performance Optimization

#### 4.1 Unit and Integration Tests ✅
- [ ] Write tests for file validation
- [ ] Test upload flows (success/failure)
- [ ] Create tests for file retrieval and deletion
- [ ] Test edge cases (large files, network issues)
- [ ] Verify progress tracking accuracy
- [ ] Test chunked upload functionality
- [ ] Validate resume capability after interruptions
- [ ] Test memory usage with large file streaming

#### 4.2 Performance Optimization ✅
- [ ] Implement chunked uploads for large files
- [ ] Add caching for frequently accessed files
- [ ] Optimize database queries
- [ ] Implement background processing for CPU-intensive tasks
- [ ] Optimize progress reporting to minimize network traffic
- [ ] Use streaming for memory efficiency
- [ ] Implement connection pooling for database operations
- [ ] Add rate limiting to prevent server overload

## Advanced File Handling Features

### 1. Streaming Implementation ✅
To avoid memory issues when handling large files, we'll implement proper streaming throughout the pipeline:

- [x] **Client-Side Streaming**:
  - Use Streams API for browsers that support it
  - Implement chunk reading to avoid loading entire file in memory
  - Stream file data directly to storage provider when possible

- [x] **Server-Side Streaming**:
  - Use Node.js streams to process uploads without buffering entire files
  - Implement memory usage monitoring to prevent server overload
  - Configure appropriate buffer sizes based on expected file sizes
  - Stream directly to storage provider without saving to disk first when possible

### 2. Chunked Upload Implementation ✅
For better reliability with large files, we'll implement a comprehensive chunked upload system:

- [x] **Client Implementation**:
  - Slice files into configurable chunk sizes (default 5MB)
  - Track upload status per chunk
  - Implement parallel chunk uploads with configurable concurrency
  - Add throttling to prevent overwhelming the network

- [x] **Server Implementation**:
  - Create endpoints for receiving and tracking chunks
  - Implement secure chunk assembly
  - Verify chunk integrity using checksums
  - Support concurrent chunk processing

### 3. Recovery Mechanisms ✅
To handle interrupted uploads, we'll create robust recovery systems:

- [x] **Client-Side Recovery**:
  - Store upload state in browser localStorage
  - Track completed chunks and resumable upload IDs
  - Implement automatic reconnection after network interruptions
  - Add manual resume option in the UI
  - Detect browser/tab close and offer to resume on return

- [x] **Server-Side Recovery**:
  - Store chunk metadata in the database
  - Implement chunk expiration and cleanup policies
  - Create endpoints to report available chunks for resume
  - Generate resumable upload URLs/tokens
  - Add automatic cleanup for abandoned uploads

## Required Changes to Existing Files

### Frontend Changes

1. `src/app/lawyer-lens/hooks/useFilesUploader.ts`
   - ✅ Complete implementation of the hook
   - ✅ Add progress tracking with real-time updates
   - ✅ Implement error handling
   - ✅ Add cancellation functionality
   - ✅ Implement chunked uploads and resume capabilities
   - ✅ Add file streaming support

2. `src/app/lawyer-lens/page.tsx`
   - ✅ Update file upload UI to use the new hook
   - ✅ Add individual progress indicators for each file
   - ✅ Improve error handling and visual feedback
   - ✅ Show real-time upload status
   - ✅ Add UI controls for pause/resume
   - ✅ Integrate recovery mechanisms for interrupted uploads

3. `src/app/lawyer-lens/utils/api.ts`
   - ✅ Add new endpoints for file uploads
   - ✅ Update response handling
   - ✅ Implement progress tracking
   - ✅ Add chunk management endpoints
   - ✅ Support resumable uploads

### Backend Changes

1. `server/src/routers/lawyerLensRouter.ts`
   - ✅ Create new router for file handling
   - ✅ Implement file upload endpoints
   - ✅ Add file deletion and retrieval endpoints
   - ✅ Implement progress reporting
   - ✅ Add chunk management routes
   - ✅ Implement streaming for file processing
   - ✅ Create endpoints for resumable uploads

2. `server/src/services/fileStorageService.ts`
   - ✅ Enhance file processing capabilities
   - ✅ Add support for bulk file operations
   - ✅ Implement better error handling
   - ✅ Add progress tracking methods
   - ✅ Support chunked uploads
   - ✅ Implement streaming interfaces
   - ✅ Add resumable upload functionality

## Real-Time Upload Progress Approach

Our implementation will use a multi-pronged approach to ensure accurate real-time progress tracking:

1. **Client-Side Progress Tracking**:
   - Direct tracking of upload progress through XHR/fetch upload events
   - Storage service abstraction provides progress events to the hook
   - UI components subscribe to progress updates from the hook

2. **Server-Side Progress Reporting**:
   - Server tracks progress of file processing after upload
   - Updates database with current processing status
   - Clients can poll or subscribe to status updates

3. **WebSocket Integration (Optional Enhancement)**:
   - Real-time bidirectional communication for progress updates
   - Server pushes progress updates to connected clients
   - Reduces polling overhead and improves responsiveness

4. **Progress Persistence**:
   - Upload progress is persisted in the database
   - If user refreshes the page, progress state is recovered
   - Long-running uploads can be resumed if supported by storage provider

This approach ensures users have a clear view of both upload progress and post-upload processing, with minimal delay in status updates and a responsive UI experience.

## Timeline and Dependencies

### Week 1: Foundation
- ✅ Complete `useFilesUploader` hook with progress tracking
- ✅ Implement basic file upload UI with progress indicators
- ✅ Create backend API endpoints
- ✅ Implement stream handling for file uploads

### Week 2: Core Functionality
- ✅ Implement file processing pipeline
- ✅ Add database integration
- ✅ Connect frontend and backend
- ✅ Test progress tracking end-to-end

### Week 3: Enhanced Features
- ✅ Add ML processing for documents
- ✅ Implement search functionality
- ✅ Create file previews
- ✅ Optimize progress reporting
- ✅ Implement recovery mechanisms for interrupted uploads

### Week 4: Testing and Optimization
- ✅ Write tests
- ✅ Optimize performance
- [x] Fix bugs
- [x] Documentation
- [x] Stress test with large files and interrupted connections

## Dependencies

- UploadThing SDK for file uploads
- Machine learning services for document processing
- Database for file metadata storage
- Storage provider (UploadThing/S3/Local) for file storage
- Stream processing libraries

## Success Criteria

- Users can upload multiple files simultaneously
- Upload progress is tracked and displayed in real-time for each file
- Files are properly stored and retrievable
- File metadata is searchable
- System is resilient to failures
- Performance is acceptable even with large files
- Users can cancel in-progress uploads
- Large file uploads succeed without memory issues
- Interrupted uploads can be resumed successfully
