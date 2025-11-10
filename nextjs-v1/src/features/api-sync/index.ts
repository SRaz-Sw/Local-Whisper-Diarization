/**
 * API Sync Feature
 *
 * Centralized exports for the API sync feature.
 * This feature handles automatic synchronization of transcripts to external APIs
 * with audio compression and background queueing.
 */

// Components
export { ApiSettingsModal } from "./components/ApiSettingsModal";

// Services
export {
  prepareTranscriptForSync,
  useTranscriptSync,
  BackgroundSyncService,
  backgroundSyncService,
} from "./services/ApiSyncService";

// export {
//   compressAudio,
//   isCompressionAvailable,
//   getEstimatedCompressionRatio,
//   detectCompressionCapabilities,
// } from "@/features/audioCompressor";

// Types
export type {
  TranscriptSyncDTO,
  ApiSyncResponse,
  ApiSyncStatus,
  ApiSettings,
  SyncQueueItem,
} from "./types";

// Re-export compression types from audioCompressor
// export type {
//   CompressionConfig,
//   CompressionOptions,
//   CompressionCapabilities,
//   SupportedAudioFormat,
// } from "@/features/audioCompressor";
