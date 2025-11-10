/**
 * MediaRecorder Encoder Utility
 *
 * Encodes AudioBuffer to compressed formats (Opus/WebM) using MediaRecorder API.
 * This provides true audio compression using browser-native codecs.
 */

import type { EncoderConfig } from "../types";

/**
 * Encode AudioBuffer to compressed format using MediaRecorder
 *
 * Strategy:
 * 1. Create an OfflineAudioContext to "render" the buffer
 * 2. Use MediaStreamAudioDestinationNode to create a MediaStream
 * 3. Feed the stream to MediaRecorder with target codec and bitrate
 * 4. Collect the encoded chunks and return as Blob
 *
 * @param audioBuffer - Input audio buffer to encode
 * @param config - Encoder configuration
 * @returns Compressed audio blob
 */
export async function encodeAudioBuffer(
  audioBuffer: AudioBuffer,
  config: EncoderConfig,
): Promise<Blob> {
  // Create regular AudioContext (not OfflineAudioContext) because we need createMediaStreamDestination
  const audioContext = new AudioContext({
    sampleRate: config.sampleRate,
  });

  // Create buffer source
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;

  // Create MediaStream destination (only available on AudioContext, not OfflineAudioContext)
  const destination = audioContext.createMediaStreamDestination();
  source.connect(destination);

  // Create MediaRecorder with specified codec and bitrate
  const mediaRecorder = new MediaRecorder(destination.stream, {
    mimeType: config.mimeType,
    audioBitsPerSecond: config.bitrate * 1000, // Convert kbps to bps
  });

  // Collect recorded chunks
  const chunks: Blob[] = [];

  // Set up promise-based recording
  const recordingPromise = new Promise<Blob>((resolve, reject) => {
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      if (chunks.length === 0) {
        await audioContext.close();
        reject(new Error("No audio data recorded"));
        return;
      }

      const blob = new Blob(chunks, { type: config.mimeType });
      await audioContext.close();
      resolve(blob);
    };

    mediaRecorder.onerror = async (event) => {
      await audioContext.close();
      reject(
        new Error(`MediaRecorder error: ${(event as any).error?.message}`),
      );
    };

    // Start recording
    mediaRecorder.start();

    // Start audio playback
    source.start(0);

    // Schedule stop after buffer duration (with small buffer)
    const durationMs = audioBuffer.duration * 1000;
    setTimeout(() => {
      if (mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
    }, durationMs + 500); // +500ms safety buffer
  });

  return recordingPromise;
}

/**
 * Create a MediaStream from an AudioBuffer (alternative method)
 * This is a simpler approach but may not work in all browsers
 *
 * @param audioBuffer - Input audio buffer
 * @param sampleRate - Target sample rate
 * @returns MediaStream
 */
export function createMediaStreamFromBuffer(
  audioBuffer: AudioBuffer,
  sampleRate: number,
): MediaStream {
  const audioContext = new AudioContext({ sampleRate });

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;

  const destination = audioContext.createMediaStreamDestination();
  source.connect(destination);

  source.start(0);

  return destination.stream;
}

/**
 * Record a MediaStream to a Blob
 *
 * @param stream - Input media stream
 * @param mimeType - Target MIME type
 * @param bitrate - Bitrate in kbps
 * @param durationMs - Duration to record in milliseconds
 * @returns Recorded audio blob
 */
export async function recordMediaStream(
  stream: MediaStream,
  mimeType: string,
  bitrate: number,
  durationMs: number,
): Promise<Blob> {
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType,
    audioBitsPerSecond: bitrate * 1000,
  });

  const chunks: Blob[] = [];

  return new Promise<Blob>((resolve, reject) => {
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      if (chunks.length === 0) {
        reject(new Error("No audio data recorded"));
        return;
      }

      const blob = new Blob(chunks, { type: mimeType });
      resolve(blob);

      // Stop all tracks to clean up
      stream.getTracks().forEach((track) => track.stop());
    };

    mediaRecorder.onerror = (event) => {
      reject(
        new Error(`MediaRecorder error: ${(event as any).error?.message}`),
      );
    };

    // Start recording
    mediaRecorder.start();

    // Stop after duration
    setTimeout(() => {
      if (mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
    }, durationMs);
  });
}

/**
 * Validate encoder configuration
 *
 * @param config - Encoder configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateEncoderConfig(config: EncoderConfig): void {
  if (!config.mimeType) {
    throw new Error("MIME type is required for encoding");
  }

  if (!MediaRecorder.isTypeSupported(config.mimeType)) {
    throw new Error(`MIME type not supported: ${config.mimeType}`);
  }

  if (config.bitrate <= 0) {
    throw new Error(`Invalid bitrate: ${config.bitrate}`);
  }

  if (config.sampleRate <= 0) {
    throw new Error(`Invalid sample rate: ${config.sampleRate}`);
  }
}
