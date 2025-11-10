/**
 * Browser Compression Service
 *
 * Uses FFmpeg.wasm for browser-based audio compression
 * Note: FFmpeg.wasm runs in the main thread and handles workers internally
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";
import type {
  CompressionOptions,
  CompressionResult,
  CompressionError,
  CompressionProgress,
} from "../core/types";

/**
 * Browser Compression Service
 *
 * Uses FFmpeg.wasm directly without wrapping in a worker
 * (FFmpeg handles threading internally)
 */
export class BrowserCompressionService {
  private ffmpeg: FFmpeg | null = null;
  private isInitializing = false;
  private compressionCounter = 0;

  /**
   * Initialize FFmpeg instance
   */
  private async initializeFFmpeg(): Promise<FFmpeg> {
    if (this.ffmpeg) {
      return this.ffmpeg;
    }

    if (this.isInitializing) {
      // Wait for initialization to complete
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.isInitializing && this.ffmpeg) {
            clearInterval(checkInterval);
            resolve(this.ffmpeg);
          }
        }, 100);
      });
    }

    this.isInitializing = true;

    try {
      console.log("📦 Initializing FFmpeg.wasm...");

      this.ffmpeg = new FFmpeg();

      // Set up logging
      this.ffmpeg.on("log", ({ message }) => {
        console.log("[FFmpeg]", message);
      });

      // Load FFmpeg core from CDN using toBlobURL to avoid CORS
      // Following official docs: https://ffmpegwasm.netlify.app/docs/getting-started/usage
      const baseURL =
        "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

      console.log("📦 Fetching FFmpeg core files...");
      const coreURL = await toBlobURL(
        `${baseURL}/ffmpeg-core.js`,
        "text/javascript",
      );
      const wasmURL = await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        "application/wasm",
      );

      console.log("📦 Loading FFmpeg...");
      await this.ffmpeg.load({
        coreURL,
        wasmURL,
      });

      console.log("✅ FFmpeg loaded successfully");
      this.isInitializing = false;
      return this.ffmpeg;
    } catch (error) {
      console.error("❌ Failed to initialize FFmpeg:", error);
      this.isInitializing = false;
      this.ffmpeg = null;
      throw error;
    }
  }

  /**
   * Get codec information
   */
  private getCodecInfo(codec?: string): {
    ffmpegCodec: string;
    ext: string;
    mimeType: string;
  } {
    const codecMap = {
      opus: {
        ffmpegCodec: "libopus",
        ext: "opus",
        mimeType: "audio/opus",
      },
      mp3: {
        ffmpegCodec: "libmp3lame",
        ext: "mp3",
        mimeType: "audio/mpeg",
      },
      aac: { ffmpegCodec: "aac", ext: "m4a", mimeType: "audio/aac" },
    };

    return codecMap[codec as keyof typeof codecMap] || codecMap.opus;
  }

  /**
   * Generate unique compression ID
   */
  private generateCompressionId(): string {
    return `compression-${Date.now()}-${++this.compressionCounter}`;
  }

  /**
   * Compress audio blob
   */
  async compress(
    audioBlob: Blob,
    options: CompressionOptions = {},
  ): Promise<CompressionResult> {
    const startTime = performance.now();
    const compressionId = this.generateCompressionId();

    try {
      console.log(`🗜️ Starting compression: ${compressionId}`);

      // Initialize FFmpeg
      const ffmpeg = await this.initializeFFmpeg();

      // Set up progress callback if provided
      if (options.onProgress) {
        ffmpeg.on("progress", ({ progress }) => {
          options.onProgress?.({
            percent: Math.min(Math.round(progress * 100), 100),
          });
        });
      }

      // Convert blob to Uint8Array
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioData = new Uint8Array(arrayBuffer);

      // Get codec info
      const codecInfo = this.getCodecInfo(options.codec);
      const inputFileName = `input-${compressionId}`;
      const outputFileName = `output-${compressionId}.${codecInfo.ext}`;

      console.log(`📝 Writing input file: ${inputFileName}`);
      await ffmpeg.writeFile(inputFileName, audioData);

      // Build FFmpeg command
      const ffmpegArgs = [
        "-i",
        inputFileName,
        "-c:a",
        codecInfo.ffmpegCodec,
        "-b:a",
        `${options.bitrate || 24}k`,
        "-ar",
        `${options.sampleRate || 16000}`,
        "-ac",
        `${options.channels || 1}`,
        "-y",
        outputFileName,
      ];

      console.log("⚙️ Running FFmpeg...");
      await ffmpeg.exec(ffmpegArgs);

      console.log(`📖 Reading output file: ${outputFileName}`);
      const outputData = await ffmpeg.readFile(outputFileName);

      // Create result blob
      // outputData can be Uint8Array or string, handle both
      const blobData =
        typeof outputData === "string"
          ? new TextEncoder().encode(outputData)
          : new Uint8Array(outputData);

      const outputBlob = new Blob([blobData], {
        type: codecInfo.mimeType,
      });

      // Clean up files
      console.log("🧹 Cleaning up temporary files...");
      await ffmpeg.deleteFile(inputFileName);
      await ffmpeg.deleteFile(outputFileName);

      const duration = performance.now() - startTime;

      // Calculate compression ratio safely (avoid division by zero)
      const compressionRatio =
        audioData.length > 0 ? outputBlob.size / audioData.length : 0;

      const result: CompressionResult = {
        blob: outputBlob,
        originalSize: audioData.length,
        compressedSize: outputBlob.size,
        compressionRatio,
        duration,
        codec: codecInfo.ffmpegCodec,
      };

      console.log(
        `✅ Compression complete: ${audioData.length} → ${outputBlob.size} bytes (${(compressionRatio * 100).toFixed(1)}%)`,
      );
      return result;
    } catch (error) {
      console.error("❌ Compression failed:", error);
      throw {
        code: "COMPRESSION_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
        originalError: error,
      } as CompressionError;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.ffmpeg) {
      // FFmpeg doesn't have an explicit cleanup method
      // Just clear our reference
      this.ffmpeg = null;
    }
  }

  /**
   * Check if compression is available
   */
  static isAvailable(): boolean {
    // Check if we're in a browser environment
    return typeof window !== "undefined" && typeof Blob !== "undefined";
  }
}
