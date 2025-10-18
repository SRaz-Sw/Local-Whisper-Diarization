# Batch Upload Implementation Plan

## Executive Summary

This document outlines a comprehensive plan to add batch/multiple file upload functionality to the Whisper Diarization application, enabling users to upload multiple audio/video files and have them transcribed sequentially in the background with real-time progress tracking.

**Key Goals:**
- ✅ Minimize code changes to production codebase
- ✅ Maintain existing single-file workflow
- ✅ Add background processing capability
- ✅ Provide clear UI feedback for batch progress
- ✅ Ensure no breaking changes

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [State Management Requirements](#2-state-management-requirements)
3. [Proposed Architecture](#3-proposed-architecture)
4. [Implementation Strategy](#4-implementation-strategy)
5. [UI/UX Design](#5-uiux-design)
6. [Risk Assessment](#6-risk-assessment)
7. [Testing Strategy](#7-testing-strategy)
8. [Rollout Plan](#8-rollout-plan)

---

## 1. Current Architecture Analysis

### 1.1 Upload Flow (Single File)

#### Components Involved:
```
MediaFileUpload.tsx
    ↓
UploadView.tsx → handleClick()
    ↓
Router.tsx (navigate to 'transcribe')
    ↓
TranscribeView.tsx
    ↓
WhisperWorkerService → postMessage({type: 'run', data: {audio, language}})
    ↓
Worker (whisperDiarization.worker.js)
    ↓ (messages back)
Router.tsx (global message handler)
    ↓
useWhisperStore (state updates)
    ↓
TranscribeView.tsx (auto-save on completion)
    ↓
navigate to 'transcript' view
```

#### Key State Management:
- **useWhisperStore** (Zustand):
  - `audio.audio`: Float32Array of processed audio
  - `audio.audioFile`: Original File object
  - `audio.audioFileName`: String
  - `model.status`: 'loading' | 'ready' | 'running' | null
  - `processing.status`: 'idle' | 'running' | 'complete' | 'error'
  - `transcription.result`: TranscriptionResult | null

#### Worker Communication:
```typescript
// Load model
postMessage({ type: 'load', data: { device, model } })

// Run transcription
postMessage({ type: 'run', data: { audio, language } })

// Worker responses
{
  status: 'loading' | 'loaded' | 'transcribing' | 'processing_progress' | 'complete' | 'error',
  data: {...}
}
```

#### Critical Observations:
1. **Single Worker Instance**: One WebWorker handles all transcriptions sequentially
2. **Modal Flow**: User must wait on TranscribeView until completion
3. **Auto-Save**: TranscribeView automatically saves and navigates on completion
4. **State is Global**: Router.tsx has global message handler updating useWhisperStore
5. **File Processing**: MediaFileUpload converts File → ArrayBuffer → Float32Array

### 1.2 Current Limitations

❌ **Single File Only**: Only one file can be processed at a time
❌ **Blocking UI**: User cannot navigate away during transcription
❌ **No Queue**: No mechanism to queue multiple files
❌ **No Background Processing**: Transcription requires active view focus

---

## 2. State Management Requirements

### 2.1 New State Structures

We need to track:
1. **Batch Queue**: List of files waiting to be processed
2. **Current Processing**: Which file is currently transcribing
3. **Completed Jobs**: Successfully transcribed files
4. **Failed Jobs**: Files that encountered errors
5. **Progress per File**: Individual progress tracking

### 2.2 Proposed Zustand Store Extension

Add new slice to `useWhisperStore`:

```typescript
interface BatchState {
  // Queue management
  queue: BatchJob[];
  currentJobId: string | null;
  isProcessingBatch: boolean;

  // Results tracking
  completedJobs: CompletedJob[];
  failedJobs: FailedJob[];
}

interface BatchJob {
  id: string;                    // Unique job ID
  file: File;                    // Original file
  audio: Float32Array;           // Processed audio
  fileName: string;
  language: string;
  model: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;              // 0-100
  addedAt: number;               // Timestamp
}

interface CompletedJob {
  id: string;
  fileName: string;
  transcriptId: string;          // ID in storage
  completedAt: number;
  duration: number;
}

interface FailedJob {
  id: string;
  fileName: string;
  error: string;
  failedAt: number;
}
```

### 2.3 State Actions Needed

```typescript
// Queue management
addToBatchQueue: (job: BatchJob) => void;
removeFromQueue: (jobId: string) => void;
clearQueue: () => void;

// Processing control
startBatchProcessing: () => void;
pauseBatchProcessing: () => void;
resumeBatchProcessing: () => void;
cancelBatchProcessing: () => void;

// Job tracking
updateJobStatus: (jobId: string, status: BatchJob['status']) => void;
updateJobProgress: (jobId: string, progress: number) => void;
markJobCompleted: (jobId: string, transcriptId: string) => void;
markJobFailed: (jobId: string, error: string) => void;

// Cleanup
clearCompletedJobs: () => void;
clearFailedJobs: () => void;
retryFailedJob: (jobId: string) => void;
```

---

## 3. Proposed Architecture

### 3.1 High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                    MediaFileUpload                          │
│  - Accept multiple files (drag & drop, file input)         │
│  - Detect duplicates                                         │
│  - Process files → Float32Array                             │
│  - Add to batch queue                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  BatchProcessingManager                      │
│  (New Service Layer)                                         │
│  - Monitors batch queue                                      │
│  - Processes files sequentially                              │
│  - Handles worker communication                              │
│  - Auto-saves completed transcripts                          │
│  - Updates progress state                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              WhisperWorkerService (Existing)                 │
│  - Unchanged, still processes one file at a time            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  BatchProgressPanel                          │
│  (New UI Component in Sidebar)                               │
│  - Shows current processing file                             │
│  - Shows queue status                                        │
│  - Shows completed/failed jobs                               │
│  - Provides controls (pause, cancel, retry)                  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Key Design Decisions

✅ **Sequential Processing**: Process one file at a time (no parallel workers)
✅ **Background Service**: BatchProcessingManager runs independent of views
✅ **Non-Blocking**: User can navigate freely while batch processes
✅ **Graceful Degradation**: Single-file upload continues to work as before
✅ **Minimal Changes**: Reuse existing worker, transcription logic

---

## 4. Implementation Strategy

### 4.1 Phase 1: State Management (Low Risk)

**File**: `src/app/web-transc/store/useBatchStore.ts` (NEW)

Create a separate Zustand store for batch processing to avoid polluting existing store.

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BatchStore {
  // ... state from section 2.2
}

export const useBatchStore = create<BatchStore>()(
  persist(
    (set, get) => ({
      // Initial state
      queue: [],
      currentJobId: null,
      isProcessingBatch: false,
      completedJobs: [],
      failedJobs: [],

      // Actions implementation
      // ...
    }),
    {
      name: 'whisper-batch-storage',
      partialize: (state) => ({
        // Only persist completed/failed jobs for history
        completedJobs: state.completedJobs,
        failedJobs: state.failedJobs,
      }),
    }
  )
);
```

**Changes Required:**
- ✅ New file, no modifications to existing code
- ✅ Can be developed and tested independently

### 4.2 Phase 2: Batch Processing Manager (Medium Risk)

**File**: `src/app/web-transc/services/BatchProcessingManager.ts` (NEW)

Service layer that manages the batch queue and orchestrates transcription.

```typescript
import { useBatchStore } from '../store/useBatchStore';
import { useWhisperStore } from '../store/useWhisperStore';
import { whisperWorker } from './WhisperWorkerService';
import { useTranscripts } from '../hooks/useTranscripts';

class BatchProcessingManager {
  private isRunning = false;
  private currentJobId: string | null = null;

  /**
   * Start processing the batch queue
   */
  async startProcessing() {
    if (this.isRunning) return;

    this.isRunning = true;
    useBatchStore.getState().isProcessingBatch = true;

    await this.processNextInQueue();
  }

  /**
   * Process next file in queue
   */
  private async processNextInQueue() {
    const { queue } = useBatchStore.getState();

    // Check if queue is empty
    if (queue.length === 0) {
      this.stopProcessing();
      return;
    }

    // Get next queued job
    const nextJob = queue.find(j => j.status === 'queued');
    if (!nextJob) {
      this.stopProcessing();
      return;
    }

    // Start processing
    this.currentJobId = nextJob.id;
    useBatchStore.getState().updateJobStatus(nextJob.id, 'processing');
    useBatchStore.getState().currentJobId = nextJob.id;

    try {
      // Wait for model to be ready
      await this.ensureModelReady(nextJob.model);

      // Run transcription
      await this.runTranscription(nextJob);

      // Save transcript
      const transcriptId = await this.saveTranscript(nextJob);

      // Mark as completed
      useBatchStore.getState().markJobCompleted(nextJob.id, transcriptId);
      useBatchStore.getState().removeFromQueue(nextJob.id);

    } catch (error) {
      // Mark as failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      useBatchStore.getState().markJobFailed(nextJob.id, errorMessage);
      useBatchStore.getState().removeFromQueue(nextJob.id);
    }

    // Process next file
    await this.processNextInQueue();
  }

  /**
   * Ensure model is loaded and ready
   */
  private async ensureModelReady(model: string): Promise<void> {
    const status = useWhisperStore.getState().model.status;
    const currentModel = useWhisperStore.getState().model.model;

    if (status === 'ready' && currentModel === model) {
      return; // Already ready
    }

    // Load model
    return new Promise((resolve, reject) => {
      const unsubscribe = useWhisperStore.subscribe(
        (state) => state.model.status,
        (status) => {
          if (status === 'ready') {
            unsubscribe();
            resolve();
          } else if (status === null) {
            // Error occurred
            unsubscribe();
            reject(new Error('Failed to load model'));
          }
        }
      );

      whisperWorker.postMessage({
        type: 'load',
        data: { device: 'webgpu', model }
      });
    });
  }

  /**
   * Run transcription for a job
   */
  private async runTranscription(job: BatchJob): Promise<TranscriptionResult> {
    return new Promise((resolve, reject) => {
      const unsubscribe = useWhisperStore.subscribe(
        (state) => state.transcription.result,
        (result) => {
          if (result) {
            unsubscribe();
            resolve(result);
          }
        }
      );

      // Subscribe to errors
      const unsubscribeError = useWhisperStore.subscribe(
        (state) => state.processing.status,
        (status) => {
          if (status === 'error') {
            unsubscribeError();
            unsubscribe();
            reject(new Error('Transcription failed'));
          }
        }
      );

      // Start transcription
      whisperWorker.postMessage({
        type: 'run',
        data: { audio: job.audio, language: job.language }
      });
    });
  }

  /**
   * Save completed transcript
   */
  private async saveTranscript(job: BatchJob): Promise<string> {
    const result = useWhisperStore.getState().transcription.result;
    if (!result) throw new Error('No transcription result');

    const { save } = useTranscripts();

    return await save({
      transcript: result.transcript,
      segments: result.segments,
      fileName: job.fileName,
      language: job.language,
      model: job.model,
      audioBlob: job.file,
    });
  }

  /**
   * Stop processing
   */
  stopProcessing() {
    this.isRunning = false;
    this.currentJobId = null;
    useBatchStore.getState().isProcessingBatch = false;
    useBatchStore.getState().currentJobId = null;
  }

  /**
   * Pause processing
   */
  pause() {
    this.isRunning = false;
    useBatchStore.getState().isProcessingBatch = false;
  }

  /**
   * Resume processing
   */
  resume() {
    if (!this.isRunning) {
      this.startProcessing();
    }
  }

  /**
   * Cancel all jobs
   */
  cancel() {
    this.stopProcessing();
    useBatchStore.getState().clearQueue();

    // Recreate worker to cancel current transcription
    whisperWorker.recreate();
  }
}

// Singleton instance
export const batchProcessingManager = new BatchProcessingManager();
```

**Changes Required:**
- ✅ New file, no modifications to existing code
- ⚠️ Integrates with existing WhisperWorkerService
- ⚠️ Reuses existing transcription hooks

**Testing Strategy:**
1. Test with 2-3 small audio files
2. Verify sequential processing
3. Test pause/resume
4. Test error handling
5. Verify auto-save

### 4.3 Phase 3: UI Updates (Medium Risk)

#### 3a. Update MediaFileUpload to Accept Multiple Files

**File**: `src/app/web-transc/components/MediaFileUpload.tsx`

**Changes:**
```typescript
// Add multiple file support to file input
<input
  ref={fileInputRef}
  type="file"
  className="sr-only"
  onChange={handleFileInputChange}
  accept="audio/*,video/*"
  multiple  // ADD THIS
  aria-label="File input"
/>

// Update handleFileInputChange to handle multiple files
const handleFileInputChange = useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    // Check if batch mode is enabled
    if (selectedFiles.length > 1) {
      handleBatchUpload(Array.from(selectedFiles));
    } else {
      // Existing single-file logic
      handleFileSelect(selectedFiles[0] || null);
    }

    if (e.target) e.target.value = "";
  },
  [handleFileSelect, handleBatchUpload],
);

// New batch upload handler
const handleBatchUpload = useCallback(async (files: File[]) => {
  // Show confirmation dialog
  const confirmed = confirm(
    `Add ${files.length} files to batch queue for transcription?`
  );
  if (!confirmed) return;

  // Process each file
  for (const file of files) {
    // Check for duplicates
    const duplicate = findDuplicateByFileName(file.name);
    if (duplicate) {
      toast.warning(`Skipping duplicate: ${file.name}`);
      continue;
    }

    // Validate file type
    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
      toast.error(`Skipping invalid file: ${file.name}`);
      continue;
    }

    // Process file to Float32Array
    const arrayBuffer = await file.arrayBuffer();
    const audio = await processFileToAudio(arrayBuffer);

    // Add to batch queue
    const job: BatchJob = {
      id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      file,
      audio,
      fileName: file.name,
      language: 'en', // Default or from selector
      model: model, // Current selected model
      status: 'queued',
      progress: 0,
      addedAt: Date.now(),
    };

    useBatchStore.getState().addToBatchQueue(job);
  }

  // Start batch processing
  batchProcessingManager.startProcessing();

  toast.success(`Added ${files.length} files to queue`);
}, [findDuplicateByFileName, model]);
```

**Changes Required:**
- ✅ Add `multiple` attribute to file input
- ✅ Add batch upload handler
- ⚠️ Preserve existing single-file behavior
- ✅ Integrate with duplicate detection

#### 3b. Create BatchProgressPanel Component

**File**: `src/components/home-sidebar/BatchProgressPanel.tsx` (NEW)

```typescript
"use client";

import { useState } from "react";
import { useBatchStore } from "@/app/web-transc/store/useBatchStore";
import { batchProcessingManager } from "@/app/web-transc/services/BatchProcessingManager";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  PlayIcon,
  PauseIcon,
  XIcon,
  CheckIcon,
  AlertCircleIcon,
  FileAudioIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

export function BatchProgressPanel() {
  const {
    queue,
    currentJobId,
    isProcessingBatch,
    completedJobs,
    failedJobs
  } = useBatchStore();

  // Don't render if no activity
  if (queue.length === 0 && completedJobs.length === 0 && failedJobs.length === 0) {
    return null;
  }

  const currentJob = queue.find(j => j.id === currentJobId);
  const queuedJobs = queue.filter(j => j.status === 'queued');

  return (
    <SidebarGroup className="border-t">
      <SidebarGroupLabel className="flex items-center justify-between">
        <span>Batch Processing</span>
        <div className="flex gap-1">
          {isProcessingBatch ? (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => batchProcessingManager.pause()}
              className="h-6 w-6"
            >
              <PauseIcon className="h-3 w-3" />
            </Button>
          ) : queue.length > 0 ? (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => batchProcessingManager.resume()}
              className="h-6 w-6"
            >
              <PlayIcon className="h-3 w-3" />
            </Button>
          ) : null}

          <Button
            size="icon"
            variant="ghost"
            onClick={() => batchProcessingManager.cancel()}
            className="h-6 w-6"
          >
            <XIcon className="h-3 w-3" />
          </Button>
        </div>
      </SidebarGroupLabel>

      <SidebarGroupContent className="space-y-2 px-2">
        {/* Current Processing */}
        {currentJob && (
          <div className="rounded-md border bg-muted/50 p-2">
            <div className="flex items-center gap-2 mb-1">
              <FileAudioIcon className="h-3 w-3 text-primary animate-pulse" />
              <span className="text-xs font-medium truncate flex-1">
                {currentJob.fileName}
              </span>
            </div>
            <Progress value={currentJob.progress} className="h-1" />
            <p className="text-[0.65rem] text-muted-foreground mt-1">
              Processing... {currentJob.progress.toFixed(0)}%
            </p>
          </div>
        )}

        {/* Queue */}
        {queuedJobs.length > 0 && (
          <div className="space-y-1">
            <p className="text-[0.65rem] text-muted-foreground">
              In queue: {queuedJobs.length}
            </p>
            {queuedJobs.slice(0, 3).map(job => (
              <div
                key={job.id}
                className="flex items-center gap-2 text-xs truncate"
              >
                <FileAudioIcon className="h-3 w-3 text-muted-foreground" />
                <span className="truncate">{job.fileName}</span>
              </div>
            ))}
            {queuedJobs.length > 3 && (
              <p className="text-[0.65rem] text-muted-foreground">
                +{queuedJobs.length - 3} more...
              </p>
            )}
          </div>
        )}

        {/* Completed */}
        {completedJobs.length > 0 && (
          <div className="space-y-1">
            <p className="text-[0.65rem] text-muted-foreground flex items-center gap-1">
              <CheckIcon className="h-3 w-3 text-green-500" />
              Completed: {completedJobs.length}
            </p>
          </div>
        )}

        {/* Failed */}
        {failedJobs.length > 0 && (
          <div className="space-y-1">
            <p className="text-[0.65rem] text-muted-foreground flex items-center gap-1">
              <AlertCircleIcon className="h-3 w-3 text-red-500" />
              Failed: {failedJobs.length}
            </p>
            {failedJobs.slice(0, 2).map(job => (
              <div
                key={job.id}
                className="flex items-center gap-2 text-xs truncate"
              >
                <span className="truncate text-red-500">{job.fileName}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => useBatchStore.getState().retryFailedJob(job.id)}
                  className="h-4 text-[0.65rem]"
                >
                  Retry
                </Button>
              </div>
            ))}
          </div>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
```

**Changes Required:**
- ✅ New component, no modifications to existing code
- ✅ Displays at bottom of sidebar
- ✅ Shows real-time progress
- ✅ Provides controls

#### 3c. Integrate BatchProgressPanel into Sidebar

**File**: `src/components/home-sidebar/HomeSidebar.tsx`

**Changes:**
```typescript
import { BatchProgressPanel } from './BatchProgressPanel';

// Add to sidebar structure (at the bottom, before BottomSection)
<BatchProgressPanel />
```

**Changes Required:**
- ⚠️ Minimal change to existing file
- ✅ Just add one import and one component

### 4.4 Phase 4: Router Integration (Low Risk)

**File**: `src/app/web-transc/router/Router.tsx`

**Changes:**
Update global worker message handler to sync progress with batch store:

```typescript
case 'processing_progress':
  // Existing code
  useWhisperStore.getState().setProcessedSeconds(e.data.processedSeconds || 0);
  useWhisperStore.getState().setTotalSeconds(e.data.totalSeconds || 0);
  useWhisperStore.getState().setEstimatedTimeRemaining(e.data.estimatedTimeRemaining || null);

  // NEW: Update batch job progress if processing batch
  const currentJobId = useBatchStore.getState().currentJobId;
  if (currentJobId && e.data.totalSeconds > 0) {
    const progress = (e.data.processedSeconds / e.data.totalSeconds) * 100;
    useBatchStore.getState().updateJobProgress(currentJobId, progress);
  }
  break;
```

**Changes Required:**
- ⚠️ Minimal change to Router.tsx
- ✅ Just add batch progress syncing
- ✅ Doesn't affect single-file flow

---

## 5. UI/UX Design

### 5.1 Upload Experience

**Single File (Existing):**
```
[Drag & Drop Area]
└─ Click or drag one file
   └─ Processes immediately
      └─ Navigates to TranscribeView
```

**Multiple Files (New):**
```
[Drag & Drop Area - Now accepts multiple]
└─ Select multiple files via file picker OR drag multiple files
   └─ Shows confirmation: "Add 5 files to batch queue?"
      ├─ Cancel: Abort
      └─ Confirm: Add to queue, start batch processing
         └─ User stays on current view
            └─ Bottom of sidebar shows progress panel
```

### 5.2 Batch Progress Panel (Sidebar Bottom)

```
┌────────────────────────────────────┐
│ Batch Processing        ⏸ ✕       │
├────────────────────────────────────┤
│ ●● recording-1.mp3                 │
│ ████████░░░░░░░░ 65%              │
│ Processing...                      │
├────────────────────────────────────┤
│ In queue: 3                        │
│ ○ recording-2.mp3                  │
│ ○ recording-3.mp3                  │
│ ○ recording-4.mp3                  │
├────────────────────────────────────┤
│ ✓ Completed: 2                     │
│ ⚠ Failed: 1                        │
│   recording-0.mp3 [Retry]          │
└────────────────────────────────────┘
```

**Features:**
- ⏸ Pause: Pause batch processing (finish current file first)
- ▶ Resume: Resume batch processing
- ✕ Cancel: Cancel all remaining jobs
- Real-time progress bar for current file
- List of queued files (show max 3, then "+N more")
- Completed count
- Failed jobs with retry button
- Compact design (fits in sidebar)

### 5.3 Notifications

**Toast Messages:**
- ✅ "Added 5 files to queue"
- ✅ "Batch processing completed (4 succeeded, 1 failed)"
- ⚠ "Skipping duplicate: recording.mp3"
- ⚠ "Skipping invalid file: document.pdf"
- ❌ "Failed to transcribe recording.mp3: [error]"

### 5.4 User Controls

**Pause:**
- Finish current file
- Stop picking next from queue
- Allow resume

**Cancel:**
- Stop current transcription (recreate worker)
- Clear queue
- Show confirmation dialog

**Retry Failed:**
- Re-add failed job to queue
- Start processing again

---

## 6. Risk Assessment

### 6.1 High Risk Areas

❌ **Worker State Conflicts**
- **Risk**: Batch manager and manual navigation both using same worker
- **Mitigation**: Check `isProcessingBatch` before allowing manual transcription
- **Fallback**: Show warning if user tries to upload during batch

❌ **Memory Issues**
- **Risk**: Loading many large files into memory (Float32Array)
- **Mitigation**: Process files on-demand, don't preload all
- **Fallback**: Limit queue size to 10 files

❌ **Navigation During Processing**
- **Risk**: User navigates to TranscribeView during batch processing
- **Mitigation**: TranscribeView checks `isProcessingBatch` and shows warning
- **Fallback**: Pause batch when user wants to do manual transcription

### 6.2 Medium Risk Areas

⚠️ **State Synchronization**
- **Risk**: Batch store and whisper store out of sync
- **Mitigation**: Centralize worker message handling in Router
- **Testing**: Verify progress updates correctly

⚠️ **Auto-Save Failures**
- **Risk**: Transcription succeeds but save fails
- **Mitigation**: Mark job as failed, allow retry
- **Testing**: Test with storage errors

⚠️ **Browser Refresh**
- **Risk**: Lose batch queue on refresh
- **Mitigation**: Persist queue to localStorage
- **Fallback**: Show warning before refresh if processing

### 6.3 Low Risk Areas

✅ **UI Rendering**
- New components, no changes to existing UI
- Easy to test and iterate

✅ **Duplicate Detection**
- Already implemented, just reuse

---

## 7. Testing Strategy

### 7.1 Unit Tests

**BatchProcessingManager:**
- ✅ Queue management (add, remove, clear)
- ✅ Sequential processing
- ✅ Pause/resume
- ✅ Error handling
- ✅ Auto-save

**useBatchStore:**
- ✅ State updates
- ✅ Persistence
- ✅ Action correctness

### 7.2 Integration Tests

**End-to-End:**
1. Upload 3 small audio files
2. Verify sequential processing
3. Verify auto-save for each
4. Verify UI updates in sidebar
5. Test pause/resume
6. Test cancel
7. Test failed job retry

**Edge Cases:**
1. Upload during active batch
2. Navigate away during batch
3. Browser refresh during batch
4. Upload duplicate during batch
5. Upload invalid file during batch
6. All files fail
7. Mixed success/failure

### 7.3 Performance Tests

**Metrics:**
- Queue processing time (3 files)
- Memory usage (10 files in queue)
- UI responsiveness during processing
- Worker recreation time

**Targets:**
- < 500ms to add file to queue
- < 100MB memory overhead for 10 files
- No UI freezing
- < 2s worker recreation

---

## 8. Rollout Plan

### 8.1 Development Phases

**Phase 1: Foundation (Week 1)**
- ✅ Create `useBatchStore`
- ✅ Create `BatchProcessingManager` (core logic)
- ✅ Unit tests
- **Risk**: Low

**Phase 2: UI Components (Week 1)**
- ✅ Create `BatchProgressPanel`
- ✅ Update `MediaFileUpload` for multiple files
- ✅ Integrate into sidebar
- **Risk**: Low

**Phase 3: Integration (Week 2)**
- ✅ Wire up manager to worker
- ✅ Add progress sync to Router
- ✅ End-to-end testing
- **Risk**: Medium

**Phase 4: Polish (Week 2)**
- ✅ Error handling
- ✅ Notifications
- ✅ Edge case fixes
- **Risk**: Low

### 8.2 Feature Flags

Add feature flag to enable/disable batch upload:

```typescript
// config/features.ts
export const FEATURES = {
  BATCH_UPLOAD: process.env.NEXT_PUBLIC_ENABLE_BATCH_UPLOAD === 'true',
};

// Usage
{FEATURES.BATCH_UPLOAD && (
  <input multiple />
)}
```

### 8.3 Gradual Rollout

1. **Internal Testing**: Enable for dev environment only
2. **Beta Testing**: Enable for select users
3. **Full Release**: Enable for all users

### 8.4 Rollback Plan

If critical issues found:
1. Disable feature flag
2. Hide `BatchProgressPanel`
3. Remove `multiple` attribute from file input
4. Batch logic remains dormant, single-file works as before

**Rollback Time**: < 5 minutes

---

## 9. Success Metrics

### 9.1 Functionality Metrics

- ✅ Batch processing completes successfully
- ✅ Auto-save works for all files
- ✅ Pause/resume works correctly
- ✅ Error handling works
- ✅ No breaking changes to single-file upload

### 9.2 Performance Metrics

- ⚡ < 500ms to queue a file
- ⚡ No UI freezing during processing
- ⚡ Memory usage < 100MB for 10-file queue

### 9.3 User Experience Metrics

- 😊 Users can upload multiple files easily
- 😊 Clear progress feedback
- 😊 Non-blocking experience
- 😊 Graceful error handling

---

## 10. Future Enhancements

### 10.1 Phase 2 Features (Post-MVP)

**Priority Queue:**
- Allow reordering files in queue
- Priority levels (high, normal, low)

**Parallel Processing:**
- Multiple workers for parallel transcription
- Configurable max parallel jobs

**Scheduled Processing:**
- Queue files, start at specific time
- Useful for overnight batch jobs

**Cloud Export:**
- Auto-upload completed transcripts to cloud storage
- Integration with Dropbox, Google Drive

**Advanced Filters:**
- Auto-apply language detection
- Auto-apply custom speaker names
- Folder-based organization

### 10.2 Advanced Features

**Retry Strategies:**
- Auto-retry on failure (max 3 attempts)
- Different model fallback

**Reporting:**
- Export batch results as CSV
- Processing time analytics
- Success/failure statistics

**Notifications:**
- Desktop notifications when batch completes
- Email notifications (if cloud backend)

---

## Conclusion

This implementation plan provides a comprehensive, low-risk approach to adding batch upload functionality to the Whisper Diarization app. By:

1. **Creating new code** (useBatchStore, BatchProcessingManager, BatchProgressPanel)
2. **Minimal changes** to existing production code
3. **Preserving existing behavior** (single-file upload unchanged)
4. **Clear rollback plan** (feature flag)
5. **Comprehensive testing strategy**

We can deliver a robust batch processing feature that enhances user productivity without compromising stability.

**Estimated Timeline**: 2 weeks
**Lines of Code**: ~1,500 new, ~50 modified
**Breaking Changes**: 0
**Risk Level**: Medium (manageable with proper testing)

---

## Appendix A: File Changes Summary

### New Files (6)
1. `src/app/web-transc/store/useBatchStore.ts` (~200 lines)
2. `src/app/web-transc/services/BatchProcessingManager.ts` (~400 lines)
3. `src/components/home-sidebar/BatchProgressPanel.tsx` (~200 lines)
4. `src/app/web-transc/hooks/useBatchProcessing.ts` (~100 lines)
5. `src/app/web-transc/types/batch.ts` (~50 lines)
6. `config/features.ts` (~10 lines)

### Modified Files (3)
1. `src/app/web-transc/components/MediaFileUpload.tsx` (+~100 lines)
   - Add `multiple` attribute
   - Add batch upload handler

2. `src/app/web-transc/router/Router.tsx` (+~20 lines)
   - Add batch progress sync

3. `src/components/home-sidebar/HomeSidebar.tsx` (+~5 lines)
   - Add BatchProgressPanel component

**Total**: ~1,085 new lines, ~125 modified lines

---

## Appendix B: API Reference

### useBatchStore API

```typescript
// State
interface BatchState {
  queue: BatchJob[];
  currentJobId: string | null;
  isProcessingBatch: boolean;
  completedJobs: CompletedJob[];
  failedJobs: FailedJob[];
}

// Actions
addToBatchQueue(job: BatchJob): void
removeFromQueue(jobId: string): void
clearQueue(): void
updateJobStatus(jobId: string, status: BatchJob['status']): void
updateJobProgress(jobId: string, progress: number): void
markJobCompleted(jobId: string, transcriptId: string): void
markJobFailed(jobId: string, error: string): void
retryFailedJob(jobId: string): void
clearCompletedJobs(): void
clearFailedJobs(): void
```

### BatchProcessingManager API

```typescript
class BatchProcessingManager {
  startProcessing(): Promise<void>
  pause(): void
  resume(): void
  cancel(): void

  // Read-only state
  isRunning: boolean
  currentJobId: string | null
}

// Singleton
export const batchProcessingManager: BatchProcessingManager
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-18
**Author**: AI Assistant (Claude)
**Status**: Ready for Review
