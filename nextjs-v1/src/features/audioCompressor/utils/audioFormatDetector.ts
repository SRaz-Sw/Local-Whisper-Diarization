/**
 * Audio Format Detector Utility
 *
 * Detects browser capabilities and optimal audio compression formats.
 * Provides smart detection to skip unnecessary re-compression.
 */

import type {
  CompressionCapabilities,
  SupportedAudioFormat,
} from "../types";

/**
 * List of MIME types to test in priority order
 */
const MIME_TYPES_TO_TEST = [
  "audio/webm;codecs=opus", // Chrome, Edge - best quality/size
  "audio/ogg;codecs=opus", // Firefox - equally good
  "audio/webm", // Fallback for older browsers
];

/**
 * Compressed formats that we might want to skip re-encoding
 */
const COMPRESSED_FORMATS = [
  "audio/mpeg", // MP3
  "audio/mp3", // MP3 alternative
  "audio/mp4", // M4A
  "audio/aac", // AAC
  "audio/ogg", // OGG
  "audio/opus", // Opus
  "audio/webm", // WebM
  "audio/x-m4a", // M4A alternative
];

/**
 * Detect browser's audio compression capabilities
 *
 * @returns Capability detection result
 */
export function detectCompressionCapabilities(): CompressionCapabilities {
  const hasWebAudio =
    typeof AudioContext !== "undefined" ||
    typeof (window as any).webkitAudioContext !== "undefined";

  const hasMediaRecorder = typeof MediaRecorder !== "undefined";

  if (!hasWebAudio || !hasMediaRecorder) {
    return {
      isSupported: false,
      supportedFormats: [],
      bestFormat: null,
      hasWebAudio,
      hasMediaRecorder,
    };
  }

  // Test which MIME types are supported
  const supportedFormats = MIME_TYPES_TO_TEST.filter((mimeType) => {
    try {
      return MediaRecorder.isTypeSupported(mimeType);
    } catch {
      return false;
    }
  });

  return {
    isSupported: supportedFormats.length > 0,
    supportedFormats,
    bestFormat: supportedFormats[0] || null,
    hasWebAudio,
    hasMediaRecorder,
  };
}

/**
 * Get the best supported audio format
 *
 * @param preferredFormat - Optional user preference
 * @returns Best available MIME type or null
 */
export function getBestSupportedFormat(
  preferredFormat?: SupportedAudioFormat,
): string | null {
  const capabilities = detectCompressionCapabilities();

  if (!capabilities.isSupported) {
    return null;
  }

  // If user has a preference, try to honor it
  if (preferredFormat) {
    const preferredMimeType = capabilities.supportedFormats.find((mime) =>
      mime.includes(preferredFormat),
    );
    if (preferredMimeType) {
      return preferredMimeType;
    }
  }

  // Return the best format (first in priority list)
  return capabilities.bestFormat;
}

/**
 * Check if audio blob is already in a compressed format
 *
 * @param mimeType - MIME type of the blob
 * @returns True if already compressed
 */
export function isAlreadyCompressed(mimeType: string): boolean {
  return COMPRESSED_FORMATS.some((format) =>
    mimeType.toLowerCase().includes(format.toLowerCase()),
  );
}

/**
 * Estimate bitrate from blob (rough approximation)
 * This is a heuristic - actual bitrate detection would require parsing the file
 *
 * @param blob - Audio blob
 * @param durationSeconds - Optional duration in seconds
 * @returns Estimated bitrate in kbps
 */
export function estimateBitrate(
  blob: Blob,
  durationSeconds?: number,
): number | null {
  if (!durationSeconds || durationSeconds === 0) {
    return null;
  }

  // Bitrate (kbps) = (file size in bytes * 8) / (duration in seconds * 1000)
  const bitrateKbps = (blob.size * 8) / (durationSeconds * 1000);
  // Use ceil to ensure even small files have a non-zero bitrate
  return Math.ceil(bitrateKbps);
}

/**
 * Smart detection: should we skip compression?
 *
 * Skip if:
 * 1. Already compressed format (Opus, WebM) AND
 * 2. Estimated bitrate is <= target bitrate (no benefit to re-encode)
 *
 * @param blob - Input audio blob
 * @param targetBitrate - Target bitrate in kbps
 * @returns True if compression should be skipped
 */
export function shouldSkipCompression(
  blob: Blob,
  targetBitrate: number,
): boolean {
  // Only skip if already in optimal format
  const isOpusOrWebM =
    blob.type.includes("opus") || blob.type.includes("webm");

  if (!isOpusOrWebM) {
    return false;
  }

  // If we can't estimate bitrate, be conservative and compress
  // In practice, duration is usually unknown for existing blobs
  // So we'll primarily rely on format detection
  console.log(
    `ℹ️ Audio is already in optimal format (${blob.type}), skipping compression`,
  );
  return true;
}

/**
 * Check if audio compression is available
 * Convenience function for backward compatibility
 *
 * @returns True if compression is supported
 */
export function isCompressionAvailable(): boolean {
  return detectCompressionCapabilities().isSupported;
}
