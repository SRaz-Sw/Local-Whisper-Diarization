/**
 * Batch Worker Pool Service
 * Manages a pool of 2 workers for concurrent batch processing
 */

type WorkerStatus = "idle" | "loading" | "busy";

interface WorkerInstance {
  worker: Worker;
  status: WorkerStatus;
  currentFileId?: string;
  messageHandlers: Set<(e: MessageEvent) => void>;
  errorHandlers: Set<(error: ErrorEvent) => void>;
}

export interface WorkerMessage {
  workerId: string;
  data: any;
}

class BatchWorkerPoolService {
  private workers: Map<string, WorkerInstance> = new Map();
  private poolSize = 1; // Max 2 concurrent workers
  private isInitialized = false;

  /**
   * Initialize worker pool (creates 2 workers)
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      console.log("✅ Worker pool already initialized");
      return true;
    }

    try {
      const isDev = process.env.NODE_ENV === "development";

      // Create 2 workers
      for (let i = 0; i < this.poolSize; i++) {
        const workerId = `worker-${i}`;
        let worker: Worker;

        if (isDev) {
          worker = new Worker(
            new URL(
              "../workers/whisperDiarization.worker.js",
              import.meta.url,
            ),
            { type: "module" },
          );
        } else {
          worker = new Worker("/workers/whisperDiarization.worker.js");
        }

        const instance: WorkerInstance = {
          worker,
          status: "idle",
          messageHandlers: new Set(),
          errorHandlers: new Set(),
        };

        // Set up message handling
        worker.addEventListener("message", (e: MessageEvent) => {
          this.handleMessage(workerId, e);
        });

        worker.addEventListener("error", (error: ErrorEvent) => {
          this.handleError(workerId, error);
        });

        this.workers.set(workerId, instance);
        console.log(`✅ Worker ${workerId} initialized`);
      }

      this.isInitialized = true;
      console.log(
        `✅ Worker pool initialized with ${this.poolSize} workers`,
      );
      return true;
    } catch (error) {
      console.error("❌ Failed to initialize worker pool:", error);
      return false;
    }
  }

  /**
   * Get an available worker ID (idle or loading complete)
   */
  getAvailableWorker(): string | null {
    for (const [workerId, instance] of this.workers.entries()) {
      if (instance.status === "idle") {
        return workerId;
      }
    }
    return null;
  }

  /**
   * Get worker status
   */
  getWorkerStatus(workerId: string): WorkerStatus | null {
    const instance = this.workers.get(workerId);
    return instance ? instance.status : null;
  }

  /**
   * Get file ID currently being processed by worker
   */
  getCurrentFileId(workerId: string): string | undefined {
    const instance = this.workers.get(workerId);
    return instance?.currentFileId;
  }

  /**
   * Subscribe to worker messages
   */
  subscribe(
    workerId: string,
    handler: (e: MessageEvent) => void,
  ): () => void {
    const instance = this.workers.get(workerId);
    if (!instance) {
      console.error(`❌ Worker ${workerId} not found`);
      return () => {};
    }

    instance.messageHandlers.add(handler);
    return () => instance.messageHandlers.delete(handler);
  }

  /**
   * Subscribe to worker errors
   */
  onError(
    workerId: string,
    handler: (error: ErrorEvent) => void,
  ): () => void {
    const instance = this.workers.get(workerId);
    if (!instance) {
      console.error(`❌ Worker ${workerId} not found`);
      return () => {};
    }

    instance.errorHandlers.add(handler);
    return () => instance.errorHandlers.delete(handler);
  }

  /**
   * Post message to specific worker
   */
  postMessage(workerId: string, data: any): void {
    const instance = this.workers.get(workerId);
    if (!instance) {
      console.error(`❌ Worker ${workerId} not found`);
      return;
    }

    instance.worker.postMessage(data);
  }

  /**
   * Assign work to a specific worker
   */
  assignWork(workerId: string, fileId: string): boolean {
    const instance = this.workers.get(workerId);
    if (!instance) {
      console.error(`❌ Worker ${workerId} not found`);
      return false;
    }

    if (instance.status !== "idle") {
      console.warn(
        `⚠️ Worker ${workerId} is not idle (status: ${instance.status})`,
      );
      return false;
    }

    instance.status = "busy";
    instance.currentFileId = fileId;
    console.log(`📤 Assigned file ${fileId} to ${workerId}`);
    return true;
  }

  /**
   * Mark worker as idle after work completion
   */
  releaseWorker(workerId: string): void {
    const instance = this.workers.get(workerId);
    if (!instance) {
      console.error(`❌ Worker ${workerId} not found`);
      return;
    }

    instance.status = "idle";
    instance.currentFileId = undefined;
    console.log(`✅ Worker ${workerId} released and ready for next task`);
  }

  /**
   * Update worker status
   */
  setWorkerStatus(workerId: string, status: WorkerStatus): void {
    const instance = this.workers.get(workerId);
    if (!instance) {
      console.error(`❌ Worker ${workerId} not found`);
      return;
    }

    instance.status = status;
  }

  /**
   * Cancel work on specific file
   */
  cancelWork(fileId: string): boolean {
    for (const [workerId, instance] of this.workers.entries()) {
      if (instance.currentFileId === fileId) {
        // Terminate and recreate the worker (easiest way to cancel)
        this.recreateWorker(workerId);
        console.log(`🚫 Cancelled work for file ${fileId} on ${workerId}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Recreate a specific worker
   */
  private async recreateWorker(workerId: string): Promise<boolean> {
    const instance = this.workers.get(workerId);
    if (!instance) {
      console.error(`❌ Worker ${workerId} not found`);
      return false;
    }

    try {
      // Terminate old worker
      instance.worker.terminate();

      // Create new worker
      const isDev = process.env.NODE_ENV === "development";
      let newWorker: Worker;

      if (isDev) {
        newWorker = new Worker(
          new URL(
            "../workers/whisperDiarization.worker.js",
            import.meta.url,
          ),
          { type: "module" },
        );
      } else {
        newWorker = new Worker("/workers/whisperDiarization.worker.js");
      }

      // Update instance
      instance.worker = newWorker;
      instance.status = "idle";
      instance.currentFileId = undefined;

      // Re-setup event listeners
      newWorker.addEventListener("message", (e: MessageEvent) => {
        this.handleMessage(workerId, e);
      });

      newWorker.addEventListener("error", (error: ErrorEvent) => {
        this.handleError(workerId, error);
      });

      console.log(`🔄 Worker ${workerId} recreated`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to recreate worker ${workerId}:`, error);
      return false;
    }
  }

  /**
   * Get all worker IDs
   */
  getWorkerIds(): string[] {
    return Array.from(this.workers.keys());
  }

  /**
   * Get count of busy workers
   */
  getBusyCount(): number {
    let count = 0;
    for (const instance of this.workers.values()) {
      if (instance.status === "busy") {
        count++;
      }
    }
    return count;
  }

  /**
   * Check if pool is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.workers.size === this.poolSize;
  }

  /**
   * Terminate all workers (cleanup)
   */
  terminateAll(): void {
    for (const [workerId, instance] of this.workers.entries()) {
      instance.worker.terminate();
      instance.messageHandlers.clear();
      instance.errorHandlers.clear();
      console.log(`🗑️ Worker ${workerId} terminated`);
    }

    this.workers.clear();
    this.isInitialized = false;
    console.log("🗑️ Worker pool terminated");
  }

  /**
   * Internal message handler - broadcasts to worker's subscribers
   */
  private handleMessage(workerId: string, e: MessageEvent): void {
    const instance = this.workers.get(workerId);
    if (!instance) return;

    instance.messageHandlers.forEach((handler) => {
      try {
        handler(e);
      } catch (error) {
        console.error(`Error in message handler for ${workerId}:`, error);
      }
    });
  }

  /**
   * Internal error handler - broadcasts to worker's subscribers
   */
  private handleError(workerId: string, error: ErrorEvent): void {
    const instance = this.workers.get(workerId);
    if (!instance) return;

    instance.errorHandlers.forEach((handler) => {
      try {
        handler(error);
      } catch (err) {
        console.error(`Error in error handler for ${workerId}:`, err);
      }
    });
  }
}

// Singleton instance
export const batchWorkerPool = new BatchWorkerPoolService();
