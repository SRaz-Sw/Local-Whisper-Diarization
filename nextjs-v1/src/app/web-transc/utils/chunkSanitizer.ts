import type { TranscriptChunk } from "@/lib/localStorage/schemas";

/**
 * Sanitize transcript chunks by filtering out invalid chunks with null timestamps
 * and fixing chunks where the end timestamp is null by using the start timestamp
 *
 * This utility handles cases where the Whisper model returns chunks with null
 * timestamp values, which would fail Zod validation when saving to IndexedDB.
 *
 * @param chunks - Array of transcript chunks to sanitize
 * @returns Sanitized array of chunks with valid timestamps
 */
export function sanitizeChunks(
  chunks: TranscriptChunk[],
): TranscriptChunk[] {
  return chunks
    .map((chunk) => {
      // If both timestamps are valid, return as-is
      if (
        typeof chunk.timestamp[0] === "number" &&
        typeof chunk.timestamp[1] === "number"
      ) {
        return chunk;
      }

      // If start timestamp is valid but end is null, use start for both
      if (
        typeof chunk.timestamp[0] === "number" &&
        chunk.timestamp[1] === null
      ) {
        console.warn(
          `⚠️ Chunk with null end timestamp detected, using start timestamp: "${chunk.text}"`,
        );
        return {
          ...chunk,
          timestamp: [chunk.timestamp[0], chunk.timestamp[0]] as [
            number,
            number,
          ],
        };
      }

      // If start timestamp is also null, return null (will be filtered out)
      console.warn(
        `⚠️ Chunk with null start timestamp detected, removing: "${chunk.text}"`,
      );
      return null;
    })
    .filter((chunk): chunk is TranscriptChunk => chunk !== null);
}
