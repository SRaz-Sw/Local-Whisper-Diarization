import type { TranscriptChunk, SpeakerSegment } from "../types";

/**
 * Formats a timestamp in seconds to MM:SS format
 */
export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Formats the transcript for LLM consumption with timestamps and speaker labels
 * Example output:
 * 0:00 - Speaker_1:
 * Hey, Have a reached Noam
 *
 * 0:05 - Speaker_2:
 * Yes this is Noam, how can i help you?
 */
export function formatTranscriptForLLM(
  chunks: TranscriptChunk[],
  segments: SpeakerSegment[],
  speakerNames?: Record<string, string> | null,
): string {
  // Group chunks by speaker segments
  const groupedSegments: Array<{
    label: string;
    start: number;
    text: string;
  }> = [];

  let prev = 0;
  for (const segment of segments) {
    const { label, end, start } = segment;
    if (label === "NO_SPEAKER") continue;

    // Collect all words within this segment
    const segmentWords = [];
    for (let i = prev; i < chunks.length; ++i) {
      const word = chunks[i];
      if (word.timestamp[1] <= end) {
        segmentWords.push(word);
      } else {
        prev = i;
        break;
      }
    }

    if (segmentWords.length > 0) {
      const text = segmentWords
        .map((w) => w.text)
        .join("")
        .trim();
      groupedSegments.push({
        label,
        start,
        text,
      });
    }
  }

  // Format as text with timestamps
  return groupedSegments
    .map(({ label, start, text }) => {
      // Use custom speaker name if available, otherwise use label
      const displayName = speakerNames?.[label] || label;
      return `${formatTimestamp(start)} - ${displayName}:\n${text}`;
    })
    .join("\n\n");
}

/**
 * Calculates the total duration of the transcript
 */
export function getTranscriptDuration(chunks: TranscriptChunk[]): number {
  if (chunks.length === 0) return 0;
  const lastChunk = chunks[chunks.length - 1];
  return lastChunk.timestamp[1];
}

/**
 * Gets the count of unique speakers (excluding NO_SPEAKER)
 */
export function getUniqueSpeakerCount(segments: SpeakerSegment[]): number {
  const uniqueSpeakers = new Set(
    segments.filter((s) => s.label !== "NO_SPEAKER").map((s) => s.label),
  );
  return uniqueSpeakers.size;
}

/**
 * Remaps speaker labels to ensure they start from SPEAKER_1
 * Maps speakers based on their first appearance in time order
 */
export function remapSpeakerLabels(
  segments: SpeakerSegment[],
): SpeakerSegment[] {
  // Get unique speaker labels in order of first appearance
  const uniqueSpeakers: string[] = [];
  const seen = new Set<string>();

  for (const segment of segments) {
    if (segment.label !== "NO_SPEAKER" && !seen.has(segment.label)) {
      uniqueSpeakers.push(segment.label);
      seen.add(segment.label);
    }
  }

  // Create mapping from old labels to new labels (starting from SPEAKER_1)
  const labelMap = new Map<string, string>();
  uniqueSpeakers.forEach((label, index) => {
    labelMap.set(label, `SPEAKER_${index + 1}`);
  });

  // Return segments with remapped labels
  return segments.map((segment) => {
    if (segment.label === "NO_SPEAKER") {
      return segment;
    }
    return {
      ...segment,
      label: labelMap.get(segment.label) || segment.label,
    };
  });
}
