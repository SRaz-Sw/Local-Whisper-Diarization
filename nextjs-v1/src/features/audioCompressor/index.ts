/**
 * Audio Compressor Feature
 *
 * High-performance audio compression using FFmpeg.wasm (browser) or native FFmpeg (Electron).
 * Compresses audio to Opus/MP3/AAC format at configurable bitrates for efficient storage.
 *
 * Key Features:
 * - 90-95% file size reduction
 * - Browser-native compression (FFmpeg.wasm) or native FFmpeg (Electron)
 * - Supports any input format
 * - Background processing with queue management
 * - Progress tracking and notifications
 */

// Main API
export {
  compressAudio,
  isCompressionAvailable,
  CompressionService,
} from "./core/CompressionService";

// Queue Management
export {
  compressionQueue,
  CompressionQueue,
} from "./queue/CompressionQueue";

// Types
export type {
  CompressionOptions,
  CompressionResult,
  CompressionProgress,
  CompressionError,
  CompressionEnvironment,
  QueueItem,
  CompressionConfig,
} from "./core/types";
