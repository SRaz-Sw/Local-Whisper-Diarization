/**
 * TranscriptSegment - Reusable component for rendering a speaker segment with animations
 * Used by both WhisperTranscript and GlobalSearchAccordion
 */

import { motion } from "framer-motion";
import type { TranscriptChunk } from "../types";
import { useRef, useEffect } from "react";

interface TranscriptSegmentProps {
  label: string;
  start: number;
  chunks: TranscriptChunk[];
  currentTime: number;
  onChunkClick: (timestamp: number) => void;
  searchQuery: string;
  getSpeakerColor: (label: string) => string;
  getSpeakerDisplayName: (label: string) => string;
  formatTimestamp: (time: number) => string;
}

/**
 * Chunk component - displays individual word with hover and click effects
 */
function Chunk({
  chunk,
  currentTime,
  onClick,
  searchQuery,
}: {
  chunk: TranscriptChunk;
  currentTime: number;
  onClick: () => void;
  searchQuery: string;
}) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const { text, timestamp } = chunk;
  const [start, end] = timestamp;

  const bolded = start <= currentTime && currentTime < end;

  useEffect(() => {
    if (spanRef.current && bolded) {
      spanRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
    }
  }, [bolded]);

  // Function to highlight search terms in text
  const highlightText = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) {
      return text.trim();
    }

    const regex = new RegExp(
      `(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );
    const parts = text.trim().split(regex);

    return parts.map((part, index) => {
      if (regex.test(part)) {
        return (
          <mark
            key={index}
            className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-800"
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  };

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
        {highlightText(text, searchQuery)}
      </span>
    </span>
  );
}

/**
 * TranscriptSegment - Animated segment with speaker indicator
 */
export function TranscriptSegment({
  label,
  start,
  chunks,
  currentTime,
  onChunkClick,
  searchQuery,
  getSpeakerColor,
  getSpeakerDisplayName,
  formatTimestamp,
}: TranscriptSegmentProps) {
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
      y: -28,
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
    <motion.div
      className="border-border/50 hover:border-border/100 flex gap-4 border-b last:border-b-0"
      variants={containerVariants}
      initial="default"
      whileHover="hover"
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
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
              <span>{getSpeakerDisplayName(label)}</span>
              <span style={{ display: "inline-block", width: "2em" }} />
              <span>{formatTimestamp(start)}</span>
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
            onClick={() => onChunkClick(chunk.timestamp[0])}
            searchQuery={searchQuery}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
