/**
 * Audio Buffer Processor Utility
 *
 * Processes audio using Web Audio API for resampling and mono conversion.
 * All operations preserve audio quality while optimizing for size.
 */

import type { ProcessingOptions } from "../types";

/**
 * Decode audio blob to AudioBuffer
 *
 * @param blob - Input audio blob
 * @param targetSampleRate - Target sample rate for the AudioContext
 * @returns Decoded AudioBuffer
 */
export async function decodeAudioBlob(
  blob: Blob,
  targetSampleRate: number,
): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();

  // Create AudioContext with target sample rate
  const audioContext = new AudioContext({ sampleRate: targetSampleRate });

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } finally {
    // Always close the context to free resources
    await audioContext.close();
  }
}

/**
 * Convert multi-channel audio to mono by averaging all channels
 *
 * @param audioBuffer - Input audio buffer
 * @returns Mono channel data
 */
export function convertToMono(audioBuffer: AudioBuffer): Float32Array {
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;

  // If already mono, return the channel data
  if (numChannels === 1) {
    return audioBuffer.getChannelData(0);
  }

  // Mix all channels to mono by averaging
  const monoData = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let ch = 0; ch < numChannels; ch++) {
      sum += audioBuffer.getChannelData(ch)[i];
    }
    monoData[i] = sum / numChannels;
  }

  return monoData;
}

/**
 * Create a new AudioBuffer from channel data
 *
 * @param channelData - Array of channel data (mono or stereo)
 * @param sampleRate - Sample rate
 * @returns New AudioBuffer
 */
export function createAudioBufferFromData(
  channelData: Float32Array[],
  sampleRate: number,
): AudioBuffer {
  const numberOfChannels = channelData.length;
  const length = channelData[0].length;

  // Create an offline context just to create the buffer
  const offlineContext = new OfflineAudioContext(
    numberOfChannels,
    length,
    sampleRate,
  );

  const buffer = offlineContext.createBuffer(
    numberOfChannels,
    length,
    sampleRate,
  );

  // Copy data to buffer
  for (let ch = 0; ch < numberOfChannels; ch++) {
    buffer.copyToChannel(channelData[ch], ch);
  }

  return buffer;
}

/**
 * Process audio buffer with resampling and optional mono conversion
 *
 * @param audioBuffer - Input audio buffer
 * @param options - Processing options
 * @returns Processed audio buffer
 */
export async function createProcessedBuffer(
  audioBuffer: AudioBuffer,
  options: ProcessingOptions,
): Promise<AudioBuffer> {
  const { sampleRate, isConvertingToMono } = options;

  // Determine number of output channels
  const numberOfChannels = isConvertingToMono
    ? 1
    : audioBuffer.numberOfChannels;

  // If sample rate matches and no conversion needed, return original
  if (
    audioBuffer.sampleRate === sampleRate &&
    audioBuffer.numberOfChannels === numberOfChannels
  ) {
    return audioBuffer;
  }

  // Create offline context for processing
  const offlineContext = new OfflineAudioContext(
    numberOfChannels,
    Math.ceil((audioBuffer.length * sampleRate) / audioBuffer.sampleRate),
    sampleRate,
  );

  // Create buffer source
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;

  // If converting to mono, use channel merger/splitter
  if (isConvertingToMono && audioBuffer.numberOfChannels > 1) {
    // Web Audio API will automatically mix to mono if we set up the graph correctly
    const merger = offlineContext.createChannelMerger(1);

    // Mix all channels by connecting them all to the merger
    const splitter = offlineContext.createChannelSplitter(
      audioBuffer.numberOfChannels,
    );

    source.connect(splitter);

    // Connect all channels to the single output channel
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      const gain = offlineContext.createGain();
      gain.gain.value = 1 / audioBuffer.numberOfChannels; // Average
      splitter.connect(gain, i);
      gain.connect(merger, 0, 0);
    }

    merger.connect(offlineContext.destination);
  } else {
    // Just resample, keep original channels
    source.connect(offlineContext.destination);
  }

  // Start rendering
  source.start(0);
  const renderedBuffer = await offlineContext.startRendering();

  return renderedBuffer;
}

/**
 * Get audio buffer info for debugging
 *
 * @param audioBuffer - Audio buffer to inspect
 * @returns Info string
 */
export function getAudioBufferInfo(audioBuffer: AudioBuffer): string {
  return `${audioBuffer.numberOfChannels}ch, ${audioBuffer.sampleRate}Hz, ${audioBuffer.duration.toFixed(2)}s`;
}
