/**
 * Whisper Worker Service
 * Manages worker lifecycle to prevent recreation during view transitions
 * Singleton pattern ensures one worker instance across the app
 */

type MessageHandler = (e: MessageEvent) => void;
type ErrorHandler = (error: ErrorEvent) => void;

class WhisperWorkerService {
  private worker: Worker | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private isInitialized = false;

  /**
   * Initialize worker (called once at app startup)
   */
  initialize(): boolean {
    if (this.isInitialized && this.worker) {
      console.log('✅ Worker already initialized');
      return true;
    }

    try {
      const isDev = process.env.NODE_ENV === 'development';

      if (isDev) {
        this.worker = new Worker(
          new URL('../workers/whisperDiarization.worker.js', import.meta.url),
          { type: 'module' }
        );
      } else {
        this.worker = new Worker('/workers/whisperDiarization.worker.js');
      }

      this.worker.addEventListener('message', this.handleMessage);
      this.worker.addEventListener('error', this.handleError);

      this.isInitialized = true;
      console.log('✅ Worker initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize worker:', error);
      const errorMessage =
        typeof error === 'object' && error !== null && 'message' in error
          ? (error as { message: string }).message
          : 'Unknown error';
      alert(
        `Failed to initialize worker: ${errorMessage}. Check console for details.`
      );
      return false;
    }
  }

  /**
   * Subscribe to worker messages
   * @returns Unsubscribe function
   */
  subscribe(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    // Return unsubscribe function
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Subscribe to worker errors
   * @returns Unsubscribe function
   */
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  /**
   * Post message to worker
   */
  postMessage(data: any): void {
    if (!this.worker) {
      console.error('❌ Worker not initialized. Call initialize() first.');
      return;
    }
    this.worker.postMessage(data);
  }

  /**
   * Terminate worker (cleanup on unmount)
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.messageHandlers.clear();
      this.errorHandlers.clear();
      console.log('🗑️ Worker terminated');
    }
  }

  /**
   * Recreate worker (for reset scenarios)
   */
  recreate(): boolean {
    console.log('🔄 Recreating worker...');
    this.terminate();
    return this.initialize();
  }

  /**
   * Check if worker is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.worker !== null;
  }

  /**
   * Internal message handler - broadcasts to all subscribers
   */
  private handleMessage = (e: MessageEvent) => {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(e);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  };

  /**
   * Internal error handler - broadcasts to all subscribers
   */
  private handleError = (error: ErrorEvent) => {
    this.errorHandlers.forEach((handler) => {
      try {
        handler(error);
      } catch (err) {
        console.error('Error in error handler:', err);
      }
    });
  };
}

// Singleton instance
export const whisperWorker = new WhisperWorkerService();
