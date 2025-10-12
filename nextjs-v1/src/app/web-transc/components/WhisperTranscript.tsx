import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Sparkles } from "lucide-react";
import { ExportToLLMModal } from "./ExportToLLMModal";
import type { ChunkProps, WhisperTranscriptProps } from "../types";

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

const WhisperTranscript = ({
  transcript,
  segments,
  currentTime,
  setCurrentTime,
  className,
  ...props
}: WhisperTranscriptProps) => {
  const [showExportModal, setShowExportModal] = useState(false);

  const jsonTranscript = useMemo(() => {
    return (
      JSON.stringify(
        {
          ...transcript,
          segments,
        },
        null,
        2,
      )
        // post-process the JSON to make it more readable
        .replace(
          /( {4}"timestamp": )\[\s+(\S+)\s+(\S+)\s+\]/gm,
          "$1[$2 $3]",
        )
    );
  }, [transcript, segments]);

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

  const downloadTranscript = () => {
    const blob = new Blob([jsonTranscript], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "whisper-transcript.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Generate speaker colors
  const getSpeakerColor = (index: number) => {
    const colors = [
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    ];
    return colors[index % colors.length];
  };

  return (
    <>
      <ScrollArea className="h-[300px]">
        <div {...props} className={className}>
          {postProcessedTranscript.map(
            ({ label, start, end, chunks }, i) => (
              <div className="border-t py-3 first:border-t-0" key={i}>
                <div className="mb-2 flex items-center justify-between">
                  <Badge
                    variant="secondary"
                    className={getSpeakerColor(i)}
                  >
                    {label}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {start.toFixed(2)} → {end.toFixed(2)}
                  </span>
                </div>
                <div className="leading-relaxed">
                  {chunks.map((chunk, j) => (
                    <Chunk
                      key={j}
                      chunk={chunk}
                      currentTime={currentTime}
                      onClick={() => setCurrentTime(chunk.timestamp[0])}
                    />
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      </ScrollArea>

      <div className="flex justify-center gap-2 border-t p-3">
        <Button
          onClick={() => setShowExportModal(true)}
          variant="default"
          className="gap-2"
          size="sm"
        >
          <Sparkles className="h-4 w-4" />
          Export to LLM
        </Button>
        <Button
          onClick={downloadTranscript}
          variant="outline"
          className="gap-2"
          size="sm"
        >
          <Download className="h-4 w-4" />
          Download JSON
        </Button>
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
