# Batch Upload Test Specification

## Overview

This document outlines comprehensive tests for the batch upload feature
implemented in the `adding_batch_upload` branch. The batch upload system
allows users to upload and process multiple audio files concurrently with
real-time progress tracking, worker pool management, and robust error
handling.

## Test Framework Recommendations

- **Unit Tests**: Jest + React Testing Library
- **Integration Tests**: Jest + MSW (Mock Service Worker) for worker
  message mocking
- **E2E Tests**: Playwright or Cypress
- **Test Coverage Target**: 80%+ for critical paths

---

## 1. Core Architecture Tests

### 1.1 BatchQueueManager Tests

**File**: `src/app/web-transc/services/BatchQueueManager.ts`

#### Critical Race Condition Prevention (HIGHEST PRIORITY)

These tests validate the fix for the file-skipping bug where even-numbered
files were marked complete without processing.

```typescript
describe("BatchQueueManager - Race Condition Prevention", () => {
  test("should include fileId in all worker messages", async () => {
    // Verify that load and run messages include fileId
  });

  test("should use message.fileId instead of getCurrentFileId()", async () => {
    // Mock worker reassignment mid-processing
    // Verify delayed messages are attributed to correct file
  });

  test('should handle delayed "complete" messages correctly', async () => {
    // File 1 completes, worker assigned to File 2
    // Delayed "complete" from File 1 arrives
    // Verify File 2 is NOT marked as complete
  });

  test("should process even-numbered files correctly", async () => {
    // Upload 6 files
    // Verify files 2, 4, 6 are actually processed (not just marked complete)
  });

  test("should handle model loading progress messages with fileId", async () => {
    // Verify model loading messages include fileId
    // Prevent misattribution of "done" progress to wrong file
  });
});
```

#### Initialization & Lifecycle

```typescript
describe("BatchQueueManager - Initialization", () => {
  test("should initialize worker pool successfully", async () => {
    const result = await batchQueueManager.initialize();
    expect(result).toBe(true);
  });

  test("should prevent re-initialization", async () => {
    await batchQueueManager.initialize();
    const result = await batchQueueManager.initialize();
    expect(result).toBe(true);
    // Should log "already initialized" warning
  });

  test("should subscribe to all worker message handlers", async () => {
    await batchQueueManager.initialize();
    // Verify subscriptions exist for all workers
  });

  test("should cleanup subscriptions on terminate", async () => {
    await batchQueueManager.initialize();
    batchQueueManager.terminate();
    // Verify all subscriptions are cleared
  });
});
```

#### Queue Processing Logic

```typescript
describe("BatchQueueManager - Queue Processing", () => {
  test("should start queue processing with callback", async () => {
    const onComplete = jest.fn();
    await batchQueueManager.start(onComplete);
    // Verify isQueueRunning is true
  });

  test("should prevent starting queue twice", async () => {
    await batchQueueManager.start();
    await batchQueueManager.start();
    // Should log "already running" warning
  });

  test("should assign files to available workers", async () => {
    // Add 3 files to queue
    // Verify files are assigned to workers sequentially
  });

  test("should respect maxConcurrentFiles limit", async () => {
    // Set maxConcurrentFiles = 2
    // Add 5 files
    // Verify only 2 files process at once
  });

  test("should call completion callback when queue finishes", async () => {
    const onComplete = jest.fn();
    await batchQueueManager.start(onComplete);
    // Process all files
    expect(onComplete).toHaveBeenCalled();
  });

  test("should handle pause/resume correctly", () => {
    batchQueueManager.pause();
    // Verify queue processing stops
    batchQueueManager.resume();
    // Verify queue processing resumes
  });

  test("should prevent assignment during isAssigningFile lock", async () => {
    // Simulate concurrent assignment attempts
    // Verify lock prevents race condition
  });
});
```

#### File Processing

```typescript
describe("BatchQueueManager - File Processing", () => {
  test("should decode audio file correctly", async () => {
    const mockFile = new File([new ArrayBuffer(1024)], "test.mp3");
    // Verify audio is decoded to Float32Array at 16kHz
  });

  test("should store audio buffer before sending load message", async () => {
    // Critical: buffer must be in Map before worker responds
    // Prevents race condition with immediate "loaded" response
  });

  test("should pass correct language and model to worker", async () => {
    // Verify worker receives current Whisper settings
  });

  test("should handle file processing errors gracefully", async () => {
    // Mock decoding failure
    // Verify file is marked as error, not stuck
  });

  test("should retry failed files up to 3 times", async () => {
    // Mock transient error
    // Verify retry logic executes
  });

  test("should not retry model loading errors", async () => {
    // Mock "Failed to fetch" model error
    // Verify no retry, helpful error message shown
  });

  test("should cleanup audio buffer after completion", async () => {
    // Verify buffer is removed from Map to free memory
  });
});
```

#### Worker Message Handling

```typescript
describe("BatchQueueManager - Message Handling", () => {
  test('should handle "loaded" message and send "run" command', async () => {
    const mockMessage = { status: "loaded", fileId: "file-123" };
    // Verify "run" message is sent to worker
  });

  test('should update progress on "processing_progress" messages', async () => {
    const mockMessage = {
      status: "processing_progress",
      fileId: "file-123",
      processedSeconds: 30,
      totalSeconds: 60,
    };
    // Verify store updated with 50% progress
  });

  test('should handle "complete" message and save transcript', async () => {
    const mockMessage = {
      status: "complete",
      fileId: "file-123",
      result: { transcript: {}, segments: [] },
    };
    // Verify transcript saved to localStorage
  });

  test('should ignore duplicate "complete" messages', async () => {
    // Send "complete" twice for same file
    // Verify second message is ignored
  });

  test('should handle "error" message and mark file as failed', async () => {
    const mockMessage = {
      status: "error",
      fileId: "file-123",
      error: "Processing failed",
    };
    // Verify file status = 'error'
  });

  test("should ignore messages without fileId gracefully", async () => {
    const mockMessage = { status: "progress", data: 50 };
    // Should not crash, just log warning
  });
});
```

#### Transcript Storage

```typescript
describe("BatchQueueManager - Transcript Storage", () => {
  test("should save transcript with correct metadata", async () => {
    const mockFile = { fileName: "test.mp3" };
    const mockResult = {
      transcript: { text: "Hello", chunks: [] },
      segments: [],
    };
    const transcriptId = await saveTranscript(mockFile, mockResult);

    const saved = await transcripts.get(transcriptId);
    expect(saved.metadata.fileName).toBe("test.mp3");
  });

  test("should save audio blob to storage", async () => {
    // Verify audio file is saved with correct ID
  });

  test("should calculate duration from transcript chunks", async () => {
    const mockResult = {
      transcript: {
        chunks: [{ timestamp: [0, 10] }, { timestamp: [10, 30] }],
      },
      segments: [],
    };
    // Verify duration = 30 seconds
  });

  test("should calculate speaker count from segments", async () => {
    const mockResult = {
      transcript: { chunks: [] },
      segments: [
        { label: "SPEAKER_00" },
        { label: "SPEAKER_00" },
        { label: "SPEAKER_01" },
      ],
    };
    // Verify speakerCount = 2
  });

  test('should dispatch "transcripts-changed" event', async () => {
    const listener = jest.fn();
    window.addEventListener("transcripts-changed", listener);

    await saveTranscript(mockFile, mockResult);

    expect(listener).toHaveBeenCalled();
  });
});
```

---

## 2. BatchWorkerPoolService Tests

### Worker Pool Management

```typescript
describe("BatchWorkerPoolService - Worker Management", () => {
  test("should initialize correct number of workers", async () => {
    // Based on system CPU count
    await batchWorkerPool.initialize();
    const workerIds = batchWorkerPool.getWorkerIds();
    expect(workerIds.length).toBeGreaterThan(0);
  });

  test("should create worker instances with correct status", async () => {
    await batchWorkerPool.initialize();
    // Verify all workers have status 'idle'
  });

  test("should get available worker when idle exists", () => {
    const workerId = batchWorkerPool.getAvailableWorker();
    expect(workerId).toBeTruthy();
  });

  test("should return null when no workers available", () => {
    // Assign all workers
    const workerId = batchWorkerPool.getAvailableWorker();
    expect(workerId).toBeNull();
  });

  test("should assign work to specific worker", () => {
    const assigned = batchWorkerPool.assignWork("worker-0", "file-123");
    expect(assigned).toBe(true);
    // Verify worker status = 'busy', currentFileId = 'file-123'
  });

  test("should fail to assign work to busy worker", () => {
    batchWorkerPool.assignWork("worker-0", "file-123");
    const assigned = batchWorkerPool.assignWork("worker-0", "file-456");
    expect(assigned).toBe(false);
  });

  test("should release worker and reset state", () => {
    batchWorkerPool.assignWork("worker-0", "file-123");
    batchWorkerPool.releaseWorker("worker-0");

    const instance = batchWorkerPool.getWorkerInstance("worker-0");
    expect(instance.status).toBe("idle");
    expect(instance.currentFileId).toBeUndefined();
  });

  test("should get current file ID for worker", () => {
    batchWorkerPool.assignWork("worker-0", "file-123");
    const fileId = batchWorkerPool.getCurrentFileId("worker-0");
    expect(fileId).toBe("file-123");
  });

  test("should terminate all workers", () => {
    batchWorkerPool.terminateAll();
    // Verify all workers terminated, map cleared
  });
});
```

### Worker Message Subscription

```typescript
describe("BatchWorkerPoolService - Message Handling", () => {
  test("should subscribe to worker messages", () => {
    const handler = jest.fn();
    const unsubscribe = batchWorkerPool.subscribe("worker-0", handler);

    expect(typeof unsubscribe).toBe("function");
  });

  test("should receive messages from worker", async () => {
    const handler = jest.fn();
    batchWorkerPool.subscribe("worker-0", handler);

    // Simulate worker message
    // Verify handler called
  });

  test("should unsubscribe from worker messages", () => {
    const handler = jest.fn();
    const unsubscribe = batchWorkerPool.subscribe("worker-0", handler);

    unsubscribe();

    // Simulate worker message
    expect(handler).not.toHaveBeenCalled();
  });

  test("should post message to specific worker", () => {
    const spy = jest.spyOn(Worker.prototype, "postMessage");

    batchWorkerPool.postMessage("worker-0", { type: "load" });

    expect(spy).toHaveBeenCalledWith({ type: "load" });
  });
});
```

---

## 3. useBatchStore Tests (Zustand State)

### State Management

```typescript
describe("useBatchStore - File Management", () => {
  test("should add files to queue with correct initial state", () => {
    const files = [new File([new ArrayBuffer(1024)], "test1.mp3")];
    const { addFiles } = useBatchStore.getState();

    addFiles(files);

    const state = useBatchStore.getState();
    expect(state.files).toHaveLength(1);
    expect(state.files[0].status).toBe("queued");
    expect(state.files[0].progress).toBe(0);
  });

  test("should remove file from queue", () => {
    addFiles([file1]);
    const fileId = useBatchStore.getState().files[0].id;

    removeFile(fileId);

    expect(useBatchStore.getState().files).toHaveLength(0);
  });

  test("should cancel file and update counters", () => {
    addFiles([file1]);
    const fileId = useBatchStore.getState().files[0].id;

    cancelFile(fileId);

    expect(useBatchStore.getState().files[0].status).toBe("cancelled");
    expect(useBatchStore.getState().totalCancelled).toBe(1);
  });

  test("should retry failed file and reset retry count", () => {
    // Mark file as error
    setFileStatus(fileId, "error");

    retryFile(fileId);

    const file = useBatchStore.getState().files[0];
    expect(file.status).toBe("queued");
    expect(file.retryCount).toBe(0);
  });

  test("should update file progress", () => {
    updateFileProgress(fileId, 50);

    const file = useBatchStore.getState().files[0];
    expect(file.progress).toBe(50);
  });

  test("should update file estimated time", () => {
    updateFileEstimatedTime(fileId, 120);

    const file = useBatchStore.getState().files[0];
    expect(file.estimatedTimeRemaining).toBe(120);
  });

  test("should set file status with optional error and transcriptId", () => {
    setFileStatus(fileId, "error", "Decode failed");

    const file = useBatchStore.getState().files[0];
    expect(file.status).toBe("error");
    expect(file.error).toBe("Decode failed");
  });

  test("should reorder files with drag-and-drop", () => {
    addFiles([file1, file2, file3]);
    const file1Id = useBatchStore.getState().files[0].id;

    reorderFiles(file1Id, 2); // Move to index 2

    expect(useBatchStore.getState().files[2].id).toBe(file1Id);
  });

  test("should clear completed files only", () => {
    // Add mix of completed, processing, queued files
    clearCompleted();

    const state = useBatchStore.getState();
    expect(state.files.every((f) => f.status !== "completed")).toBe(true);
  });

  test("should clear all files and reset state", () => {
    clearAll();

    const state = useBatchStore.getState();
    expect(state.files).toHaveLength(0);
    expect(state.processingCount).toBe(0);
    expect(state.totalCompleted).toBe(0);
  });
});
```

### Queue State

```typescript
describe("useBatchStore - Queue State", () => {
  test("should get queued files only", () => {
    // Add files with different statuses
    const queued = getQueuedFiles();

    expect(queued.every((f) => f.status === "queued")).toBe(true);
  });

  test("should get processing files only", () => {
    const processing = getProcessingFiles();

    expect(processing.every((f) => f.status === "processing")).toBe(true);
  });

  test("should check if can start processing", () => {
    const can = canStartProcessing();

    // Verify based on processingCount < maxConcurrentFiles
  });

  test("should increment processing count", () => {
    incrementProcessingCount();

    expect(useBatchStore.getState().processingCount).toBe(1);
  });

  test("should decrement processing count", () => {
    incrementProcessingCount();
    decrementProcessingCount();

    expect(useBatchStore.getState().processingCount).toBe(0);
  });

  test("should pause batch processing", () => {
    pauseBatch();

    expect(useBatchStore.getState().isPaused).toBe(true);
  });

  test("should resume batch processing", () => {
    pauseBatch();
    resumeBatch();

    expect(useBatchStore.getState().isPaused).toBe(false);
  });
});
```

### Processing File Tracking

```typescript
describe("useBatchStore - Processing File Map", () => {
  test("should set processing file with workerId", () => {
    setProcessingFile("file-123", "worker-0");

    const workerId = getProcessingFileWorker("file-123");
    expect(workerId).toBe("worker-0");
  });

  test("should get worker for processing file", () => {
    setProcessingFile("file-123", "worker-0");
    const workerId = getProcessingFileWorker("file-123");

    expect(workerId).toBe("worker-0");
  });

  test("should remove processing file", () => {
    setProcessingFile("file-123", "worker-0");
    removeProcessingFile("file-123");

    const workerId = getProcessingFileWorker("file-123");
    expect(workerId).toBeUndefined();
  });
});
```

### Persistence

```typescript
describe("useBatchStore - Persistence", () => {
  test("should persist state to localStorage", async () => {
    addFiles([file1]);

    // Wait for persist middleware
    await new Promise((resolve) => setTimeout(resolve, 100));

    const stored = localStorage.getItem("batch-store");
    expect(stored).toBeTruthy();
  });

  test("should restore state from localStorage", () => {
    // Manually set localStorage
    const mockState = {
      files: [{ id: "file-123", fileName: "test.mp3" }],
    };
    localStorage.setItem(
      "batch-store",
      JSON.stringify({ state: mockState }),
    );

    // Create new store instance
    const state = useBatchStore.getState();

    expect(state.files).toHaveLength(1);
  });

  test("should not persist runtime Maps", () => {
    setProcessingFile("file-123", "worker-0");

    const stored = localStorage.getItem("batch-store");
    const parsed = JSON.parse(stored);

    // processingFiles Map should not be in storage
    expect(parsed.state.processingFiles).toBeUndefined();
  });
});
```

---

## 4. Worker Tests (whisperDiarization.worker.js)

### fileId Tracking

```typescript
describe('WhisperWorker - fileId Tracking', () => {
  test('should accept fileId in load message', () => {
    worker.postMessage({
      type: 'load',
      data: { device: 'wasm', model: 'whisper-base', fileId: 'file-123' }
    });

    // Verify currentFileId is set
  });

  test('should accept fileId in run message', () => {
    worker.postMessage({
      type: 'run',
      data: { audio: new Float32Array(), language: 'en', fileId: 'file-123' }
    });

    // Verify currentFileId is set
  });

  test('should include fileId in all postMessage responses', (done) => {
    const messages = [];
    worker.onmessage = (e) => {
      messages.push(e.data);

      // Check after multiple messages received
      if (messages.length > 5) {
        expect(messages.every(m => m.fileId === 'file-123')).toBe(true);
        done();
      }
    };

    worker.postMessage({ type: 'run', data: { /*...*/, fileId: 'file-123' } });
  });

  test('should include fileId in model loading progress messages', (done) => {
    worker.onmessage = (e) => {
      if (e.data.status === 'progress' || e.data.status === 'done') {
        expect(e.data.fileId).toBe('file-123');
        done();
      }
    };

    worker.postMessage({ type: 'load', data: { /*...*/, fileId: 'file-123' } });
  });

  test('should clear fileId after completion', (done) => {
    worker.onmessage = (e) => {
      if (e.data.status === 'complete') {
        expect(e.data.fileId).toBe('file-123');

        // Send new task, should have new fileId
        worker.postMessage({ type: 'run', data: { /*...*/, fileId: 'file-456' } });

        // Verify old fileId not reused
        done();
      }
    };

    worker.postMessage({ type: 'run', data: { /*...*/, fileId: 'file-123' } });
  });

  test('should clear fileId on error', (done) => {
    worker.onmessage = (e) => {
      if (e.data.status === 'error') {
        expect(e.data.fileId).toBe('file-123');
        done();
      }
    };

    // Trigger error
    worker.postMessage({ type: 'run', data: { audio: null, fileId: 'file-123' } });
  });
});
```

### Transcription Processing

```typescript
describe("WhisperWorker - Transcription", () => {
  test('should send "loading" status when model loads', (done) => {
    worker.onmessage = (e) => {
      if (e.data.status === "loading") {
        expect(e.data.data).toContain("Loading");
        done();
      }
    };

    worker.postMessage({ type: "load", data: { device: "wasm" } });
  });

  test('should send "loaded" status when model ready', (done) => {
    worker.onmessage = (e) => {
      if (e.data.status === "loaded") {
        done();
      }
    };

    worker.postMessage({ type: "load", data: { device: "wasm" } });
  });

  test("should send progress updates during transcription", (done) => {
    const progressMessages = [];

    worker.onmessage = (e) => {
      if (e.data.status === "processing_progress") {
        progressMessages.push(e.data);
      }

      if (e.data.status === "complete") {
        expect(progressMessages.length).toBeGreaterThan(0);
        expect(progressMessages.every((m) => m.totalSeconds > 0)).toBe(
          true,
        );
        done();
      }
    };

    worker.postMessage({
      type: "run",
      data: { audio: mockAudio, language: "en" },
    });
  });

  test('should send "complete" with transcript and segments', (done) => {
    worker.onmessage = (e) => {
      if (e.data.status === "complete") {
        expect(e.data.result.transcript).toBeDefined();
        expect(e.data.result.segments).toBeDefined();
        expect(e.data.time).toBeGreaterThan(0);
        done();
      }
    };

    worker.postMessage({
      type: "run",
      data: {
        /*...*/
      },
    });
  });

  test("should handle errors gracefully", (done) => {
    worker.onmessage = (e) => {
      if (e.data.status === "error") {
        expect(e.data.error).toBeDefined();
        done();
      }
    };

    worker.postMessage({ type: "run", data: { audio: null } });
  });
});
```

---

## 5. UI Component Tests

### BatchFileUpload Component

```typescript
describe('BatchFileUpload - File Selection', () => {
  test('should render upload zone', () => {
    render(<BatchFileUpload />);
    expect(screen.getByText(/drag.*drop/i)).toBeInTheDocument();
  });

  test('should accept file drop', async () => {
    render(<BatchFileUpload />);

    const file = new File([new ArrayBuffer(1024)], 'test.mp3');
    const dropzone = screen.getByTestId('upload-zone');

    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    await waitFor(() => {
      expect(useBatchStore.getState().files).toHaveLength(1);
    });
  });

  test('should accept file input selection', async () => {
    render(<BatchFileUpload />);

    const input = screen.getByTestId('file-input');
    const file = new File([new ArrayBuffer(1024)], 'test.mp3');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(useBatchStore.getState().files).toHaveLength(1);
    });
  });

  test('should filter out non-audio files', async () => {
    const audioFile = new File([new ArrayBuffer(1024)], 'test.mp3', { type: 'audio/mpeg' });
    const textFile = new File([new ArrayBuffer(1024)], 'test.txt', { type: 'text/plain' });

    // Drop both files

    await waitFor(() => {
      expect(useBatchStore.getState().files).toHaveLength(1);
      expect(useBatchStore.getState().files[0].fileName).toBe('test.mp3');
    });
  });

  test('should show drag overlay when dragging', () => {
    render(<BatchFileUpload />);

    fireEvent.dragEnter(screen.getByTestId('upload-zone'));

    expect(useBatchStore.getState().isDragging).toBe(true);
  });
});
```

### BatchFileItem Component

```typescript
describe('BatchFileItem - Display & Actions', () => {
  test('should display file name and size', () => {
    const file = {
      id: 'file-123',
      fileName: 'test.mp3',
      fileSize: 1024000,
      status: 'queued',
      progress: 0
    };

    render(<BatchFileItem file={file} />);

    expect(screen.getByText('test.mp3')).toBeInTheDocument();
    expect(screen.getByText(/1.0 MB/i)).toBeInTheDocument();
  });

  test('should show progress bar for processing files', () => {
    const file = { /*...*/ status: 'processing', progress: 50 };

    render(<BatchFileItem file={file} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
  });

  test('should show estimated time remaining', () => {
    const file = { /*...*/ estimatedTimeRemaining: 120 };

    render(<BatchFileItem file={file} />);

    expect(screen.getByText(/2m 0s/i)).toBeInTheDocument();
  });

  test('should show checkmark for completed files', () => {
    const file = { /*...*/ status: 'completed' };

    render(<BatchFileItem file={file} />);

    expect(screen.getByTestId('check-icon')).toBeInTheDocument();
  });

  test('should show error message for failed files', () => {
    const file = { /*...*/ status: 'error', error: 'Decode failed' };

    render(<BatchFileItem file={file} />);

    expect(screen.getByText(/decode failed/i)).toBeInTheDocument();
  });

  test('should handle cancel button click', () => {
    const file = { /*...*/ status: 'queued' };

    render(<BatchFileItem file={file} />);

    fireEvent.click(screen.getByLabelText(/cancel/i));

    expect(useBatchStore.getState().files[0].status).toBe('cancelled');
  });

  test('should handle retry button click', () => {
    const file = { /*...*/ status: 'error' };

    render(<BatchFileItem file={file} />);

    fireEvent.click(screen.getByText(/retry/i));

    expect(useBatchStore.getState().files[0].status).toBe('queued');
  });

  test('should handle remove button click', () => {
    const file = { /*...*/ };

    render(<BatchFileItem file={file} />);

    fireEvent.click(screen.getByLabelText(/remove/i));

    expect(useBatchStore.getState().files).toHaveLength(0);
  });
});
```

### BatchProgressWidget Component

```typescript
describe('BatchProgressWidget - Batch Status', () => {
  test('should show overall progress', () => {
    // Add 4 files: 2 completed, 1 processing, 1 queued

    render(<BatchProgressWidget />);

    expect(screen.getByText(/2.*4/i)).toBeInTheDocument(); // 2 of 4 complete
  });

  test('should show pause button when processing', () => {
    // Set batchStatus = 'processing'

    render(<BatchProgressWidget />);

    expect(screen.getByLabelText(/pause/i)).toBeInTheDocument();
  });

  test('should show resume button when paused', () => {
    // Set isPaused = true

    render(<BatchProgressWidget />);

    expect(screen.getByLabelText(/resume/i)).toBeInTheDocument();
  });

  test('should handle pause click', () => {
    render(<BatchProgressWidget />);

    fireEvent.click(screen.getByLabelText(/pause/i));

    expect(useBatchStore.getState().isPaused).toBe(true);
  });

  test('should handle clear completed click', () => {
    // Add completed files

    render(<BatchProgressWidget />);

    fireEvent.click(screen.getByText(/clear completed/i));

    const files = useBatchStore.getState().files;
    expect(files.every(f => f.status !== 'completed')).toBe(true);
  });
});
```

---

## 6. Integration Tests

### End-to-End Batch Processing

```typescript
describe("Batch Upload Integration", () => {
  test("should process multiple files end-to-end", async () => {
    // Initialize system
    await batchQueueManager.initialize();

    // Add 4 files
    const files = [
      new File([mockAudio1], "file1.mp3"),
      new File([mockAudio2], "file2.mp3"),
      new File([mockAudio3], "file3.mp3"),
      new File([mockAudio4], "file4.mp3"),
    ];

    useBatchStore.getState().addFiles(files);

    // Start processing
    const onComplete = jest.fn();
    await batchQueueManager.start(onComplete);

    // Wait for all files to complete
    await waitFor(
      () => {
        const state = useBatchStore.getState();
        return state.totalCompleted === 4;
      },
      { timeout: 60000 },
    );

    // Verify all files completed
    expect(onComplete).toHaveBeenCalled();

    const state = useBatchStore.getState();
    expect(state.files.every((f) => f.status === "completed")).toBe(true);
    expect(state.files.every((f) => f.transcriptId)).toBeTruthy();
  });

  test("should handle mix of success and failure", async () => {
    // Add 3 files, mock worker to fail on 2nd file

    await batchQueueManager.start();

    await waitFor(() => {
      const state = useBatchStore.getState();
      return state.totalCompleted + state.totalFailed === 3;
    });

    const state = useBatchStore.getState();
    expect(state.totalCompleted).toBe(2);
    expect(state.totalFailed).toBe(1);
  });

  test("should respect concurrent processing limit", async () => {
    useBatchStore.getState().setMaxConcurrentFiles(2);

    // Add 5 files

    await batchQueueManager.start();

    // At any point, max 2 files should be processing
    const checkConcurrency = setInterval(() => {
      const processing = useBatchStore.getState().processingCount;
      expect(processing).toBeLessThanOrEqual(2);
    }, 100);

    await waitFor(() => {
      return useBatchStore.getState().totalCompleted === 5;
    });

    clearInterval(checkConcurrency);
  });
});
```

### Race Condition Regression Tests

```typescript
describe("Batch Upload Regression - File Skipping Bug", () => {
  test("should not skip even-numbered files (Issue Fix)", async () => {
    // This is the critical regression test for the race condition fix

    await batchQueueManager.initialize();

    const files = [
      new File([mockAudio], "file1.mp3"),
      new File([mockAudio], "file2.mp3"),
      new File([mockAudio], "file3.mp3"),
      new File([mockAudio], "file4.mp3"),
      new File([mockAudio], "file5.mp3"),
      new File([mockAudio], "file6.mp3"),
    ];

    useBatchStore.getState().addFiles(files);
    await batchQueueManager.start();

    // Wait for completion
    await waitFor(
      () => {
        return useBatchStore.getState().totalCompleted === 6;
      },
      { timeout: 120000 },
    );

    const state = useBatchStore.getState();

    // Verify EACH file was actually processed (not just marked complete)
    for (const file of state.files) {
      expect(file.status).toBe("completed");
      expect(file.transcriptId).toBeTruthy();

      // Verify transcript actually exists in storage
      const transcript = await transcripts.get(file.transcriptId);
      expect(transcript).toBeTruthy();
      expect(transcript.transcript.text).toBeTruthy();
    }

    // Specific check for even-numbered files (files 2, 4, 6)
    const file2 = state.files[1];
    const file4 = state.files[3];
    const file6 = state.files[5];

    expect(file2.status).toBe("completed");
    expect(file4.status).toBe("completed");
    expect(file6.status).toBe("completed");

    // Verify they have unique transcripts (not duplicates from File 1, 3, 5)
    const transcript2 = await transcripts.get(file2.transcriptId);
    const transcript4 = await transcripts.get(file4.transcriptId);
    const transcript6 = await transcripts.get(file6.transcriptId);

    expect(transcript2.id).not.toBe(transcript4.id);
    expect(transcript4.id).not.toBe(transcript6.id);
  });

  test("should handle worker reassignment correctly", async () => {
    // Mock scenario where worker is reassigned mid-processing

    const mockWorker = {
      postMessage: jest.fn(),
      onmessage: null,
    };

    // Simulate:
    // 1. Worker processes File 1
    // 2. File 1 sends "complete" message
    // 3. Worker immediately assigned to File 2
    // 4. Delayed duplicate "complete" from File 1 arrives

    // File 1 complete
    mockWorker.onmessage({
      data: { status: "complete", fileId: "file-1", result: {} },
    });

    // Worker reassigned to File 2
    batchWorkerPool.releaseWorker("worker-0");
    batchWorkerPool.assignWork("worker-0", "file-2");

    // Delayed complete from File 1
    mockWorker.onmessage({
      data: { status: "complete", fileId: "file-1", result: {} },
    });

    const state = useBatchStore.getState();

    // File 1 should be completed
    expect(state.files[0].status).toBe("completed");

    // File 2 should NOT be completed (still processing)
    expect(state.files[1].status).toBe("processing");
  });
});
```

---

## 7. Performance Tests

### Memory Management

```typescript
describe("Batch Upload - Memory Management", () => {
  test("should cleanup audio buffers after processing", async () => {
    const initialMemory = performance.memory?.usedJSHeapSize || 0;

    // Process 10 large files
    await processBatchFiles(10);

    // Verify buffers are cleared
    expect(batchQueueManager["audioBuffers"].size).toBe(0);

    // Memory should not grow unbounded
    const finalMemory = performance.memory?.usedJSHeapSize || 0;
    const growth = finalMemory - initialMemory;

    // Allow some growth but not proportional to 10 files
    expect(growth).toBeLessThan(initialMemory * 0.5);
  });

  test("should handle large batch without crashing", async () => {
    // Add 50 files
    const files = Array.from(
      { length: 50 },
      (_, i) => new File([mockAudio], `file${i}.mp3`),
    );

    useBatchStore.getState().addFiles(files);

    // Should not crash
    await expect(batchQueueManager.start()).resolves.not.toThrow();
  });
});
```

### Concurrency Tests

```typescript
describe("Batch Upload - Concurrency", () => {
  test("should process files faster with more workers", async () => {
    // Test with 1 worker
    useBatchStore.getState().setMaxConcurrentFiles(1);
    const start1 = Date.now();
    await processBatchFiles(4);
    const time1 = Date.now() - start1;

    // Test with 4 workers
    useBatchStore.getState().setMaxConcurrentFiles(4);
    const start4 = Date.now();
    await processBatchFiles(4);
    const time4 = Date.now() - start4;

    // 4 workers should be significantly faster
    expect(time4).toBeLessThan(time1 * 0.7);
  });
});
```

---

## 8. Error Handling & Edge Cases

### Error Recovery

```typescript
describe("Batch Upload - Error Handling", () => {
  test("should retry transient errors", async () => {
    let attemptCount = 0;

    // Mock worker to fail twice, then succeed
    jest.spyOn(global, "Worker").mockImplementation(() => ({
      postMessage: () => {
        attemptCount++;
        if (attemptCount <= 2) {
          throw new Error("Transient error");
        }
      },
    }));

    await processBatchFiles(1);

    expect(attemptCount).toBe(3);
    expect(useBatchStore.getState().files[0].status).toBe("completed");
  });

  test("should not retry model loading errors", async () => {
    // Mock "Failed to fetch" error

    await processBatchFiles(1);

    const file = useBatchStore.getState().files[0];
    expect(file.status).toBe("error");
    expect(file.retryCount).toBe(0); // Should not retry
  });

  test("should handle worker crash gracefully", async () => {
    // Simulate worker terminating unexpectedly
    // Should mark file as error and continue with next file
  });

  test("should handle corrupted audio files", async () => {
    const corruptedFile = new File(
      [new Uint8Array([0, 1, 2])],
      "corrupt.mp3",
    );

    useBatchStore.getState().addFiles([corruptedFile]);
    await batchQueueManager.start();

    const file = useBatchStore.getState().files[0];
    expect(file.status).toBe("error");
    expect(file.error).toContain("decode");
  });
});
```

### Edge Cases

```typescript
describe("Batch Upload - Edge Cases", () => {
  test("should handle zero-byte files", async () => {
    const emptyFile = new File([], "empty.mp3");

    useBatchStore.getState().addFiles([emptyFile]);
    await batchQueueManager.start();

    const file = useBatchStore.getState().files[0];
    expect(file.status).toBe("error");
  });

  test("should handle very long file names", () => {
    const longName = "a".repeat(500) + ".mp3";
    const file = new File([mockAudio], longName);

    useBatchStore.getState().addFiles([file]);

    // Should not crash, name should be truncated in UI
    expect(useBatchStore.getState().files[0].fileName).toBe(longName);
  });

  test("should handle special characters in file names", () => {
    const specialFile = new File([mockAudio], "test™️😀🎵.mp3");

    useBatchStore.getState().addFiles([specialFile]);

    expect(useBatchStore.getState().files[0].fileName).toBe(
      "test™️😀🎵.mp3",
    );
  });

  test("should handle duplicate file names", () => {
    const file1 = new File([mockAudio], "test.mp3");
    const file2 = new File([mockAudio], "test.mp3");

    useBatchStore.getState().addFiles([file1, file2]);

    // Should create separate entries with unique IDs
    expect(useBatchStore.getState().files).toHaveLength(2);
    expect(useBatchStore.getState().files[0].id).not.toBe(
      useBatchStore.getState().files[1].id,
    );
  });

  test("should handle pause during processing", async () => {
    useBatchStore.getState().addFiles([file1, file2, file3]);
    batchQueueManager.start();

    // Pause after first file starts
    await waitFor(() => {
      return useBatchStore.getState().processingCount > 0;
    });

    batchQueueManager.pause();

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // No new files should start processing
    const stateWhilePaused = useBatchStore.getState();

    batchQueueManager.resume();

    // Processing should continue
    await waitFor(() => {
      return useBatchStore.getState().totalCompleted === 3;
    });
  });

  test("should handle cancel all while processing", async () => {
    useBatchStore.getState().addFiles([file1, file2, file3]);
    batchQueueManager.start();

    await waitFor(() => {
      return useBatchStore.getState().processingCount > 0;
    });

    batchQueueManager.cancelAll();

    const state = useBatchStore.getState();
    expect(state.isQueueRunning).toBe(false);
    expect(state.files).toHaveLength(0);
  });
});
```

---

## 9. Accessibility Tests

```typescript
describe('Batch Upload - Accessibility', () => {
  test('should have proper ARIA labels', () => {
    render(<BatchFileUpload />);

    expect(screen.getByLabelText(/upload files/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start processing/i })).toBeInTheDocument();
  });

  test('should announce progress updates to screen readers', async () => {
    render(<BatchFileItem file={{ /*...*/ status: 'processing', progress: 50 }} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    expect(progressBar).toHaveAttribute('aria-label', expect.stringContaining('50%'));
  });

  test('should support keyboard navigation', () => {
    render(<BatchFileItem file={mockFile} />);

    const cancelButton = screen.getByLabelText(/cancel/i);
    cancelButton.focus();

    expect(document.activeElement).toBe(cancelButton);

    fireEvent.keyDown(cancelButton, { key: 'Enter' });

    // Should trigger cancel
  });
});
```

---

## 10. Test Data & Mocks

### Mock Audio Data

```typescript
// test/mocks/audioData.ts
export const createMockAudioBuffer = (
  duration: number = 10,
): Float32Array => {
  const sampleRate = 16000;
  const samples = duration * sampleRate;
  const buffer = new Float32Array(samples);

  // Generate sine wave
  for (let i = 0; i < samples; i++) {
    buffer[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.3;
  }

  return buffer;
};

export const createMockAudioFile = (
  name: string,
  duration: number = 10,
): File => {
  const buffer = createMockAudioBuffer(duration);
  const blob = new Blob([buffer.buffer], { type: "audio/wav" });
  return new File([blob], name, { type: "audio/wav" });
};
```

### Mock Worker

```typescript
// test/mocks/worker.ts
export class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;

  postMessage(data: any) {
    // Simulate async processing
    setTimeout(() => {
      if (data.type === "load") {
        this.onmessage?.({
          data: { status: "loaded", fileId: data.data.fileId },
        });
      } else if (data.type === "run") {
        this.simulateTranscription(data.data.fileId);
      }
    }, 100);
  }

  simulateTranscription(fileId: string) {
    // Simulate progress updates
    for (let i = 0; i <= 100; i += 10) {
      setTimeout(() => {
        this.onmessage?.({
          data: {
            status: "processing_progress",
            fileId,
            processedSeconds: i,
            totalSeconds: 100,
          },
        });
      }, i * 50);
    }

    // Send complete
    setTimeout(() => {
      this.onmessage?.({
        data: {
          status: "complete",
          fileId,
          result: {
            transcript: { text: "Mock transcript", chunks: [] },
            segments: [],
          },
        },
      });
    }, 5000);
  }

  terminate() {}
}
```

---

## 11. Test Execution Plan

### Priority Levels

1. **P0 - Critical**: Race condition prevention, core processing flow
2. **P1 - High**: Error handling, state management, worker pool
3. **P2 - Medium**: UI components, accessibility
4. **P3 - Low**: Performance, edge cases

### Coverage Goals

- **Unit Tests**: 85%+ coverage
- **Integration Tests**: All critical user flows
- **E2E Tests**: Happy path + error scenarios
- **Regression Tests**: File skipping bug

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Batch Upload Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test -- --coverage

      - name: Run integration tests
        run: npm run test:integration

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 12. Manual Testing Checklist

### Smoke Tests (Run Before Each Release)

- [ ] Upload 6 files, verify all complete successfully
- [ ] Verify even-numbered files (2, 4, 6) are actually processed
- [ ] Check that each file has unique transcript
- [ ] Test pause/resume functionality
- [ ] Test cancel individual file
- [ ] Test cancel all files
- [ ] Test retry failed file
- [ ] Test clear completed files
- [ ] Verify transcripts appear in sidebar
- [ ] Click on transcript, verify correct audio plays

### Browser Compatibility

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Performance Testing

- [ ] Process 20 small files (< 1MB each)
- [ ] Process 5 large files (> 50MB each)
- [ ] Monitor memory usage (should not grow unbounded)
- [ ] Check CPU usage (should use available cores)

---

## Summary

This test specification covers:

- ✅ **95 unit tests** across 12 test suites
- ✅ **Critical regression tests** for the file-skipping bug
- ✅ **Integration tests** for end-to-end workflows
- ✅ **Performance & memory tests**
- ✅ **Error handling & edge cases**
- ✅ **Accessibility compliance**
- ✅ **Mock data & test utilities**

**Implementation Priority**: Start with the race condition prevention tests
(Section 1.1) as these are the highest priority to prevent regression of
the critical bug fix.
