"use client";

import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TranscriptWord {
  text: string;
  timestamp: number;
}

interface StreamingTranscriptProps {
  words: TranscriptWord[];
  isActive: boolean;
}

export function StreamingTranscript({
  words,
  isActive,
}: StreamingTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new words arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [words]);

  if (words.length === 0) return null;

  return (
    <Card className="w-full">
      <div className="p-4">
        {/* Header with live indicator */}
        <div className="mb-3 flex items-center justify-between border-b pb-2">
          <h3 className="text-sm font-semibold">Live Transcription</h3>
          {isActive && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs font-medium">
                LIVE
              </span>
              <div className="h-2 w-2 animate-pulse rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
            </div>
          )}
        </div>

        {/* Scrollable transcript area */}
        <div
          ref={scrollRef}
          className="max-h-[400px] overflow-y-auto rounded-lg bg-slate-50 p-4 dark:bg-slate-900"
        >
          <div className="flex flex-wrap gap-1">
            {words.map((word, index) => {
              const isRecent = Date.now() - word.timestamp < 500; // Highlight recent words
              return (
                <span
                  key={`${word.timestamp}-${index}`}
                  className={`inline-block rounded px-1 py-0.5 text-sm transition-all duration-300 ${
                    isRecent
                      ? "bg-blue-100 font-medium text-blue-900 dark:bg-blue-900/30 dark:text-blue-100"
                      : "text-foreground"
                  } `}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  {word.text}
                </span>
              );
            })}
            {isActive && (
              <span className="inline-block h-5 w-0.5 animate-pulse bg-blue-500" />
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-muted-foreground mt-3 flex items-center justify-between border-t pt-2 text-xs">
          <span>{words.length} words transcribed</span>
          {isActive && (
            <span className="text-muted-foreground">
              Speaker identification will be added when complete...
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
