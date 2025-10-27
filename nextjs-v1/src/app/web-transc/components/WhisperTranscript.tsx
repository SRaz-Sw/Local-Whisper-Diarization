import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ExportToLLMModal } from "./ExportToLLMModal";
import { TranscriptSegment } from "./TranscriptSegment";
import { useWhisperStore } from "../store/useWhisperStore";
import { formatTimestamp } from "../utils/transcriptFormatter";
import {
  generateSpeakerColorMap,
  getSpeakerColor as getSpeakerColorUtil,
} from "../utils/speakerColors";
import type { TranscriptChunk, SpeakerSegment } from "../types";

interface WhisperTranscriptProps {
  currentTime: number;
  setCurrentTime: (time: number) => void;
  className?: string;
}

const WhisperTranscript = ({
  currentTime,
  setCurrentTime,
  className,
  ...props
}: WhisperTranscriptProps) => {
  // Read transcript and segments from Zustand - no more prop drilling!
  const result = useWhisperStore((state) => state.transcription.result);
  const speakerNames = useWhisperStore(
    (state) => state.transcription.speakerNames,
  );
  const searchQuery = useWhisperStore((state) => state.ui.searchQuery);

  const [showExportModal, setShowExportModal] = useState(false);

  // Listen for export modal trigger from parent
  useEffect(() => {
    const handleExportTrigger = () => {
      setShowExportModal(true);
    };
    window.addEventListener("export-to-llm", handleExportTrigger);
    return () => {
      window.removeEventListener("export-to-llm", handleExportTrigger);
    };
  }, []);

  // Post-process the transcript to highlight speaker changes and filter by search query
  const postProcessedTranscript = useMemo((): Array<
    SpeakerSegment & { chunks: TranscriptChunk[] }
  > => {
    if (!result) return [];

    const { transcript, segments } = result;
    let prev = 0;
    const words = transcript.chunks;

    const processed: Array<
      SpeakerSegment & { chunks: TranscriptChunk[] }
    > = [];

    for (const segment of segments) {
      const { label, end } = segment;
      if (label === "NO_SPEAKER") continue;

      // Collect all words within this segment
      const segmentWords = [];
      for (let i = prev; i < words.length; ++i) {
        const word = words[i];
        if (word.timestamp[1] <= end) {
          segmentWords.push(word);
        } else {
          prev = i;
          break;
        }
      }

      // Filter by search query if provided
      if (segmentWords.length > 0) {
        const segmentText = segmentWords
          .map((word) => word.text.trim())
          .join(" ")
          .toLowerCase();

        // If no search query, include all segments
        // If search query exists, only include segments containing the query
        if (
          !searchQuery.trim() ||
          segmentText.includes(searchQuery.toLowerCase())
        ) {
          processed.push({
            ...segment,
            chunks: segmentWords,
          });
        }
      }
    }
    return processed;
  }, [result, searchQuery]);

  // Generate speaker colors - map speaker labels to consistent colors
  const speakerColorMap = useMemo(() => {
    if (!result) return new Map();
    return generateSpeakerColorMap(result.segments);
  }, [result]);

  const getSpeakerColor = (label: string) => {
    return getSpeakerColorUtil(label, speakerColorMap);
  };

  // Get display name for speaker (custom name or default label)
  const getSpeakerDisplayName = (label: string) => {
    return speakerNames?.[label] || label;
  };

  // Early return if no result
  if (!result) return null;

  const { transcript, segments } = result;

  return (
    <>
      <div {...props} className={className}>
        {postProcessedTranscript.length === 0 && searchQuery.trim() ? (
          <div className="text-muted-foreground py-8 text-center">
            <svg
              className="mx-auto mb-4 h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="text-lg font-medium">No results found</p>
            <p className="text-sm">Try a different search term</p>
          </div>
        ) : (
          postProcessedTranscript.map(
            ({ label, start, end, chunks }, i) => (
              <TranscriptSegment
                key={i}
                label={label}
                start={start}
                chunks={chunks}
                currentTime={currentTime}
                onChunkClick={setCurrentTime}
                searchQuery={searchQuery}
                getSpeakerColor={getSpeakerColor}
                getSpeakerDisplayName={getSpeakerDisplayName}
                formatTimestamp={formatTimestamp}
              />
            ),
          )
        )}
      </div>

      <ExportToLLMModal
        open={showExportModal}
        onOpenChange={setShowExportModal}
        chunks={transcript.chunks}
        segments={segments}
      />
    </>
  );
};

export default WhisperTranscript;
