/**
 * FFmpeg Web Worker
 *
 * Handles audio compression using FFmpeg.wasm in a Web Worker
 * to avoid blocking the main thread.
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import type {
  CompressionOptions,
  CompressionProgress,
  CompressionResult,
  CompressionError,
} from "../../core/types";

// Worker message types
type WorkerMessage =
  | {
      type: "compress";
      payload: {
        audioData: Uint8Array;
        options: CompressionOptions;
        compressionId: string;
      };
    }
  | { type: "cancel"; compressionId: string };

type WorkerResponse =
  | {
      type: "progress";
      compressionId: string;
      progress: CompressionProgress;
    }
  | {
      type: "complete";
      compressionId: string;
      result: CompressionResult;
    }
  | { type: "error"; compressionId: string; error: CompressionError };

// FFmpeg instance (singleton)
let ffmpeg: FFmpeg | null = null;
let isInitializing = false;
const initPromise: Promise<FFmpeg> | null = null;

/**
 * Initialize FFmpeg.wasm
 */
async function initializeFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg) {
    return ffmpeg;
  }

  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;

  try {
    ffmpeg = new FFmpeg();

    // Set up logging
    ffmpeg.on("log", ({ message }) => {
      console.log("[FFmpeg]", message);
    });

    // Load FFmpeg.wasm from CDN
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

    await ffmpeg.load({
      coreURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.js`,
        "text/javascript",
      ),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        "application/wasm",
      ),
    });

    isInitializing = false;
    return ffmpeg;
  } catch (error) {
    isInitializing = false;
    throw new Error(
      `Failed to initialize FFmpeg: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Get MIME type for codec
 */
function getMimeTypeForCodec(codec: CompressionOptions["codec"]): string {
  switch (codec) {
    case "opus":
      return "audio/opus";
    case "mp3":
      return "audio/mpeg";
    case "aac":
      return "audio/aac";
    default:
      return "audio/opus";
  }
}

/**
 * Get FFmpeg codec name
 */
function getFFmpegCodec(codec: CompressionOptions["codec"]): string {
  switch (codec) {
    case "opus":
      return "libopus";
    case "mp3":
      return "libmp3lame";
    case "aac":
      return "aac";
    default:
      return "libopus";
  }
}

/**
 * Get file extension for codec
 */
function getFileExtension(codec: CompressionOptions["codec"]): string {
  switch (codec) {
    case "opus":
      return "opus";
    case "mp3":
      return "mp3";
    case "aac":
      return "m4a";
    default:
      return "opus";
  }
}

/**
 * Handle compression request
 */
async function handleCompress(
  audioData: Uint8Array,
  options: CompressionOptions,
  compressionId: string,
): Promise<void> {
  const startTime = performance.now();

  try {
    // Initialize FFmpeg if needed
    const ffmpegInstance = await initializeFFmpeg();

    // Set up progress tracking
    ffmpegInstance.on("progress", ({ progress }) => {
      self.postMessage({
        type: "progress",
        compressionId,
        progress: {
          percent: Math.min(progress * 100, 100),
        },
      } as WorkerResponse);
    });

    // Generate file names
    const inputFileName = `input-${compressionId}`;
    const outputFileName = `output-${compressionId}.${getFileExtension(options.codec)}`;

    // Write input file
    await ffmpegInstance.writeFile(inputFileName, audioData);

    // Build FFmpeg command
    const codec = getFFmpegCodec(options.codec || "opus");
    const bitrate = options.bitrate || 24;
    const sampleRate = options.sampleRate || 16000;
    const channels = options.channels || 1;

    const args = [
      "-i",
      inputFileName,
      "-c:a",
      codec,
      "-b:a",
      `${bitrate}k`,
      "-ar",
      `${sampleRate}`,
      "-ac",
      `${channels}`,
      "-y", // Overwrite output file
      outputFileName,
    ];

    // Execute FFmpeg
    await ffmpegInstance.exec(args);

    // Read output file
    const outputData = await ffmpegInstance.readFile(outputFileName);
    const outputBlob = new Blob([outputData], {
      type: getMimeTypeForCodec(options.codec || "opus"),
    });

    // Clean up files
    try {
      await ffmpegInstance.deleteFile(inputFileName);
      await ffmpegInstance.deleteFile(outputFileName);
    } catch (cleanupError) {
      console.warn("Failed to clean up temp files:", cleanupError);
    }

    // Calculate result
    const duration = performance.now() - startTime;
    const originalSize = audioData.length;
    const compressedSize = outputBlob.size;
    const compressionRatio = compressedSize / originalSize;

    const result: CompressionResult = {
      blob: outputBlob,
      originalSize,
      compressedSize,
      compressionRatio,
      duration,
      codec: codec,
    };

    // Send success response
    self.postMessage({
      type: "complete",
      compressionId,
      result,
    } as WorkerResponse);
  } catch (error) {
    const compressionError: CompressionError = {
      code: "COMPRESSION_FAILED",
      message:
        error instanceof Error
          ? error.message
          : "Unknown compression error",
      originalError: error instanceof Error ? error : undefined,
    };

    self.postMessage({
      type: "error",
      compressionId,
      error: compressionError,
    } as WorkerResponse);
  }
}

/**
 * Handle worker messages
 */
self.addEventListener(
  "message",
  async (event: MessageEvent<WorkerMessage>) => {
    const { type } = event.data;

    if (type === "compress") {
      const { audioData, options, compressionId } = event.data.payload;
      await handleCompress(audioData, options, compressionId);
    } else if (type === "cancel") {
      // TODO: Implement cancellation
      console.log("Cancellation requested for:", event.data.compressionId);
    }
  },
);

// Export types for TypeScript
export type { WorkerMessage, WorkerResponse };
