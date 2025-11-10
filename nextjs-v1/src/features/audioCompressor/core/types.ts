/**
 * Core Type Definitions for Audio Compression
 *
 * Shared types used across browser and Electron implementations
 */

/**
 * User-facing compression options
 */
export interface CompressionOptions {
  /** Bitrate in kbps (default: 24) */
  bitrate?: number;
  /** Sample rate in Hz (default: 16000) */
  sampleRate?: number;
  /** Number of audio channels (default: 1 for mono) */
  channels?: 1 | 2;
  /** Output audio codec (default: opus) */
  codec?: "opus" | "mp3" | "aac";
  /** Progress callback function */
  onProgress?: (progress: CompressionProgress) => void;
  /** Priority level for queue processing */
  priority?: "low" | "normal" | "high";
}

/**
 * Compression progress information
 */
export interface CompressionProgress {
  /** Progress percentage (0-100) */
  percent: number;
  /** Current position in audio (e.g., "00:01:23") */
  currentTime?: string;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
}

/**
 * Compression result metadata
 */
export interface CompressionResult {
  /** Compressed audio blob */
  blob: Blob;
  /** Original file size in bytes */
  originalSize: number;
  /** Compressed file size in bytes */
  compressedSize: number;
  /** Compression ratio (0-1, where 0.1 = 90% reduction) */
  compressionRatio: number;
  /** Processing duration in milliseconds */
  duration: number;
  /** Codec used for compression */
  codec: string;
}

/**
 * Environment detection type
 */
export type CompressionEnvironment = "browser" | "electron";

/**
 * Compression error information
 */
export interface CompressionError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Original error object if available */
  originalError?: Error;
}

/**
 * Queue item for batch processing
 */
export interface QueueItem {
  /** Unique job ID */
  id: string;
  /** Audio blob to compress */
  audioBlob: Blob;
  /** Compression options */
  options: CompressionOptions;
  /** Current status */
  status: "pending" | "processing" | "completed" | "failed";
  /** Progress percentage (0-100) */
  progress: number;
  /** Compression result (if completed) */
  result?: CompressionResult;
  /** Error information (if failed) */
  error?: CompressionError;
  /** Timestamp when job was created */
  createdAt: number;
  /** Timestamp when processing started */
  startedAt?: number;
  /** Timestamp when processing completed */
  completedAt?: number;
}

/**
 * Internal compression configuration
 */
export interface CompressionConfig {
  /** Sample rate in Hz */
  sampleRate: number;
  /** Bit depth (not used in Opus, kept for compatibility) */
  bitDepth: number;
  /** Number of channels */
  channels: number;
  /** Quality factor (0-1) */
  quality: number;
  /** Whether to convert to mono */
  isConvertingToMono?: boolean;
  /** Bitrate in kbps */
  bitrate?: number;
  /** MIME type for output */
  mimeType?: string;
}
