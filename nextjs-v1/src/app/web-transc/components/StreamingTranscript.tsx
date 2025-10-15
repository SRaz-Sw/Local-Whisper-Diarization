"use client";

import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import AnimatedProgressBar from "./AnimatedProgressBar";
import { useWhisperStore } from "../store/useWhisperStore";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function StreamingTranscript() {
  // Read state directly from Zustand - no more prop drilling!
  const words = useWhisperStore(
    (state) => state.transcription.streamingWords,
  );
  const status = useWhisperStore((state) => state.model.status);
  const processedSeconds = useWhisperStore(
    (state) => state.processing.processedSeconds,
  );
  const totalSeconds = useWhisperStore(
    (state) => state.processing.totalSeconds,
  );
  const estimatedTimeRemaining = useWhisperStore(
    (state) => state.processing.estimatedTimeRemaining,
  );

  const isActive = status === "running";
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new words arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [words]);

  const progressPercentage =
    totalSeconds > 0
      ? Math.min((processedSeconds / totalSeconds) * 100, 100)
      : 0;

  // Don't show component if not active AND no words yet
  if (!isActive && words.length === 0) return null;

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

        {/* Progress Bar - Modern Animated Design */}
        {totalSeconds > 0 && isActive && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground font-medium">
                {formatTime(processedSeconds)} / {formatTime(totalSeconds)}
              </span>
              <span className="text-muted-foreground">
                {progressPercentage.toFixed(0)}%
              </span>
            </div>
            <AnimatedProgressBar
              value={progressPercentage}
              color="#3b82f6"
              className="my-1"
            />
            <div className="text-muted-foreground flex min-h-[20px] items-center justify-end gap-1 text-xs">
              {estimatedTimeRemaining !== null &&
              isFinite(estimatedTimeRemaining) &&
              estimatedTimeRemaining > 1 ? (
                <>
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>
                    {estimatedTimeRemaining < 60
                      ? `${Math.round(estimatedTimeRemaining)}s remaining`
                      : `${Math.floor(estimatedTimeRemaining / 60)}m ${Math.round(estimatedTimeRemaining % 60)}s remaining`}
                  </span>
                </>
              ) : (
                // Render placeholder to preserve height
                <>
                  <span
                    className="inline-block h-3 w-3"
                    aria-hidden="true"
                  ></span>
                  <span className="invisible select-none">
                    0s remaining
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Scrollable transcript area */}
        {words.length > 0 ? (
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
        ) : (
          <div className="rounded-lg bg-slate-50 p-8 text-center dark:bg-slate-900">
            <p className="text-muted-foreground text-sm">
              Waiting for transcription to start...
            </p>
          </div>
        )}

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
