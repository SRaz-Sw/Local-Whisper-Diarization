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

export {
  compressAudio,
  isCompressionAvailable,
  getEstimatedCompressionRatio,
} from "./services/AudioCompressionService";

// Types
export type {
  TranscriptSyncDTO,
  ApiSyncResponse,
  ApiSyncStatus,
  CompressionConfig,
  CompressionOptions,
  ApiSettings,
  SyncQueueItem,
} from "./types";
