/**
 * Compression Queue
 *
 * Manages batch compression jobs with concurrency control
 */

import { CompressionService } from "../core/CompressionService";
import type {
  CompressionOptions,
  CompressionResult,
  CompressionError,
  CompressionProgress,
  QueueItem,
} from "../core/types";

/**
 * Queue listener callbacks
 */
type ProgressCallback = (progress: CompressionProgress) => void;
type CompleteCallback = (result: CompressionResult) => void;
type ErrorCallback = (error: CompressionError) => void;

/**
 * Compression Queue
 *
 * Manages multiple compression jobs with concurrency control
 */
export class CompressionQueue {
  private queue: QueueItem[] = [];
  private processing: Map<string, QueueItem> = new Map();
  private maxConcurrent: number = 3;
  private listeners: Map<
    string,
    {
      progress?: Set<ProgressCallback>;
      complete?: Set<CompleteCallback>;
      error?: Set<ErrorCallback>;
    }
  > = new Map();
  private compressionService: CompressionService;

  constructor() {
    this.compressionService = CompressionService.getInstance();
  }

  /**
   * Add compression job to queue
   */
  add(audioBlob: Blob, options?: CompressionOptions): string {
    const id = `queue-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const queueItem: QueueItem = {
      id,
      audioBlob,
      options: options || {},
      status: "pending",
      progress: 0,
      createdAt: Date.now(),
    };

    this.queue.push(queueItem);
    this.listeners.set(id, {});

    // Start processing if not at max concurrency
    this.processQueue();

    return id;
  }

  /**
   * Remove job from queue (if pending)
   */
  remove(id: string): boolean {
    const index = this.queue.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.listeners.delete(id);
      return true;
    }

    // If processing, try to cancel
    const processingItem = this.processing.get(id);
    if (processingItem) {
      // Note: Cancellation depends on implementation
      // For now, just mark as failed
      processingItem.status = "failed";
      processingItem.error = {
        code: "CANCELLED",
        message: "Job cancelled",
      };
      this.processing.delete(id);
      this.notifyError(id, processingItem.error);
      return true;
    }

    return false;
  }

  /**
   * Get status of a job
   */
  getStatus(id: string): QueueItem | null {
    // Check queue
    const queuedItem = this.queue.find((item) => item.id === id);
    if (queuedItem) {
      return queuedItem;
    }

    // Check processing
    const processingItem = this.processing.get(id);
    if (processingItem) {
      return processingItem;
    }

    return null;
  }

  /**
   * Get all job statuses
   */
  getAllStatuses(): QueueItem[] {
    return [...this.queue, ...Array.from(this.processing.values())];
  }

  /**
   * Register progress callback
   */
  onProgress(id: string, callback: ProgressCallback): () => void {
    const listeners = this.listeners.get(id);
    if (!listeners) {
      console.warn(`No listeners found for job ${id}`);
      return () => {};
    }

    if (!listeners.progress) {
      listeners.progress = new Set();
    }
    listeners.progress.add(callback);

    // Return unsubscribe function
    return () => {
      listeners.progress?.delete(callback);
    };
  }

  /**
   * Register complete callback
   */
  onComplete(id: string, callback: CompleteCallback): () => void {
    const listeners = this.listeners.get(id);
    if (!listeners) {
      console.warn(`No listeners found for job ${id}`);
      return () => {};
    }

    if (!listeners.complete) {
      listeners.complete = new Set();
    }
    listeners.complete.add(callback);

    // Return unsubscribe function
    return () => {
      listeners.complete?.delete(callback);
    };
  }

  /**
   * Register error callback
   */
  onError(id: string, callback: ErrorCallback): () => void {
    const listeners = this.listeners.get(id);
    if (!listeners) {
      console.warn(`No listeners found for job ${id}`);
      return () => {};
    }

    if (!listeners.error) {
      listeners.error = new Set();
    }
    listeners.error.add(callback);

    // Return unsubscribe function
    return () => {
      listeners.error?.delete(callback);
    };
  }

  /**
   * Process queue
   */
  private processQueue(): void {
    // Don't process if at max concurrency
    if (this.processing.size >= this.maxConcurrent) {
      return;
    }

    // Get next item from queue
    const nextItem = this.queue.shift();
    if (!nextItem) {
      return;
    }

    // Move to processing
    nextItem.status = "processing";
    nextItem.startedAt = Date.now();
    this.processing.set(nextItem.id, nextItem);

    // Start compression
    this.processItem(nextItem).catch((error) => {
      console.error(`Failed to process item ${nextItem.id}:`, error);
    });
  }

  /**
   * Process a single item
   */
  private async processItem(item: QueueItem): Promise<void> {
    try {
      // Merge progress callback
      const options: CompressionOptions = {
        ...item.options,
        onProgress: (progress) => {
          item.progress = progress.percent;
          this.notifyProgress(item.id, progress);

          // Call original callback if provided
          if (item.options.onProgress) {
            item.options.onProgress(progress);
          }
        },
      };

      // Compress
      const result = await this.compressionService.compress(
        item.audioBlob,
        options,
      );

      console.log("processItem ______________ Result = _____________:");
      console.log(result);
      console.log("duration processing took:", result.duration);

      // Update item
      item.status = "completed";
      item.result = result;
      item.progress = 100;
      item.completedAt = Date.now();

      // Remove from processing
      this.processing.delete(item.id);

      // Notify completion
      this.notifyComplete(item.id, result);

      // Process next item
      this.processQueue();
    } catch (error) {
      // Update item
      item.status = "failed";
      item.error = {
        code: "COMPRESSION_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Unknown compression error",
        originalError: error instanceof Error ? error : undefined,
      };
      item.completedAt = Date.now();

      // Remove from processing
      this.processing.delete(item.id);

      // Notify error
      this.notifyError(item.id, item.error);

      // Process next item
      this.processQueue();
    }
  }

  /**
   * Notify progress listeners
   */
  private notifyProgress(id: string, progress: CompressionProgress): void {
    const listeners = this.listeners.get(id);
    if (listeners?.progress) {
      listeners.progress.forEach((callback) => {
        try {
          callback(progress);
        } catch (error) {
          console.error("Error in progress callback:", error);
        }
      });
    }
  }

  /**
   * Notify complete listeners
   */
  private notifyComplete(id: string, result: CompressionResult): void {
    const listeners = this.listeners.get(id);
    console.log("notifyComplete listeners:", listeners);
    console.log("notifyComplete result:", result);
    if (listeners?.complete) {
      listeners.complete.forEach((callback) => {
        try {
          callback(result);
        } catch (error) {
          console.error("Error in complete callback:", error);
        }
      });
    }
  }

  /**
   * Notify error listeners
   */
  private notifyError(id: string, error: CompressionError): void {
    const listeners = this.listeners.get(id);
    if (listeners?.error) {
      listeners.error.forEach((callback) => {
        try {
          callback(error);
        } catch (err) {
          console.error("Error in error callback:", err);
        }
      });
    }
  }

  /**
   * Set maximum concurrent compressions
   */
  setMaxConcurrent(max: number): void {
    if (max < 1) {
      throw new Error("Max concurrent must be at least 1");
    }
    this.maxConcurrent = max;

    // Process more items if we increased concurrency
    while (
      this.processing.size < this.maxConcurrent &&
      this.queue.length > 0
    ) {
      this.processQueue();
    }
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get number of processing jobs
   */
  getProcessingCount(): number {
    return this.processing.size;
  }

  /**
   * Clear all jobs
   */
  clear(): void {
    // Cancel all processing jobs
    for (const [id] of this.processing.entries()) {
      this.remove(id);
    }

    // Clear queue
    this.queue = [];
    this.listeners.clear();
  }
}

/**
 * Singleton instance
 */
export const compressionQueue = new CompressionQueue();
