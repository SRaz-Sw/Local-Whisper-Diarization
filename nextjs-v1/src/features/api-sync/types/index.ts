/**
 * API Sync Feature - Type Definitions
 *
 * Centralized type definitions for the API sync feature
 */

import type { SavedTranscript } from "@/lib/localStorage/schemas";

/**
 * DTO for transcript sync to API
 */
export interface TranscriptSyncDTO {
  // Transcript metadata
  id: string;
  fileName: string;
  duration: number;
  speakerCount: number;
  language: string;
  model: string;
  createdAt: number;

  // Transcript content
  fullText: string;
  chunks: Array<{
    text: string;
    timestamp: [number, number];
  }>;

  // Speaker segments
  segments: Array<{
    label: string;
    start: number;
    end: number;
  }>;

  // Optional speaker names
  speakerNames?: Record<string, string>;

  // Compressed audio (base64 encoded)
  compressedAudio?: string;
  compressedAudioMimeType?: string;
}

/**
 * API sync response
 */
export interface ApiSyncResponse {
  success: boolean;
  transcriptId: string;
  message?: string;
  serverTranscriptId?: string; // ID assigned by the server
}

/**
 * API sync status
 */
export type ApiSyncStatus =
  | "pending"
  | "syncing"
  | "synced"
  | "error"
  | "disabled";

/**
 * API settings
 */
export interface ApiSettings {
  apiEnabled: boolean;
  apiEndpoint?: string;
  apiKey?: string;
  compressAudio: boolean;
}

/**
 * Sync queue item
 */
export interface SyncQueueItem {
  transcriptId: string;
  queuedAt: number;
  retryCount: number;
}
