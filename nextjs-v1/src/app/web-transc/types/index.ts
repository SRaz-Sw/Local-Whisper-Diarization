/// <reference types="@webgpu/types" />

export interface AudioData {
  buffer: Float32Array;
  sampleRate: number;
  duration: number;
}

export interface TranscriptChunk {
  text: string;
  timestamp: [number, number];
}

export interface SpeakerSegment {
  id: number;
  label: string;
  start: number;
  end: number;
  confidence: number;
}

export interface TranscriptionResult {
  transcript: {
    text: string;
    chunks: TranscriptChunk[];
  };
  segments: SpeakerSegment[];
}

export interface ProgressItem {
  file: string;
  progress: number;
  total: number;
  loaded?: number;
  status: string;
  name?: string;
}

export type TranscriptionStatus = null | "loading" | "ready" | "running";

export interface WorkerMessage {
  status:
    | "loading"
    | "initiate"
    | "progress"
    | "done"
    | "loaded"
    | "update"
    | "transcribing"
    | "complete"
    | "error"
    | "processing_progress";
  data?: any;
  file?: string;
  progress?: number;
  total?: number;
  result?: TranscriptionResult;
  time?: number;
  processedSeconds?: number;
  totalSeconds?: number;
  estimatedTimeRemaining?: number;
}

export type DeviceType = "webgpu" | "wasm";

// Props interfaces for components
export interface WhisperProgressProps {
  text: string;
  percentage: number;
  total: number;
}

export interface WhisperLanguageSelectorProps {
  language: string;
  setLanguage: (lang: string) => void;
  className?: string;
}

export interface WhisperMediaInputProps {
  onInputChange: (audio: Float32Array) => void;
  onTimeUpdate: (time: number) => void;
  onFileNameChange?: (fileName: string) => void;
  className?: string;
}

export interface WhisperMediaInputRef {
  setMediaTime: (time: number) => void;
  reset: () => void;
  loadFromBlob: (blob: Blob, fileName: string) => void;
  getFile: () => File | null;
}

export interface WhisperTranscriptProps {
  transcript: {
    text: string;
    chunks: TranscriptChunk[];
  };
  segments: SpeakerSegment[];
  currentTime: number;
  setCurrentTime: (time: number) => void;
  className?: string;
}

export interface ChunkProps {
  chunk: TranscriptChunk;
  currentTime: number;
  onClick: () => void;
}

export interface BackupState {
  audio: Float32Array;
  language: string;
  processedSeconds: number;
  totalSeconds: number;
  partialResult: {
    chunks: TranscriptChunk[];
    segments: SpeakerSegment[];
    text: string;
  } | null;
  timestamp: number;
  fileName?: string;
}
