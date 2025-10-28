"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, Clock, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchResult } from "../types";
import { AudioPlayer } from "./AudioPlayer";
import type { AudioPlayerRef } from "./AudioPlayer";
import { blobStorage } from "@/lib/localStorage/storage";
import { formatTimestamp } from "../utils/transcriptFormatter";
import {
  generateSpeakerColorMap,
  getSpeakerColor as getSpeakerColorUtil,
} from "../utils/speakerColors";
import { TranscriptSegment } from "./TranscriptSegment";

interface GlobalSearchAccordionProps {
  result: SearchResult;
  isExpanded: boolean;
  onToggle: () => void;
  searchQuery: string;
}

/**
 * Formats seconds to MM:SS
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Formats date to readable format
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function GlobalSearchAccordion({
  result,
  isExpanded,
  onToggle,
  searchQuery,
}: GlobalSearchAccordionProps) {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const audioPlayerRef = useRef<AudioPlayerRef>(null);

  // Load audio blob when expanded
  useEffect(() => {
    if (isExpanded && result.audioFileId && !audioBlob) {
      blobStorage.get(result.audioFileId).then((blob) => {
        if (blob) {
          setAudioBlob(blob);
        }
      });
    }
  }, [isExpanded, result.audioFileId, audioBlob]);

  // Handler for chunk click - seek to timestamp
  const handleChunkClick = (timestamp: number) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.setTime(timestamp);
    }
  };

  // Generate speaker colors (same as WhisperTranscript)
  const speakerColorMap = useMemo(() => {
    const segments = result.matchedSegments.map((seg) => ({
      label: seg.label,
      start: seg.start,
      end: seg.end,
    }));
    return generateSpeakerColorMap(segments);
  }, [result.matchedSegments]);

  const getSpeakerColor = (label: string) => {
    return getSpeakerColorUtil(label, speakerColorMap);
  };

  const getSpeakerDisplayName = (label: string) => {
    return label;
  };

  return (
    <div
      className={cn(
        "mb-3 overflow-hidden rounded-lg border bg-white transition-all dark:bg-gray-900",
        isExpanded
          ? "border-blue-300 shadow-md dark:border-blue-700"
          : "border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700",
      )}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
        data-testid="search-result"
      >
        <div className="flex flex-1 items-center gap-3">
          {/* Expand/Collapse Icon */}
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            )}
          </div>

          {/* Conversation Name */}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {result.conversationName}
            </h3>
            {result.conversationName !== result.fileName && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {result.fileName}
              </p>
            )}
          </div>

          {/* Match Count Badge */}
          <div className="flex-shrink-0">
            <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {result.matchCount}{" "}
              {result.matchCount === 1 ? "match" : "matches"}
            </span>
          </div>
        </div>
      </button>

      {/* Metadata Row (always visible) */}
      <div className="flex items-center gap-4 border-t border-gray-100 bg-gray-50/50 px-4 py-2 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          <span>{formatDuration(result.duration)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          <span>{formatDate(result.createdAt)}</span>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          {/* Audio Player (if available) */}
          {result.audioFileId && audioBlob && (
            <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
              <AudioPlayer
                ref={audioPlayerRef}
                src={audioBlob}
                transcriptId={result.transcriptId}
                onTimeUpdate={setCurrentTime}
              />
            </div>
          )}

          {/* Matched Segments - limit to 3 visible, scroll for more */}
          <div className="max-h-[400px] space-y-4 overflow-y-auto">
            {result.matchedSegments.map((segment, idx) => (
              <TranscriptSegment
                key={idx}
                label={segment.label}
                start={segment.start}
                chunks={segment.chunks}
                currentTime={currentTime}
                onChunkClick={handleChunkClick}
                searchQuery={searchQuery}
                getSpeakerColor={getSpeakerColor}
                getSpeakerDisplayName={getSpeakerDisplayName}
                formatTimestamp={formatTimestamp}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
