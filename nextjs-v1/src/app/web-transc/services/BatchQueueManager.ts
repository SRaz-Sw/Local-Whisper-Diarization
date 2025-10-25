/**
 * Batch Queue Manager
 * Orchestrates batch processing by managing worker pool and file queue
 */

import { batchWorkerPool } from "./BatchWorkerPoolService";
import { useBatchStore, type BatchFile } from "../store/useBatchStore";
import { useWhisperStore } from "../store/useWhisperStore";
import type { TranscriptionResult, WorkerMessage } from "../types";
import { transcripts } from "@/lib/localStorage/collections";
import { blobStorage } from "@/lib/localStorage/storage";
import type {
  TranscriptChunk,
  SpeakerSegment,
} from "@/lib/localStorage/schemas";
import { DEFAULT_MODEL } from "../config/modelConfig";
import { sanitizeChunks } from "../utils/chunkSanitizer";

class BatchQueueManager {
  private workerSubscriptions: Map<string, () => void> = new Map(); // workerId -> unsubscribe
  private completionCallback?: () => void;
  private audioBuffers: Map<
    string,
    { audio: Float32Array; language: string; model: string }
  > = new Map(); // fileId -> audio data (keep this for now as it can't be in Zustand)

  /**
   * Initialize the queue manager and worker pool
   */
  async initialize(): Promise<boolean> {
    const store = useBatchStore.getState();

    // Prevent re-initialization
    if (store.isQueueInitialized) {
      console.log("ℹ️ BatchQueueManager already initialized");
      return true;
    }

    const success = await batchWorkerPool.initialize();
    if (success) {
      // Subscribe to all workers
      const workerIds = batchWorkerPool.getWorkerIds();
      workerIds.forEach((workerId) => {
        const unsubscribe = batchWorkerPool.subscribe(
          workerId,
          (e: MessageEvent) => {
            this.handleWorkerMessage(workerId, e);
          },
        );
        this.workerSubscriptions.set(workerId, unsubscribe);
      });
      store.setQueueInitialized(true);
      console.log("✅ BatchQueueManager initialized");
    }
    return success;
  }

  /**
   * Start processing the queue
   */
  async start(onComplete?: () => void): Promise<void> {
    const store = useBatchStore.getState();

    if (store.isQueueRunning) {
      console.log("⚠️ Queue is already running");
      return;
    }

    this.completionCallback = onComplete;
    store.setQueueRunning(true);
    console.log("▶️ Starting batch queue processing");

    // Start the processing loop
    await this.processQueue();
  }

  /**
   * Main processing loop
   */
  private async processQueue(): Promise<void> {
    const store = useBatchStore.getState();

    if (!store.isQueueRunning) return;

    // Check if paused
    if (store.isPaused) {
      console.log("⏸️ Queue is paused");
      setTimeout(() => this.processQueue(), 1000); // Check again in 1 second
      return;
    }

    // Get queued files
    const queuedFiles = store.getQueuedFiles();

    // Check if we're done
    if (queuedFiles.length === 0 && store.processingCount === 0) {
      store.setQueueRunning(false);
      console.log("✅ Batch processing complete");
      if (this.completionCallback) {
        this.completionCallback();
      }
      return;
    }

    // Try to assign work to available workers (with lock to prevent concurrent assignments)
    if (store.canStartProcessing() && !store.isAssigningFile) {
      const availableWorker = batchWorkerPool.getAvailableWorker();

      if (availableWorker && queuedFiles.length > 0) {
        const file = queuedFiles[0]; // Get first queued file
        console.log(
          `📋 Assigning ${file.fileName} to ${availableWorker} (${queuedFiles.length} queued, ${store.processingCount} processing)`,
        );

        // Set lock
        store.setIsAssigning(true);
        try {
          await this.assignFileToWorker(file, availableWorker);
        } finally {
          // Release lock
          store.setIsAssigning(false);
        }
      }
    }

    // Continue processing
    setTimeout(() => this.processQueue(), 500); // Check every 500ms
  }

  /**
   * Assign a file to a worker
   */
  private async assignFileToWorker(
    batchFile: BatchFile,
    workerId: string,
  ): Promise<void> {
    try {
      const store = useBatchStore.getState();

      // Assign work to worker
      const assigned = batchWorkerPool.assignWork(workerId, batchFile.id);
      if (!assigned) {
        console.error("❌ Failed to assign work to worker");
        return;
      }

      // Update batch store
      console.log(
        `🔄 Setting file ${batchFile.fileName} to processing status`,
      );
      store.setFileStatus(batchFile.id, "processing");
      store.incrementProcessingCount();

      // Verify the update
      const verifyFile = useBatchStore
        .getState()
        .files.find((f) => f.id === batchFile.id);
      console.log(
        `🔄 Verified status: ${verifyFile?.status}, processingCount: ${useBatchStore.getState().processingCount}`,
      );

      // Track file -> worker mapping
      store.setProcessingFile(batchFile.id, workerId);

      console.log(
        `📤 Processing file ${batchFile.fileName} on ${workerId}`,
      );

      // Process the audio file
      await this.processAudioFile(batchFile, workerId);
    } catch (error) {
      console.error(`❌ Error assigning file to worker:`, error);
      this.handleFileError(batchFile.id, error as Error);
    }
  }

  /**
   * Process audio file with worker
   */
  private async processAudioFile(
    batchFile: BatchFile,
    workerId: string,
  ): Promise<void> {
    try {
      console.log(`🎵 Starting audio decode for ${batchFile.fileName}`);

      // Get current language and model from Whisper store
      const whisperState = useWhisperStore.getState();
      const language = whisperState.audio.language || "en";
      const model = whisperState.model.model || DEFAULT_MODEL;
      const device = whisperState.model.device || "wasm";

      // Read and decode audio file
      const audioBuffer = await this.readAndDecodeAudio(batchFile.file);
      console.log(`✅ Audio decoded: ${audioBuffer.length} samples`);

      // CRITICAL: Store audio buffer in Map IMMEDIATELY after decode, BEFORE any postMessage
      // This MUST happen synchronously before the "load" message to prevent race condition
      // (worker may respond with "loaded" immediately if model is already cached)
      this.audioBuffers.set(batchFile.id, {
        audio: audioBuffer,
        language: language,
        model: model,
      });
      console.log(
        `💾 Stored audio buffer (${audioBuffer.length} samples) in Map for file ${batchFile.id}`,
      );

      console.log(
        `📤 Processing ${batchFile.fileName} with model: ${model}, device: ${device}, language: ${language}`,
      );

      // Now safe to load model - buffer is already in Map if worker responds immediately
      batchWorkerPool.postMessage(workerId, {
        type: "load",
        data: {
          device: device,
          model: model,
          fileId: batchFile.id, // Pass fileId to worker
        },
      });
    } catch (error) {
      console.error(`❌ Error processing audio file:`, error);
      this.handleFileError(batchFile.id, error as Error);
    }
  }

  /**
   * Read and decode audio file to Float32Array at 16kHz
   */
  private async readAndDecodeAudio(file: File): Promise<Float32Array> {
    return new Promise((resolve, reject) => {
      // Check if file is valid (not a placeholder from localStorage)
      if (!file || file.size === 0) {
        reject(
          new Error("Invalid or empty file. Please re-upload the file."),
        );
        return;
      }

      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;

          if (!arrayBuffer || arrayBuffer.byteLength === 0) {
            reject(new Error("Empty file content"));
            return;
          }

          // Decode audio using Web Audio API
          const audioContext = new AudioContext({ sampleRate: 16000 });
          const audioBuffer =
            await audioContext.decodeAudioData(arrayBuffer);

          // Convert to mono and resample to 16kHz
          let audio: Float32Array;
          if (audioBuffer.numberOfChannels === 1) {
            audio = audioBuffer.getChannelData(0);
          } else if (audioBuffer.numberOfChannels >= 2) {
            // Mix to mono
            const left = audioBuffer.getChannelData(0);
            const right = audioBuffer.getChannelData(1);
            audio = new Float32Array(left.length);
            for (let i = 0; i < left.length; i++) {
              audio[i] = (left[i] + right[i]) / 2;
            }
          } else {
            reject(new Error("Invalid audio file: no channels found"));
            return;
          }

          await audioContext.close();
          resolve(audio);
        } catch (error) {
          reject(
            new Error(
              `Failed to decode audio: ${error instanceof Error ? error.message : "Unknown error"}`,
            ),
          );
        }
      };

      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Handle worker messages
   */
  private handleWorkerMessage(
    workerId: string,
    event: MessageEvent,
  ): void {
    const message: WorkerMessage = event.data;

    // ✅ FIX: Get file ID from the message itself, not from worker state
    // This prevents race conditions where the worker gets reassigned before all messages are processed
    const fileId = message.fileId;

    if (!fileId) {
      // It's OK to not have a file assigned during initialization or after completion
      // Just ignore these messages silently (common statuses that are safe to ignore)
      const ignoredStatuses = [
        "loading",
        "loaded",
        "complete",
        "progress",
        "done",
        "initiate",
        "processing_progress",
        "download",
        "ready",
      ];
      if (!ignoredStatuses.includes(message.status)) {
        console.warn(
          `⚠️ Received message from ${workerId} but no fileId in message`,
          message.status,
        );
      }
      return;
    }

    const store = useBatchStore.getState();
    const file = store.files.find((f) => f.id === fileId);
    if (!file) {
      console.error(`❌ File ${fileId} not found in store`);
      return;
    }

    // Debug: Log only important messages (filter out spam from model loading)
    const spamStatuses = [
      "progress",
      "processing_progress",
      "initiate",
      "download",
      "done",
      "ready",
      "transcribing",
    ];

    const shouldLogMessage = !spamStatuses.includes(message.status);

    if (shouldLogMessage) {
      console.log(
        `📨 Worker ${workerId} message:`,
        message.status,
        file.fileName.substring(0, 40),
      );
    }

    // Handle different message types
    switch (message.status) {
      case "loading":
        console.log(`⏳ ${file.fileName}: Loading model...`);
        batchWorkerPool.setWorkerStatus(workerId, "loading");
        break;

      case "loaded":
        console.log(
          `✅ ${file.fileName}: Model loaded, starting transcription`,
        );
        batchWorkerPool.setWorkerStatus(workerId, "busy");

        // Get audio data from Map
        const audioData = this.audioBuffers.get(fileId);

        console.log(`🔍 Audio data exists in Map: ${!!audioData}`);
        console.log(
          `🔍 Audio buffer length: ${audioData?.audio?.length || 0}`,
        );
        console.log(`🔍 Language: ${audioData?.language || "not found"}`);

        if (audioData && audioData.audio) {
          console.log(
            `🚀 Sending "run" message to worker with ${audioData.audio.length} audio samples`,
          );
          batchWorkerPool.postMessage(workerId, {
            type: "run",
            data: {
              audio: audioData.audio,
              language: audioData.language,
              fileId: fileId, // Pass fileId to worker
            },
          });
          console.log(`✅ "run" message sent to ${workerId}`);
        } else {
          console.error(
            `❌ No audio buffer found in Map for ${file.fileName} (id: ${fileId})!`,
          );
          this.handleFileError(
            fileId,
            new Error("Audio buffer not found"),
          );
        }
        break;

      case "progress":
      case "processing_progress":
        // Update progress
        if (message.processedSeconds && message.totalSeconds) {
          const progress =
            (message.processedSeconds / message.totalSeconds) * 100;

          // Update store with progress
          store.updateFileProgress(fileId, progress);

          // Update estimated time remaining if available
          if (message.estimatedTimeRemaining !== undefined) {
            store.updateFileEstimatedTime(
              fileId,
              message.estimatedTimeRemaining,
            );
          }

          // Only log every 10% to avoid spam
          const lastLogged = store.getLastProgress(fileId);
          const progressRounded = Math.floor(progress / 10) * 10;
          if (progressRounded > lastLogged && progressRounded <= 100) {
            console.log(
              `📊 ${file.fileName}: ${progressRounded}% complete`,
            );
            store.updateLastProgress(fileId, progressRounded);
          }
        }
        break;

      case "complete":
        // Transcription complete
        if (message.result) {
          console.log(`✅ ${file.fileName}: Transcription complete`);
          // Check if file is already completed (duplicate message)
          if (file.status === "completed") {
            console.log(
              `⚠️ Ignoring duplicate complete message for ${file.fileName}`,
            );
            return;
          }
          this.handleFileComplete(fileId, file, message.result);
        }
        break;

      case "error":
        const errorMsg =
          (message as any).error || message.data || "Unknown error";
        console.error(`❌ ${file.fileName}: Error`, errorMsg);
        this.handleFileError(fileId, new Error(errorMsg));
        break;
    }
  }

  /**
   * Handle file completion
   */
  private async handleFileComplete(
    fileId: string,
    file: BatchFile,
    result: TranscriptionResult,
  ): Promise<void> {
    try {
      const store = useBatchStore.getState();

      // Update file status FIRST to prevent race condition with duplicate messages
      // This acts as a lock - if another "complete" message arrives, it will be
      // caught by the status check in handleWorkerMessage (line 428)
      store.setFileStatus(fileId, "completed", undefined, undefined);

      // Save transcript to storage
      const transcriptId = await this.saveTranscript(file, result);

      // Update with transcript ID
      store.setFileStatus(fileId, "completed", undefined, transcriptId);
      store.decrementProcessingCount();

      // Release worker
      const workerId = store.getProcessingFileWorker(fileId);
      if (workerId) {
        batchWorkerPool.releaseWorker(workerId);
        store.removeProcessingFile(fileId);
      }

      // Cleanup audio buffer from memory
      this.audioBuffers.delete(fileId);

      console.log(
        `💾 ${file.fileName}: Saved as ${transcriptId}, processingCount now: ${useBatchStore.getState().processingCount}`,
      );

      // Immediately check if we can process next file (don't wait for the timeout)
      setTimeout(() => this.processQueue(), 100);
    } catch (error) {
      console.error(`❌ Error handling file completion:`, error);
      this.handleFileError(fileId, error as Error);
    }
  }

  /**
   * Save transcript to storage
   */
  private async saveTranscript(
    file: BatchFile,
    result: TranscriptionResult,
  ): Promise<string> {
    try {
      // Generate unique ID
      const id = `transcript-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      // Save audio blob
      let audioFileId: string | undefined;
      if (file.file && file.file.size > 0) {
        audioFileId = `audio-${id}`;
        await blobStorage.save(audioFileId, file.file);
      }

      // Sanitize chunks to remove/fix invalid timestamps
      const sanitizedChunks = sanitizeChunks(
        result.transcript.chunks as TranscriptChunk[],
      );

      // Calculate metadata
      const lastChunk = sanitizedChunks[sanitizedChunks.length - 1];
      const duration = lastChunk?.timestamp[1] || 0;
      const speakerCount = new Set(result.segments.map((s) => s.label))
        .size;

      const language = (file as any)._language || "en";
      const model =
        (file as any)._model || "onnx-community/whisper-base_timestamped";

      // Create transcript object with sanitized chunks
      const transcript = {
        id,
        transcript: {
          text: result.transcript.text,
          chunks: sanitizedChunks,
        },
        segments: result.segments.map((s) => ({
          label: s.label,
          start: s.start,
          end: s.end,
        })) as SpeakerSegment[],
        audioFileId,
        metadata: {
          fileName: file.fileName,
          duration,
          speakerCount,
          language,
          model,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      };

      // Save (Zod validation happens automatically)
      await transcripts.set(id, transcript);

      // Notify other components that transcripts have changed
      window.dispatchEvent(new Event("transcripts-changed"));

      return id;
    } catch (error) {
      console.error("Failed to save transcript:", error);
      throw error;
    }
  }

  /**
   * Handle file error
   */
  private handleFileError(fileId: string, error: Error): void {
    const store = useBatchStore.getState();
    const file = store.files.find((f) => f.id === fileId);

    if (!file) return;

    const errorMessage = error.message || "Unknown error";

    // Check if it's a network/model loading error - these shouldn't retry automatically
    const isModelError =
      errorMessage.includes("Failed to fetch") ||
      errorMessage.includes("Unauthorized access") ||
      errorMessage.includes("model");

    // Check if we should retry (but not for model loading errors)
    if (file.retryCount < 3 && !isModelError) {
      console.log(
        `🔄 Retrying ${file.fileName} (attempt ${file.retryCount + 1}/3)`,
      );
      store.retryFile(fileId);
    } else {
      if (isModelError) {
        console.error(
          `❌ ${file.fileName}: Model loading error - ${errorMessage}`,
        );
        // Add helpful message
        const helpfulError = `Model loading failed. Please ensure you have an internet connection for first-time model download, or load the model in single-file mode first. Error: ${errorMessage}`;
        store.setFileStatus(fileId, "error", helpfulError);
      } else {
        console.error(
          `❌ ${file.fileName}: Max retries reached - ${errorMessage}`,
        );
        store.setFileStatus(fileId, "error", errorMessage);
      }
      store.decrementProcessingCount();
    }

    // Release worker
    const workerId = store.getProcessingFileWorker(fileId);
    if (workerId) {
      batchWorkerPool.releaseWorker(workerId);
      store.removeProcessingFile(fileId);
    }

    // Cleanup audio buffer from memory
    this.audioBuffers.delete(fileId);
  }

  /**
   * Pause processing
   */
  pause(): void {
    const store = useBatchStore.getState();
    store.pauseBatch();
    console.log("⏸️ Batch processing paused");
  }

  /**
   * Resume processing
   */
  resume(): void {
    const store = useBatchStore.getState();
    store.resumeBatch();

    if (!store.isQueueRunning) {
      this.start(this.completionCallback);
    }

    console.log("▶️ Batch processing resumed");
  }

  /**
   * Cancel all processing
   */
  cancelAll(): void {
    const store = useBatchStore.getState();
    store.setQueueRunning(false);

    // Cancel all processing files
    for (const [fileId, workerId] of store.processingFiles.entries()) {
      batchWorkerPool.cancelWork(fileId);
    }

    store.clearAll();

    console.log("🚫 All batch processing cancelled");
  }

  /**
   * Cancel specific file
   */
  cancelFile(fileId: string): void {
    const store = useBatchStore.getState();
    const file = store.files.find((f) => f.id === fileId);

    if (!file) return;

    if (file.status === "processing") {
      // Cancel worker
      batchWorkerPool.cancelWork(fileId);
      store.removeProcessingFile(fileId);
      store.decrementProcessingCount();
    }

    // Update store
    store.cancelFile(fileId);

    console.log(`🚫 Cancelled ${file.fileName}`);
  }

  /**
   * Cleanup
   */
  terminate(): void {
    const store = useBatchStore.getState();
    store.setQueueRunning(false);
    store.setQueueInitialized(false);
    store.setIsAssigning(false);

    // Unsubscribe from workers
    for (const unsubscribe of this.workerSubscriptions.values()) {
      unsubscribe();
    }
    this.workerSubscriptions.clear();

    // Terminate worker pool
    batchWorkerPool.terminateAll();

    // Clear audio buffers
    this.audioBuffers.clear();

    console.log("🗑️ BatchQueueManager terminated");
  }
}

// Singleton instance
export const batchQueueManager = new BatchQueueManager();
