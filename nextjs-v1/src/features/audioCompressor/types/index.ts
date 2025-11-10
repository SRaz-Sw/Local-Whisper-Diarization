/**
 * Audio Compressor Type Definitions
 */

export type SupportedAudioFormat = "opus" | "webm" | "ogg";

export interface CompressionCapabilities {
  isSupported: boolean;
  supportedFormats: string[];
  bestFormat: string | null;
  hasWebAudio: boolean;
  hasMediaRecorder: boolean;
}

export interface CompressionConfig {
  sampleRate: number;
  bitDepth: number;
  channels: number;
  quality: number;
  isConvertingToMono?: boolean;
  bitrate?: number;
  mimeType?: string;
}

export interface CompressionOptions {
  sampleRate?: number;
  bitrate?: number;
  isConvertingToMono?: boolean;
  preferredFormat?: SupportedAudioFormat;
}

export interface EncoderConfig {
  sampleRate: number;
  bitrate: number;
  mimeType: string;
}

export interface ProcessingOptions {
  sampleRate: number;
  isConvertingToMono: boolean;
}
