import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ExportToLLMModal } from "./ExportToLLMModal";
import type { ChunkProps } from "../types";
import { motion } from "framer-motion";
import { useWhisperStore } from "../store/useWhisperStore";

const Chunk = ({ chunk, currentTime, onClick }: ChunkProps) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const { text, timestamp } = chunk;
  const [start, end] = timestamp;

  const bolded = start <= currentTime && currentTime < end;

  useEffect(() => {
    if (spanRef.current && bolded) {
      // scroll into view
      spanRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
    }
  }, [bolded]);

  return (
    <span>
      {text.startsWith(" ") ? " " : ""}
      <span
        ref={spanRef}
        onClick={onClick}
        className="cursor-pointer text-base text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400"
        title={timestamp.map((x) => x.toFixed(2)).join(" → ")}
        style={{
          textDecoration: bolded ? "underline" : "none",
          textShadow: bolded ? "0 0 1px currentColor" : "none",
          fontWeight: bolded ? 600 : 400,
        }}
      >
        {text.trim()}
      </span>
    </span>
  );
};

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

  // Early return if no result
  if (!result) return null;

  const { transcript, segments } = result;
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

  // Post-process the transcript to highlight speaker changes
  const postProcessedTranscript = useMemo(() => {
    let prev = 0;
    const words = transcript.chunks;

    const result: Array<{
      label: string;
      start: number;
      end: number;
      chunks: typeof words;
    }> = [];

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
      if (segmentWords.length > 0) {
        result.push({
          ...segment,
          chunks: segmentWords,
        });
      }
    }
    return result;
  }, [transcript, segments]);

  // Generate speaker colors - map speaker labels to consistent colors
  const speakerColorMap = useMemo(() => {
    const colors = [
      "bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200",
      "bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      "bg-orange-200 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      "bg-pink-200 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
      "bg-indigo-200 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    ];

    // Get unique speakers in order of appearance
    const uniqueSpeakers: string[] = [];
    const seen = new Set<string>();
    for (const segment of segments) {
      if (segment.label !== "NO_SPEAKER" && !seen.has(segment.label)) {
        uniqueSpeakers.push(segment.label);
        seen.add(segment.label);
      }
    }

    // Map each speaker to a color
    const map = new Map<string, string>();
    uniqueSpeakers.forEach((speaker, index) => {
      map.set(speaker, colors[index % colors.length]);
    });

    return map;
  }, [segments]);

  const getSpeakerColor = (label: string) => {
    return (
      speakerColorMap.get(label) ||
      "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    );
  };

  // Animation variants
  const containerVariants = {
    default: {
      paddingTop: 6,
      paddingBottom: 6,
    },
    hover: {
      paddingTop: 20,
      paddingBottom: 12,
    },
  };

  const dotLabelWrapperVariants = {
    default: {
      y: 0,
    },
    hover: {
      y: -28, // Move the entire wrapper up by a fixed amount
    },
  };

  const labelVariants = {
    default: {
      opacity: 0,
      x: -10,
    },
    hover: {
      opacity: 1,
      x: 0,
    },
  };

  const textVariants = {
    default: {
      y: 0,
    },
    hover: {
      y: 13,
    },
  };

  return (
    <>
      <div {...props} className={className}>
        {postProcessedTranscript.map(
          ({ label, start, end, chunks }, i) => (
            <motion.div
              key={i}
              className="border-border/50 hover:border-border/100 flex gap-4 border-b last:border-b-0"
              variants={containerVariants}
              initial="default"
              whileHover="hover"
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {/* Left side: Vertical line with dot */}
              <div className="relative flex min-h-[70px] w-px flex-col">
                {/* Vertical line - full height */}
                <div className="b absolute inset-0 w-px" />

                {/* Dot container - centered vertically by flexbox */}
                <div
                  className={`flex flex-1 items-center justify-center ${getSpeakerColor(label)}`}
                >
                  {/* Wrapper that moves both dot and label together */}
                  <motion.div
                    className="relative"
                    variants={dotLabelWrapperVariants}
                    transition={{
                      type: "tween",
                      duration: 0.15,
                    }}
                  >
                    {/* Animated dot */}
                    <div
                      className={`h-3 w-3 rounded-full ${getSpeakerColor(label)}`}
                    />

                    {/* Speaker label - only fades and slides, no Y movement */}
                    <motion.div
                      className={`absolute top-1/2 left-4 -translate-y-1/2 rounded-lg px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${getSpeakerColor(label)}`}
                      variants={labelVariants}
                      transition={{
                        type: "spring",
                        stiffness: 200,
                        damping: 25,
                        delay: 0.1,
                      }}
                    >
                      {label}
                    </motion.div>
                  </motion.div>
                </div>
              </div>

              {/* Right side: Text content */}
              <motion.div
                className="my-auto flex-1 py-2 leading-relaxed"
                variants={textVariants}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                }}
              >
                {chunks.map((chunk, j) => (
                  <Chunk
                    key={j}
                    chunk={chunk}
                    currentTime={currentTime}
                    onClick={() => setCurrentTime(chunk.timestamp[0])}
                  />
                ))}
              </motion.div>
            </motion.div>
          ),
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
