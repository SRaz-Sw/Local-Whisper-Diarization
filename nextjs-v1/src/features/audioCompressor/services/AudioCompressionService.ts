/**
 * Audio Compression Service
 *
 * Compresses audio blobs to Opus/WebM format for efficient storage and API transmission.
 * Uses Web Audio API + MediaRecorder for high-quality, low-bitrate encoding.
 * All operations are non-blocking and run in background.
 *
 * Compression strategy:
 * 1. Decode audio to AudioBuffer (Web Audio API)
 * 2. Resample to 16kHz and optionally convert to mono
 * 3. Encode to Opus/WebM at 24kbps (MediaRecorder API)
 * 4. Return compressed blob (~50-60x smaller than original)
 */

import type { CompressionConfig, CompressionOptions } from "../types";
import {
  detectCompressionCapabilities,
  getBestSupportedFormat,
  shouldSkipCompression,
} from "../utils/audioFormatDetector";
import {
  decodeAudioBlob,
  createProcessedBuffer,
  getAudioBufferInfo,
} from "../utils/audioBufferProcessor";
import {
  encodeAudioBuffer,
  validateEncoderConfig,
} from "../utils/mediaRecorderEncoder";

/**
 * Default compression configuration
 */
const DEFAULT_COMPRESSION_CONFIG: CompressionConfig = {
  sampleRate: 16000, // 16kHz is sufficient for speech
  bitDepth: 16, // 16-bit audio (not used in Opus encoding)
  channels: 1, // Mono
  quality: 0.7, // Quality factor (not used in Opus encoding)
  bitrate: 24, // 24 kbps - excellent quality for speech
  mimeType: "audio/webm;codecs=opus", // Will be auto-detected
};

/**
 * Compress an audio blob to Opus/WebM format
 *
 * @param audioBlob - Original audio blob
 * @param options - Optional compression settings
 * @returns Compressed audio blob
 */
export async function compressAudio(
  audioBlob: Blob,
  options: CompressionOptions = {},
): Promise<Blob> {
  const startTime = performance.now();

  try {
    // Browser-based compression is disabled because it blocks the UI for long files
    // Just return the original blob immediately
    return audioBlob;

    // DISABLED: Browser-based compression blocks the main thread for the entire audio duration
    // For a 149-second audio file, this would freeze the UI for 149+ seconds
    // TODO: Implement server-side compression or use a Web Worker approach

    // 1. Check browser capabilities
    const capabilities = detectCompressionCapabilities();
    if (!capabilities.isSupported) {
      console.warn(
        "⚠️ Audio compression not supported in this browser, returning original",
      );
      return audioBlob;
    }

    // 2. Merge config with defaults
    const config: CompressionConfig = {
      ...DEFAULT_COMPRESSION_CONFIG,
      ...options,
    };

    // 3. Get best supported format
    const mimeType =
      getBestSupportedFormat(options.preferredFormat) || config.mimeType!;

    if (!mimeType) {
      console.warn("⚠️ No supported compression format found");
      return audioBlob;
    }

    // 4. Check if should skip compression (already optimal)
    if (shouldSkipCompression(audioBlob, config.bitrate!)) {
      return audioBlob;
    }

    // 5. Decode audio blob
    console.log(`📥 Decoding audio...`);
    const audioBuffer = await decodeAudioBlob(
      audioBlob,
      config.sampleRate,
    );
    console.log(`   Original: ${getAudioBufferInfo(audioBuffer)}`);

    // 6. Process audio (resample + optional mono conversion)
    console.log(`⚙️  Processing audio...`);
    const shouldConvertToMono =
      config.isConvertingToMono ?? config.channels === 1;

    const processedBuffer = await createProcessedBuffer(audioBuffer, {
      sampleRate: config.sampleRate,
      isConvertingToMono: shouldConvertToMono,
    });
    console.log(`   Processed: ${getAudioBufferInfo(processedBuffer)}`);

    // 7. Encode with MediaRecorder
    console.log(`🎵 Encoding to ${mimeType} at ${config.bitrate}kbps...`);

    const encoderConfig = {
      sampleRate: config.sampleRate,
      bitrate: config.bitrate!,
      mimeType,
    };

    validateEncoderConfig(encoderConfig);
    const compressedBlob = await encodeAudioBuffer(
      processedBuffer,
      encoderConfig,
    );

    // 8. Log results
    const endTime = performance.now();
    const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(1);
    const reductionPercent = (
      (1 - compressedBlob.size / audioBlob.size) *
      100
    ).toFixed(1);

    console.log(
      `✅ Compressed in ${elapsedSeconds}s: ${(audioBlob.size / 1024 / 1024).toFixed(2)} MB → ` +
        `${(compressedBlob.size / 1024 / 1024).toFixed(2)} MB (${reductionPercent}% reduction)`,
    );

    return compressedBlob;
  } catch (error) {
    const endTime = performance.now();
    const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(1);

    console.error(
      `❌ Compression failed after ${elapsedSeconds}s:`,
      error,
    );
    console.warn("⚠️ Returning original audio blob");
    return audioBlob;
  }
}

/**
 * Check if audio compression is available
 * Re-exported for backward compatibility
 */
export { isCompressionAvailable } from "../utils/audioFormatDetector";

/**
 * Get estimated compression ratio
 * With Opus encoding at 24kbps, we typically achieve 95-98% reduction
 */
export function getEstimatedCompressionRatio(): number {
  return 0.05; // Typically 5% of original size (95% reduction)
}
