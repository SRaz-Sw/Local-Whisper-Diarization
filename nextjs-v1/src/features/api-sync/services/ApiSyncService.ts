/**
 * API Sync Service
 *
 * Handles background synchronization of transcripts to external API endpoints.
 * Uses react-query for reliable, non-blocking API calls with automatic retry logic.
 * Provides queue management for offline support.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transcripts } from "@/lib/localStorage/collections";
import { blobStorage } from "@/lib/localStorage/storage";
import type { SavedTranscript } from "@/lib/localStorage/schemas";
import type {
  TranscriptSyncDTO,
  ApiSyncResponse,
  ApiSyncStatus,
} from "../types";

/**
 * Prepare transcript data for API sync
 *
 * @param transcript - Saved transcript from IndexedDB
 * @param includeAudio - Whether to include compressed audio
 * @returns DTO ready for API transmission
 */
export async function prepareTranscriptForSync(
  transcript: SavedTranscript,
  includeAudio: boolean = true,
): Promise<TranscriptSyncDTO> {
  const dto: TranscriptSyncDTO = {
    id: transcript.id,
    fileName: transcript.metadata.fileName,
    duration: transcript.metadata.duration,
    speakerCount: transcript.metadata.speakerCount,
    language: transcript.metadata.language,
    model: transcript.metadata.model,
    createdAt: transcript.metadata.createdAt,
    fullText: transcript.transcript.text,
    chunks: transcript.transcript.chunks.map((chunk) => ({
      text: chunk.text,
      timestamp: chunk.timestamp,
    })),
    segments: transcript.segments.map((segment) => ({
      label: segment.label,
      start: segment.start,
      end: segment.end,
    })),
    speakerNames: transcript.metadata.speakerNames,
  };

  // Include compressed audio if available and requested
  if (includeAudio && transcript.compressedAudioFileId) {
    try {
      const audioBlob = await blobStorage.get(
        transcript.compressedAudioFileId,
      );
      if (audioBlob) {
        // Convert blob to base64
        const base64Audio = await blobToBase64(audioBlob);
        dto.compressedAudio = base64Audio;
        dto.compressedAudioMimeType = audioBlob.type;
      }
    } catch (error) {
      console.error("Failed to load compressed audio for sync:", error);
    }
  }

  return dto;
}

/**
 * Convert blob to base64 string
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix (e.g., "data:audio/wav;base64,")
      const base64Data = base64.split(",")[1] || base64;
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Send transcript to API endpoint via HTTP
 *
 * @param dto - Transcript data to sync
 * @returns API response
 */
async function sendTranscriptToApi(
  dto: TranscriptSyncDTO,
): Promise<ApiSyncResponse> {
  console.log("___________ sendTranscriptToApi ________________ trace:");
  console.trace();
  const response = await fetch(
    "http://localhost:3010/api/transcripts/create",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Access-Token": "dev-token",
      },
      body: JSON.stringify(dto),
    },
  );

  if (!response.ok) {
    throw new Error(
      `API sync failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

/**
 * Update transcript sync status in IndexedDB
 */
async function updateTranscriptSyncStatus(
  transcriptId: string,
  status: ApiSyncStatus,
  error?: string,
): Promise<void> {
  try {
    const transcript = await transcripts.get(transcriptId);
    if (!transcript) {
      console.error(`Transcript ${transcriptId} not found`);
      return;
    }

    const updatedTranscript: SavedTranscript = {
      ...transcript,
      apiSyncStatus: status,
      apiSyncedAt:
        status === "synced" ? Date.now() : transcript.apiSyncedAt,
      apiError: error,
      metadata: {
        ...transcript.metadata,
        updatedAt: Date.now(),
      },
    };

    await transcripts.set(transcriptId, updatedTranscript);

    // Notify components of sync status change (different event to avoid full reload)
    window.dispatchEvent(
      new CustomEvent("transcript-sync-status-changed", {
        detail: { transcriptId, status },
      }),
    );
  } catch (err) {
    console.error("Failed to update transcript sync status:", err);
  }
}

/**
 * React Query hook for syncing a transcript
 *
 * @example
 * ```typescript
 * const { mutate: syncTranscript } = useTranscriptSync();
 *
 * syncTranscript({
 *   transcriptId: 'transcript-123',
 *   apiEndpoint: 'https://api.example.com/transcripts',
 *   apiKey: 'your-api-key'
 * });
 * ```
 */
export function useTranscriptSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transcriptId,
      apiEndpoint,
      apiKey,
      includeAudio = true,
    }: {
      transcriptId: string;
      apiEndpoint: string;
      apiKey?: string;
      includeAudio?: boolean;
    }) => {
      // Update status to syncing
      await updateTranscriptSyncStatus(transcriptId, "syncing");

      // Get transcript
      const transcript = await transcripts.get(transcriptId);
      if (!transcript) {
        throw new Error(`Transcript ${transcriptId} not found`);
      }

      // Prepare DTO
      const dto = await prepareTranscriptForSync(transcript, includeAudio);
      console.log("___________ dto:", dto);
      // Send to API via oRPC
      const response = await sendTranscriptToApi(dto);

      console.log("___________ sendTranscriptToApi response:", response);

      return { transcriptId, response };
    },

    onSuccess: async ({ transcriptId }) => {
      console.log(`✅ Transcript ${transcriptId} synced successfully`);
      await updateTranscriptSyncStatus(transcriptId, "synced");
      queryClient.invalidateQueries({ queryKey: ["transcripts"] });
    },

    onError: async (error: Error, { transcriptId }) => {
      console.error(
        `❌ Failed to sync transcript ${transcriptId}:`,
        error.message,
      );
      await updateTranscriptSyncStatus(
        transcriptId,
        "error",
        error.message,
      );
      queryClient.invalidateQueries({ queryKey: ["transcripts"] });
    },

    retry: 3, // Retry up to 3 times
    retryDelay: (attemptIndex) =>
      Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}

/**
 * Background sync service
 *
 * Automatically syncs transcripts after they are saved
 * Non-blocking - runs in background
 */
export class BackgroundSyncService {
  private static instance: BackgroundSyncService;
  private queue: Set<string> = new Set();
  private isProcessing = false;

  private constructor() {}

  static getInstance(): BackgroundSyncService {
    if (!BackgroundSyncService.instance) {
      BackgroundSyncService.instance = new BackgroundSyncService();
    }
    return BackgroundSyncService.instance;
  }

  /**
   * Queue a transcript for background sync
   * Non-blocking - returns immediately
   */
  queueSync(transcriptId: string): void {
    console.log(
      `📤 Queuing transcript ${transcriptId} for background sync`,
    );
    this.queue.add(transcriptId);

    // Update status to pending
    updateTranscriptSyncStatus(transcriptId, "pending").catch((error) =>
      console.error("Failed to update sync status:", error),
    );

    // Start processing if not already running
    if (!this.isProcessing) {
      // Use setTimeout to ensure non-blocking
      setTimeout(() => this.processQueue(), 0);
    }
  }

  /**
   * Process the sync queue
   * Runs in background
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.size === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Get settings from localStorage
      const settings = await this.getApiSettings();

      if (!settings.apiEnabled) {
        console.log("ℹ️ API sync is disabled, clearing queue");
        this.queue.clear();
        return;
      }

      // Process each transcript in queue
      for (const transcriptId of this.queue) {
        try {
          console.log(`🔄 Processing sync for transcript ${transcriptId}`);

          // Get transcript
          const transcript = await transcripts.get(transcriptId);
          if (!transcript) {
            console.warn(
              `⚠️ Transcript ${transcriptId} not found, skipping`,
            );
            this.queue.delete(transcriptId);
            continue;
          }

          // Prepare and send
          await updateTranscriptSyncStatus(transcriptId, "syncing");
          const dto = await prepareTranscriptForSync(transcript, true);
          await sendTranscriptToApi(dto);

          // Success
          await updateTranscriptSyncStatus(transcriptId, "synced");
          this.queue.delete(transcriptId);
          console.log(`✅ Background sync completed for ${transcriptId}`);
        } catch (error) {
          console.error(
            `❌ Failed to sync transcript ${transcriptId}:`,
            error,
          );
          await updateTranscriptSyncStatus(
            transcriptId,
            "error",
            error instanceof Error ? error.message : "Unknown error",
          );
          this.queue.delete(transcriptId);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get API settings from app settings
   */
  private async getApiSettings(): Promise<{
    apiEnabled: boolean;
  }> {
    try {
      // Import settings collection
      const { settings } = await import("@/lib/localStorage/collections");

      const appSettings = await settings.get("app");
      if (!appSettings) {
        return { apiEnabled: false };
      }

      return {
        apiEnabled: appSettings.apiEnabled || false,
      };
    } catch (error) {
      console.error("Failed to get API settings:", error);
      return { apiEnabled: false };
    }
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.size;
  }

  /**
   * Clear the queue
   */
  clearQueue(): void {
    this.queue.clear();
  }
}

/**
 * Get background sync service instance
 */
export const backgroundSyncService = BackgroundSyncService.getInstance();
