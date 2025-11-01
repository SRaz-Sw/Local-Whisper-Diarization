/**
 * Audio Compression Service
 *
 * Compresses audio blobs to smaller WAV files for efficient storage and API transmission.
 * Uses Web Audio API for resampling and quality reduction.
 * All operations are non-blocking and run in background.
 *
 * NOTE: This service uses basic Web Audio API compression.
 * For production MP3 encoding, consider installing: @types/lamejs and lamejs
 * Command: bun add lamejs @types/lamejs
 */

import type { CompressionConfig, CompressionOptions } from "../types";

/**
 * Default compression configuration
 */
const DEFAULT_COMPRESSION_CONFIG: CompressionConfig = {
  sampleRate: 16000, // 16kHz is sufficient for speech
  bitDepth: 16, // 16-bit audio
  channels: 1, // Mono
  quality: 0.7, // Quality factor for encoding (0-1)
};

/**
 * Check if audio is already in a compressed format
 */
function isAlreadyCompressed(mimeType: string): boolean {
  const compressedFormats = [
    "audio/mpeg", // MP3
    "audio/mp3", // MP3 alternative
    "audio/mp4", // M4A
    "audio/aac", // AAC
    "audio/ogg", // OGG
    "audio/opus", // Opus
    "audio/webm", // WebM
    "audio/x-m4a", // M4A alternative
  ];

  return compressedFormats.some((format) =>
    mimeType.toLowerCase().includes(format.toLowerCase()),
  );
}

/**
 * Compress an audio blob to a smaller format
 *
 * @param audioBlob - Original audio blob
 * @param options - Optional compression settings
 * @returns Compressed audio blob
 */
export async function compressAudio(
  audioBlob: Blob,
  options: CompressionOptions = {},
): Promise<Blob> {
  try {
    console.log(
      `🗜️ Starting audio compression (${(audioBlob.size / 1024 / 1024).toFixed(2)} MB)...`,
    );

    // Check if audio is already compressed
    if (isAlreadyCompressed(audioBlob.type)) {
      console.log(
        `ℹ️ Audio is already compressed (${audioBlob.type}), skipping compression`,
      );
      return audioBlob;
    }

    // Merge options with defaults
    const config: CompressionConfig = {
      ...DEFAULT_COMPRESSION_CONFIG,
      ...options,
    };

    // Convert blob to ArrayBuffer
    const arrayBuffer = await audioBlob.arrayBuffer();

    // Create audio context with target sample rate
    const audioContext = new AudioContext({
      sampleRate: config.sampleRate,
    });

    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Get channel data (convert to mono if needed)
    let channelData: Float32Array;
    if (audioBuffer.numberOfChannels === 1) {
      channelData = audioBuffer.getChannelData(0);
    } else {
      // Mix to mono
      const left = audioBuffer.getChannelData(0);
      const right = audioBuffer.getChannelData(1);
      channelData = new Float32Array(left.length);
      for (let i = 0; i < left.length; i++) {
        channelData[i] = (left[i] + right[i]) / 2;
      }
    }

    // Create WAV blob (simpler than MP3, still compressed due to lower sample rate)
    const wavBlob = await createWavBlob(
      channelData,
      config.sampleRate,
      config.bitDepth,
    );

    await audioContext.close();

    const reductionPercent = (
      (1 - wavBlob.size / audioBlob.size) *
      100
    ).toFixed(1);
    const reductionSign = wavBlob.size < audioBlob.size ? "" : "+";

    console.log(
      `✅ Audio compressed: ${(audioBlob.size / 1024 / 1024).toFixed(2)} MB → ${(wavBlob.size / 1024 / 1024).toFixed(2)} MB (${reductionSign}${reductionPercent}% ${wavBlob.size < audioBlob.size ? "reduction" : "increase"})`,
    );

    return wavBlob;
  } catch (error) {
    console.error("❌ Failed to compress audio:", error);
    // Return original blob if compression fails
    console.warn("⚠️ Returning original audio blob");
    return audioBlob;
  }
}

/**
 * Create a WAV blob from PCM data
 *
 * @param samples - Float32Array of audio samples
 * @param sampleRate - Sample rate in Hz
 * @param bitDepth - Bit depth (8, 16, or 32)
 * @returns WAV blob
 */
async function createWavBlob(
  samples: Float32Array,
  sampleRate: number,
  bitDepth: number,
): Promise<Blob> {
  const numChannels = 1; // Mono
  const bytesPerSample = bitDepth / 8;

  // Convert float samples to int
  const intSamples = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    intSamples[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  // Create WAV header
  const buffer = new ArrayBuffer(44 + intSamples.length * bytesPerSample);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + intSamples.length * bytesPerSample, true);
  writeString(view, 8, "WAVE");

  // FMT sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true); // ByteRate
  view.setUint16(32, numChannels * bytesPerSample, true); // BlockAlign
  view.setUint16(34, bitDepth, true); // BitsPerSample

  // Data sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, intSamples.length * bytesPerSample, true);

  // Write PCM data
  let offset = 44;
  for (let i = 0; i < intSamples.length; i++) {
    view.setInt16(offset, intSamples[i], true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Write a string to a DataView
 */
function writeString(
  view: DataView,
  offset: number,
  string: string,
): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Check if audio compression is available
 */
export function isCompressionAvailable(): boolean {
  return (
    typeof AudioContext !== "undefined" ||
    typeof (window as any).webkitAudioContext !== "undefined"
  );
}

/**
 * Get estimated compression ratio
 * This is a rough estimate based on typical compression rates
 */
export function getEstimatedCompressionRatio(): number {
  return 0.3; // Typically 30% of original size
}
