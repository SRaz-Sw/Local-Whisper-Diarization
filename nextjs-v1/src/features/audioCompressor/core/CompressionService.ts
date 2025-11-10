/**
 * Compression Service
 *
 * Unified API for audio compression that auto-detects environment
 * and uses appropriate implementation (Browser FFmpeg.wasm or Electron native FFmpeg)
 */

import type {
  CompressionOptions,
  CompressionResult,
  CompressionEnvironment,
} from "./types";
import { BrowserCompressionService } from "../browser/BrowserCompression";
import { ElectronCompressionService } from "../electron/ElectronCompression";

/**
 * Compression Service
 *
 * Singleton service that provides unified compression API
 */
export class CompressionService {
  private static instance: CompressionService | null = null;
  private implementation:
    | BrowserCompressionService
    | ElectronCompressionService
    | null = null;
  private environment: CompressionEnvironment;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    this.environment = this.detectEnvironment();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): CompressionService {
    if (!CompressionService.instance) {
      CompressionService.instance = new CompressionService();
    }
    return CompressionService.instance;
  }

  /**
   * Detect current environment
   */
  private detectEnvironment(): CompressionEnvironment {
    // Check if we're in Electron renderer process
    if (
      typeof window !== "undefined" &&
      (window as any).require &&
      typeof (window as any).require("electron") !== "undefined"
    ) {
      return "electron";
    }

    // Default to browser
    return "browser";
  }

  /**
   * Initialize the appropriate implementation
   */
  private async initializeImplementation(): Promise<void> {
    if (this.implementation) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        if (this.environment === "electron") {
          if (ElectronCompressionService.isAvailable()) {
            this.implementation = new ElectronCompressionService();
            console.log("✅ Using Electron native FFmpeg compression");
          } else {
            throw new Error("Electron compression not available");
          }
        } else {
          if (BrowserCompressionService.isAvailable()) {
            this.implementation = new BrowserCompressionService();
            console.log("✅ Using browser FFmpeg.wasm compression");
          } else {
            throw new Error("Browser compression not available");
          }
        }
      } catch (error) {
        console.error("Failed to initialize compression service:", error);
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  /**
   * Compress audio blob
   */
  async compress(
    audioBlob: Blob,
    options?: CompressionOptions,
  ): Promise<CompressionResult> {
    await this.initializeImplementation();

    if (!this.implementation) {
      throw new Error("Compression service not initialized");
    }

    const result = this.implementation.compress(audioBlob, options || {});
    console.log(
      "CompressionService ______________ compress result:",
      result,
    );
    return result;
  }

  /**
   * Check if compression is available
   */
  isAvailable(): boolean {
    if (this.environment === "electron") {
      return ElectronCompressionService.isAvailable();
    } else {
      return BrowserCompressionService.isAvailable();
    }
  }

  /**
   * Get current environment
   */
  getEnvironment(): CompressionEnvironment {
    return this.environment;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.implementation) {
      if (this.implementation instanceof BrowserCompressionService) {
        this.implementation.cleanup();
      } else if (
        this.implementation instanceof ElectronCompressionService
      ) {
        this.implementation.cleanup();
      }
      this.implementation = null;
    }
    this.initializationPromise = null;
  }
}

/**
 * Main exported function for convenience
 *
 * Compresses audio blob using appropriate implementation
 *
 * @param audioBlob - Audio blob to compress
 * @param options - Compression options
 * @returns Compressed audio blob
 */
export async function compressAudio(
  audioBlob: Blob,
  options?: CompressionOptions,
): Promise<Blob> {
  const service = CompressionService.getInstance();
  const result = await service.compress(audioBlob, options);
  return result.blob;
}

/**
 * Check if compression is available
 */
export function isCompressionAvailable(): boolean {
  const service = CompressionService.getInstance();
  return service.isAvailable();
}
