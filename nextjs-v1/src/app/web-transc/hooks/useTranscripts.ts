/**
 * useTranscripts Hook
 *
 * Provides CRUD operations for saved transcripts with automatic state management.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { transcripts } from "@/lib/localStorage/collections";
import { blobStorage } from "@/lib/localStorage/storage";
import type {
  SavedTranscript,
  TranscriptChunk,
  SpeakerSegment,
} from "@/lib/localStorage/schemas";

/**
 * Hook for managing transcripts
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { transcripts, save, remove, loading } = useTranscripts()
 *
 *   const handleSave = async () => {
 *     const id = await save({
 *       transcript: { text: '...', chunks: [...] },
 *       segments: [...],
 *       fileName: 'My Recording'
 *     })
 *     console.log('Saved with ID:', id)
 *   }
 *
 *   return (
 *     <div>
 *       {transcripts.map(t => (
 *         <div key={t.id}>{t.metadata.fileName}</div>
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useTranscripts() {
  const [items, setItems] = useState<SavedTranscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Load all transcripts from storage
   */
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await transcripts.list();

      // Sort by most recent (updatedAt)
      const sorted = data
        .map((item) => item.value)
        .sort((a, b) => b.metadata.updatedAt - a.metadata.updatedAt);

      setItems(sorted);
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error("Failed to load transcripts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    load();
  }, [load]);

  /**
   * Save a new transcript
   *
   * @param data - Transcript data to save
   * @returns Promise with the generated transcript ID
   */
  const save = useCallback(
    async (data: {
      transcript: { text: string; chunks: TranscriptChunk[] };
      segments: SpeakerSegment[];
      fileName?: string;
      audioBlob?: Blob;
      language?: string;
      model?: string;
    }): Promise<string> => {
      try {
        // Generate unique ID
        const id = `transcript-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

        // Save audio blob if provided
        let audioFileId: string | undefined;
        if (data.audioBlob) {
          audioFileId = `audio-${id}`;
          await blobStorage.save(audioFileId, data.audioBlob);
        }

        // Calculate metadata
        const lastChunk =
          data.transcript.chunks[data.transcript.chunks.length - 1];
        const duration = lastChunk?.timestamp[1] || 0;
        const speakerCount = new Set(data.segments.map((s) => s.label))
          .size;

        // Create transcript object
        const transcript: SavedTranscript = {
          id,
          transcript: data.transcript,
          segments: data.segments,
          audioFileId,
          metadata: {
            fileName: data.fileName || "untitled",
            duration,
            speakerCount,
            language: data.language || "en",
            model: data.model || "unknown",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        };

        // Save (Zod validation happens automatically)
        await transcripts.set(id, transcript);

        // Reload list to reflect changes
        await load();

        return id;
      } catch (err) {
        const error = err as Error;
        console.error("Failed to save transcript:", error);
        throw error;
      }
    },
    [load],
  );

  /**
   * Delete a transcript (including associated audio file)
   *
   * @param id - ID of transcript to delete
   */
  const remove = useCallback(
    async (id: string): Promise<void> => {
      try {
        // Get transcript to find audio file
        const transcript = await transcripts.get(id);

        // Delete audio blob if exists
        if (transcript?.audioFileId) {
          await blobStorage.remove(transcript.audioFileId);
        }

        // Delete transcript
        await transcripts.remove(id);

        // Reload list
        await load();
      } catch (err) {
        const error = err as Error;
        console.error("Failed to delete transcript:", error);
        throw error;
      }
    },
    [load],
  );

  /**
   * Update an existing transcript
   *
   * @param id - ID of transcript to update
   * @param updates - Partial transcript data to update
   */
  const update = useCallback(
    async (
      id: string,
      updates: Partial<Pick<SavedTranscript, "transcript" | "segments">>,
    ): Promise<void> => {
      try {
        const existing = await transcripts.get(id);
        if (!existing) {
          throw new Error("Transcript not found");
        }

        // Recalculate metadata if transcript chunks changed
        let duration = existing.metadata.duration;
        let speakerCount = existing.metadata.speakerCount;

        if (updates.transcript?.chunks) {
          const lastChunk =
            updates.transcript.chunks[
              updates.transcript.chunks.length - 1
            ];
          duration = lastChunk?.timestamp[1] || 0;
        }

        if (updates.segments) {
          speakerCount = new Set(updates.segments.map((s) => s.label))
            .size;
        }

        const updated: SavedTranscript = {
          ...existing,
          ...updates,
          metadata: {
            ...existing.metadata,
            duration,
            speakerCount,
            updatedAt: Date.now(),
          },
        };

        await transcripts.set(id, updated);
        await load();
      } catch (err) {
        const error = err as Error;
        console.error("Failed to update transcript:", error);
        throw error;
      }
    },
    [load],
  );

  /**
   * Get a single transcript with its audio file (if available)
   *
   * @param id - ID of transcript to get
   * @returns Transcript and audio blob, or null if not found
   */
  const getWithAudio = useCallback(
    async (
      id: string,
    ): Promise<{
      transcript: SavedTranscript;
      audioBlob: Blob | null;
    } | null> => {
      try {
        const transcript = await transcripts.get(id);
        if (!transcript) return null;

        let audioBlob: Blob | null = null;
        if (transcript.audioFileId) {
          audioBlob = await blobStorage.get(transcript.audioFileId);
        }

        return { transcript, audioBlob };
      } catch (err) {
        const error = err as Error;
        console.error("Failed to get transcript with audio:", error);
        throw error;
      }
    },
    [],
  );

  /**
   * Get a single transcript (without audio)
   *
   * @param id - ID of transcript to get
   * @returns Transcript or null if not found
   */
  const get = useCallback(
    async (id: string): Promise<SavedTranscript | null> => {
      try {
        return await transcripts.get(id);
      } catch (err) {
        const error = err as Error;
        console.error("Failed to get transcript:", error);
        throw error;
      }
    },
    [],
  );

  /**
   * Search transcripts by text content
   *
   * @param query - Search query
   * @returns Filtered transcripts
   */
  const search = useCallback(
    (query: string): SavedTranscript[] => {
      if (!query.trim()) return items;

      const lowerQuery = query.toLowerCase();
      return items.filter(
        (transcript) =>
          transcript.metadata.fileName
            .toLowerCase()
            .includes(lowerQuery) ||
          transcript.transcript.text.toLowerCase().includes(lowerQuery),
      );
    },
    [items],
  );

  /**
   * Update metadata fields (conversation name, speaker names, etc.)
   *
   * @param id - ID of transcript to update
   * @param metadata - Partial metadata to update
   */
  const updateMetadata = useCallback(
    async (
      id: string,
      metadata: Partial<Pick<SavedTranscript["metadata"], "conversationName" | "speakerNames">>,
    ): Promise<void> => {
      try {
        const existing = await transcripts.get(id);
        if (!existing) {
          throw new Error("Transcript not found");
        }

        const updated: SavedTranscript = {
          ...existing,
          metadata: {
            ...existing.metadata,
            ...metadata,
            updatedAt: Date.now(),
          },
        };

        await transcripts.set(id, updated);
        await load();
      } catch (err) {
        const error = err as Error;
        console.error("Failed to update metadata:", error);
        throw error;
      }
    },
    [load],
  );

  return {
    // State
    transcripts: items,
    loading,
    error,

    // Actions
    save,
    remove,
    update,
    updateMetadata,
    get,
    getWithAudio,
    search,
    refresh: load,
  };
}
