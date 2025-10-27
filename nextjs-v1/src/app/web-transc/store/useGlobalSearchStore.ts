import { create } from "zustand";
import type { SearchResult } from "../types";
import type {
  SavedTranscript,
  TranscriptChunk,
} from "@/lib/localStorage/schemas";

interface GlobalSearchState {
  query: string;
  results: SearchResult[];
  totalMatches: number;
  isSearching: boolean;
  expandedTranscriptIds: Set<string>;

  setQuery: (q: string) => void;
  performSearch: (query: string, transcripts: SavedTranscript[]) => void;
  clearSearch: () => void;
  toggleExpanded: (id: string) => void;
}

/**
 * Performs search across all transcripts and returns filtered results with match counts
 * Uses the same sequential algorithm as TranscriptView for accuracy and no duplicates
 */
function searchTranscripts(
  query: string,
  allTranscripts: SavedTranscript[],
): { results: SearchResult[]; totalMatches: number } {
  console.log("🔍 searchTranscripts called:", {
    query,
    transcriptCount: allTranscripts.length,
  });

  if (!query.trim()) {
    console.log("🔍 Empty query, returning no results");
    return { results: [], totalMatches: 0 };
  }

  const queryLower = query.toLowerCase();
  const results: SearchResult[] = [];
  let totalMatches = 0;

  for (const transcript of allTranscripts) {
    const matchedSegments: SearchResult["matchedSegments"] = [];
    let transcriptMatchCount = 0;

    // Sequential processing (same as TranscriptView)
    // This ensures each word belongs to exactly one segment - no duplicates
    let prev = 0;
    const words = transcript.transcript.chunks;

    for (const segment of transcript.segments) {
      const { label, end } = segment;
      if (label === "NO_SPEAKER") continue;

      // Collect all words within this segment sequentially
      const segmentWords = [];
      for (let i = prev; i < words.length; ++i) {
        const word = words[i];
        if (word.timestamp[1] <= end) {
          segmentWords.push(word);
        } else {
          prev = i; // Continue from here for next segment
          break;
        }
      }

      if (segmentWords.length > 0) {
        // Build segment text (same as TranscriptView)
        const segmentText = segmentWords
          .map((word) => word.text.trim())
          .join(" ")
          .toLowerCase();

        // Simple substring match (same as TranscriptView)
        if (segmentText.includes(queryLower)) {
          // Count occurrences for accurate match count
          const occurrences = segmentText.split(queryLower).length - 1;

          matchedSegments.push({
            label: segment.label,
            start: segment.start,
            end: segment.end,
            chunks: segmentWords,
          });

          transcriptMatchCount += occurrences;
        }
      }
    }

    // If there are matches, add to results
    if (matchedSegments.length > 0) {
      results.push({
        transcriptId: transcript.id,
        conversationName:
          transcript.metadata.conversationName ||
          transcript.metadata.fileName,
        fileName: transcript.metadata.fileName,
        matchCount: transcriptMatchCount,
        duration: transcript.metadata.duration,
        createdAt: transcript.metadata.createdAt,
        matchedSegments,
        audioFileId: transcript.audioFileId,
      });
      totalMatches += transcriptMatchCount;
    }
  }

  // Sort: Most matches first, then most recent
  results.sort((a, b) => {
    if (b.matchCount !== a.matchCount) {
      return b.matchCount - a.matchCount;
    }
    return b.createdAt - a.createdAt;
  });

  console.log("🔍 Search complete:", {
    resultsCount: results.length,
    totalMatches,
    results: results.map((r) => ({
      name: r.conversationName,
      matches: r.matchCount,
    })),
  });

  return { results, totalMatches };
}

/**
 * Global search store for managing cross-transcript search
 */
export const useGlobalSearchStore = create<GlobalSearchState>(
  (set, get) => ({
    query: "",
    results: [],
    totalMatches: 0,
    isSearching: false,
    expandedTranscriptIds: new Set(),

    setQuery: (q) => set({ query: q }),

    performSearch: (query, transcripts) => {
      set({ isSearching: true });

      // Perform search
      const { results, totalMatches } = searchTranscripts(
        query,
        transcripts,
      );

      set({
        query,
        results,
        totalMatches,
        isSearching: false,
      });
    },

    clearSearch: () =>
      set({
        query: "",
        results: [],
        totalMatches: 0,
        expandedTranscriptIds: new Set(),
      }),

    toggleExpanded: (id) => {
      const expanded = new Set(get().expandedTranscriptIds);
      if (expanded.has(id)) {
        expanded.delete(id);
      } else {
        expanded.add(id);
      }
      set({ expandedTranscriptIds: expanded });
    },
  }),
);
