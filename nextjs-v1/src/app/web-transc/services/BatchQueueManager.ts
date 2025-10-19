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

class BatchQueueManager {
  private isRunning = false;
  private processingFiles: Map<string, string> = new Map(); // fileId -> workerId
  private workerSubscriptions: Map<string, () => void> = new Map(); // workerId -> unsubscribe
  private completionCallback?: () => void;
  private lastLoggedProgress: Map<string, number> = new Map(); // fileId -> last logged progress %
  private audioBuffers: Map<string, { audio: Float32Array; language: string; model: string }> = new Map(); // fileId -> audio data

  /**
   * Initialize the queue manager and worker pool
   */
  async initialize(): Promise<boolean> {
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
      console.log("✅ BatchQueueManager initialized");
    }
    return success;
  }

  /**
   * Start processing the queue
   */
  async start(onComplete?: () => void): Promise<void> {
    if (this.isRunning) {
      console.log("⚠️ Queue is already running");
      return;
    }

    this.completionCallback = onComplete;
    this.isRunning = true;
    console.log("▶️ Starting batch queue processing");

    // Start the processing loop
    await this.processQueue();
  }

  /**
   * Main processing loop
   */
  private async processQueue(): Promise<void> {
    if (!this.isRunning) return;

    const store = useBatchStore.getState();

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
      this.isRunning = false;
      console.log("✅ Batch processing complete");
      if (this.completionCallback) {
        this.completionCallback();
      }
      return;
    }

    // Try to assign work to available workers
    if (store.canStartProcessing()) {
      const availableWorker = batchWorkerPool.getAvailableWorker();

      if (availableWorker && queuedFiles.length > 0) {
        const file = queuedFiles[0]; // Get first queued file
        await this.assignFileToWorker(file, availableWorker);
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
      this.processingFiles.set(batchFile.id, workerId);

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
      // Read and decode audio file
      const audioBuffer = await this.readAndDecodeAudio(batchFile.file);
      console.log(`✅ Audio decoded: ${audioBuffer.length} samples`);

      // Get current language and model from Whisper store
      // Use the same settings as the single-file upload for consistency
      const whisperState = useWhisperStore.getState();
      const language = whisperState.audio.language || "en";
      const model = whisperState.model.model || DEFAULT_MODEL;
      const device = whisperState.model.device || "wasm"; // wasm is safer for batch (uses less GPU memory)

      console.log(
        `📤 Processing ${batchFile.fileName} with model: ${model}, device: ${device}, language: ${language}`,
      );

      // Load model first
      batchWorkerPool.postMessage(workerId, {
        type: "load",
        data: {
          device: device,
          model: model,
        },
      });

      // After model loads, we'll start transcription (handled in message handler)
      // Store audio buffer in Map (can't store on file object due to Zustand immutability)
      this.audioBuffers.set(batchFile.id, {
        audio: audioBuffer,
        language: language,
        model: model,
      });
      console.log(`💾 Stored audio buffer (${audioBuffer.length} samples) in Map for file ${batchFile.id}`);
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

    // Get the file ID from the worker pool service (it tracks currentFileId)
    const fileId = batchWorkerPool.getCurrentFileId(workerId);

    if (!fileId) {
      // It's OK to not have a file assigned during initialization
      // Just log at debug level and ignore these messages
      if (message.status !== "loading" && message.status !== "loaded") {
        console.warn(
          `⚠️ Received message from ${workerId} but no file is assigned`,
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
    const spamStatuses = ["progress", "processing_progress", "initiate", "download", "done", "ready"];
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
        console.log(`🔍 Audio buffer length: ${audioData?.audio?.length || 0}`);
        console.log(`🔍 Language: ${audioData?.language || 'not found'}`);

        if (audioData && audioData.audio) {
          console.log(`🚀 Sending "run" message to worker with ${audioData.audio.length} audio samples`);
          batchWorkerPool.postMessage(workerId, {
            type: "run",
            data: {
              audio: audioData.audio,
              language: audioData.language,
            },
          });
          console.log(`✅ "run" message sent to ${workerId}`);
        } else {
          console.error(`❌ No audio buffer found in Map for ${file.fileName} (id: ${fileId})!`);
          this.handleFileError(fileId, new Error('Audio buffer not found'));
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

          // Only log every 10% to avoid spam
          const lastLogged = this.lastLoggedProgress.get(fileId) || 0;
          const progressRounded = Math.floor(progress / 10) * 10;
          if (progressRounded > lastLogged && progressRounded <= 100) {
            console.log(
              `📊 ${file.fileName}: ${progressRounded}% complete`,
            );
            this.lastLoggedProgress.set(fileId, progressRounded);
          }
        }
        break;

      case "complete":
        // Transcription complete
        if (message.result) {
          console.log(`✅ ${file.fileName}: Transcription complete`);
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

      // Save transcript to storage
      const transcriptId = await this.saveTranscript(file, result);

      // Update file status
      store.setFileStatus(fileId, "completed", undefined, transcriptId);
      store.decrementProcessingCount();

      // Release worker
      const workerId = this.processingFiles.get(fileId);
      if (workerId) {
        batchWorkerPool.releaseWorker(workerId);
        this.processingFiles.delete(fileId);
      }

      // Cleanup audio buffer from memory
      this.audioBuffers.delete(fileId);
      this.lastLoggedProgress.delete(fileId);

      console.log(`💾 ${file.fileName}: Saved as ${transcriptId}`);
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

      // Calculate metadata
      const lastChunk =
        result.transcript.chunks[result.transcript.chunks.length - 1];
      const duration = lastChunk?.timestamp[1] || 0;
      const speakerCount = new Set(result.segments.map((s) => s.label))
        .size;

      const language = (file as any)._language || "en";
      const model = (file as any)._model || "whisper-base";

      // Create transcript object
      const transcript = {
        id,
        transcript: {
          text: result.transcript.text,
          chunks: result.transcript.chunks as TranscriptChunk[],
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
    const workerId = this.processingFiles.get(fileId);
    if (workerId) {
      batchWorkerPool.releaseWorker(workerId);
      this.processingFiles.delete(fileId);
    }

    // Cleanup audio buffer from memory
    this.audioBuffers.delete(fileId);
    this.lastLoggedProgress.delete(fileId);
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

    if (!this.isRunning) {
      this.start(this.completionCallback);
    }

    console.log("▶️ Batch processing resumed");
  }

  /**
   * Cancel all processing
   */
  cancelAll(): void {
    this.isRunning = false;

    // Cancel all processing files
    for (const [fileId, workerId] of this.processingFiles.entries()) {
      batchWorkerPool.cancelWork(fileId);
    }

    this.processingFiles.clear();

    const store = useBatchStore.getState();
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
      this.processingFiles.delete(fileId);
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
    this.isRunning = false;

    // Unsubscribe from workers
    for (const unsubscribe of this.workerSubscriptions.values()) {
      unsubscribe();
    }
    this.workerSubscriptions.clear();

    // Terminate worker pool
    batchWorkerPool.terminateAll();

    this.processingFiles.clear();

    console.log("🗑️ BatchQueueManager terminated");
  }
}

// Singleton instance
export const batchQueueManager = new BatchQueueManager();
