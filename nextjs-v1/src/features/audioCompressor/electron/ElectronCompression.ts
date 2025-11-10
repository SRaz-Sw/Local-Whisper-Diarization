/**
 * Electron Compression Service
 *
 * Wrapper around Electron IPC for native FFmpeg compression
 */

import type {
  CompressionOptions,
  CompressionResult,
  CompressionError,
  CompressionProgress,
} from "../core/types";

/**
 * Active compression tracking
 */
interface ActiveCompression {
  resolve: (result: CompressionResult) => void;
  reject: (error: CompressionError) => void;
  compressionId: string;
  onProgress?: (progress: CompressionProgress) => void;
}

/**
 * Electron Compression Service
 *
 * Communicates with main process via IPC for native FFmpeg compression
 */
export class ElectronCompressionService {
  private activeCompressions: Map<string, ActiveCompression> = new Map();
  private compressionCounter = 0;
  private ipcRenderer: any;

  constructor() {
    // Get IPC renderer (only available in Electron renderer process)
    if (typeof window !== "undefined" && (window as any).require) {
      try {
        const electron = (window as any).require("electron");
        this.ipcRenderer = electron.ipcRenderer;
      } catch (error) {
        console.warn("Failed to get IPC renderer:", error);
      }
    }

    // Set up progress listener
    if (this.ipcRenderer) {
      this.ipcRenderer.on(
        "compression-progress",
        this.handleProgressUpdate.bind(this),
      );
    }
  }

  /**
   * Generate unique compression ID
   */
  private generateCompressionId(): string {
    return `compression-${Date.now()}-${++this.compressionCounter}`;
  }

  /**
   * Handle progress updates from main process
   */
  private handleProgressUpdate(
    event: any,
    data: { compressionId: string; progress: CompressionProgress },
  ): void {
    const { compressionId, progress } = data;
    const activeCompression = this.activeCompressions.get(compressionId);

    if (activeCompression && activeCompression.onProgress) {
      activeCompression.onProgress(progress);
    }
  }

  /**
   * Compress audio blob
   */
  async compress(
    audioBlob: Blob,
    options: CompressionOptions = {},
  ): Promise<CompressionResult> {
    if (!this.ipcRenderer) {
      throw {
        code: "IPC_UNAVAILABLE",
        message: "IPC renderer not available. Not running in Electron?",
      } as CompressionError;
    }

    const compressionId = this.generateCompressionId();

    // Convert blob to Uint8Array
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioData = new Uint8Array(arrayBuffer);

    // Set up promise
    return new Promise<CompressionResult>((resolve, reject) => {
      // Store active compression
      this.activeCompressions.set(compressionId, {
        resolve,
        reject,
        compressionId,
        onProgress: options.onProgress,
      });

      // Call IPC handler
      this.ipcRenderer
        .invoke("compress-audio", {
          audioData,
          options,
          compressionId,
        })
        .then(
          (result: {
            bufferData: number[];
            mimeType: string;
            originalSize: number;
            compressedSize: number;
            compressionRatio: number;
            duration: number;
            codec: string;
          }) => {
            // Convert buffer data to Blob
            const blob = new Blob([new Uint8Array(result.bufferData)], {
              type: result.mimeType,
            });

            const compressionResult: CompressionResult = {
              blob,
              originalSize: result.originalSize,
              compressedSize: result.compressedSize,
              compressionRatio: result.compressionRatio,
              duration: result.duration,
              codec: result.codec,
            };

            this.activeCompressions.delete(compressionId);
            resolve(compressionResult);
          },
        )
        .catch((error: CompressionError) => {
          this.activeCompressions.delete(compressionId);
          reject(error);
        });
    });
  }

  /**
   * Cancel compression
   */
  async cancel(compressionId: string): Promise<boolean> {
    if (!this.ipcRenderer) {
      return false;
    }

    try {
      const cancelled = await this.ipcRenderer.invoke(
        "cancel-compression",
        {
          compressionId,
        },
      );

      if (cancelled) {
        const activeCompression =
          this.activeCompressions.get(compressionId);
        if (activeCompression) {
          activeCompression.reject({
            code: "CANCELLED",
            message: "Compression cancelled by user",
          });
          this.activeCompressions.delete(compressionId);
        }
      }

      return cancelled;
    } catch (error) {
      console.error("Failed to cancel compression:", error);
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Cancel all active compressions
    for (const [id, compression] of this.activeCompressions.entries()) {
      compression.reject({
        code: "CANCELLED",
        message: "Compression cancelled due to cleanup",
      });
    }
    this.activeCompressions.clear();

    // Remove progress listener
    if (this.ipcRenderer) {
      this.ipcRenderer.removeAllListeners("compression-progress");
    }
  }

  /**
   * Check if compression is available
   */
  static isAvailable(): boolean {
    return (
      typeof window !== "undefined" &&
      (window as any).require !== undefined &&
      typeof (window as any).require("electron") !== "undefined"
    );
  }
}
