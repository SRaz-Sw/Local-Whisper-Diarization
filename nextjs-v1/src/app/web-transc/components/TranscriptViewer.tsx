"use client";

import { useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import MediaFileUpload from "./MediaFileUpload";
import WhisperTranscript from "./WhisperTranscript";
import { useTranscripts } from "../hooks/useTranscripts";
import { useWhisperStore } from "../store/useWhisperStore";
import type { WhisperMediaInputRef } from "../types";

interface TranscriptViewerProps {
  onReset?: () => void;
}

/**
 * TranscriptViewer - Displays a completed transcript with audio player and actions
 * Extracted from WhisperDiarization to be reusable in both main page and individual transcript routes
 */
const TranscriptViewer = ({ onReset }: TranscriptViewerProps) => {
  const mediaInputRef = useRef<WhisperMediaInputRef>(null);

  // Storage hook for saving transcripts
  const { save: saveTranscript } = useTranscripts();

  // Read all state from Zustand
  const result = useWhisperStore((state) => state.transcription.result);
  const generationTime = useWhisperStore(
    (state) => state.transcription.generationTime,
  );
  const audioFileName = useWhisperStore(
    (state) => state.audio.audioFileName,
  );
  const language = useWhisperStore((state) => state.audio.language);
  const model = useWhisperStore((state) => state.model.model);
  const searchQuery = useWhisperStore((state) => state.ui.searchQuery);
  const isSaving = useWhisperStore((state) => state.ui.isSaving);
  const isLoadingFromStorage = useWhisperStore(
    (state) => state.ui.isLoadingFromStorage,
  );

  // Zustand setters
  const setAudio = useWhisperStore((state) => state.setAudio);
  const setResult = useWhisperStore((state) => state.setResult);
  const setSearchQuery = useWhisperStore((state) => state.setSearchQuery);
  const setIsSaving = useWhisperStore((state) => state.setIsSaving);
  const setIsLoadingFromStorage = useWhisperStore(
    (state) => state.setIsLoadingFromStorage,
  );

  const currentTime = useWhisperStore((state) => state.ui.currentTime);
  const setCurrentTime = useWhisperStore((state) => state.setCurrentTime);

  // Listen for audio blob loading from route page
  useEffect(() => {
    const handleLoadAudioBlob = (e: CustomEvent) => {
      const { blob, fileName } = e.detail;
      if (mediaInputRef.current && blob) {
        mediaInputRef.current.loadFromBlob(blob, fileName);
      }
    };

    window.addEventListener(
      "load-audio-blob",
      handleLoadAudioBlob as EventListener,
    );
    return () => {
      window.removeEventListener(
        "load-audio-blob",
        handleLoadAudioBlob as EventListener,
      );
    };
  }, []);

  if (!result || generationTime === null) {
    return null;
  }

  return (
    <div className="w-full space-y-4 pt-44">
      {/* Audio player - sticky header */}
      <div className="bg-background/95 fixed top-0 right-0 left-0 z-50 border-b shadow-lg backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex flex-col gap-3">
            <MediaFileUpload
              ref={mediaInputRef}
              onInputChange={(audio) => {
                // Read the flag directly from Zustand store to avoid stale closures
                const currentFlag =
                  useWhisperStore.getState().ui.isLoadingFromStorage;

                // Only clear result if we're NOT loading from storage
                if (!currentFlag) {
                  setResult(null);
                }
                setAudio(audio);
                // Reset the flag after audio is loaded
                setIsLoadingFromStorage(false);
              }}
              onTimeUpdate={(time) => setCurrentTime(time)}
              onFileNameChange={(fileName) => {
                useWhisperStore.getState().setAudioFileName(fileName);
              }}
            />

            {/* Search input */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <svg
                  className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
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
                <input
                  type="text"
                  placeholder="Search in transcript..."
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-10 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                  }}
                />
              </div>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                  }}
                  className="text-muted-foreground hover:text-foreground rounded-md p-2 transition-colors"
                  title="Clear search"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* Primary actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              // We'll need to expose a method to trigger export modal
              const event = new CustomEvent("export-to-llm");
              window.dispatchEvent(event);
            }}
            variant="default"
            className="gap-2"
            size="sm"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
            Export to LLM
          </Button>
        </div>

        {/* Separator */}
        <div className="border-muted bg-border h-6 w-px" />

        {/* Secondary actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={async () => {
              if (!result) return;

              setIsSaving(true);
              try {
                // Get the audio file from the media component
                const audioFile = mediaInputRef.current?.getFile();

                const id = await saveTranscript({
                  transcript: result.transcript,
                  segments: result.segments,
                  fileName: audioFileName || "untitled",
                  language: language,
                  model: model,
                  audioBlob: audioFile || undefined, // Include audio blob if available
                });

                toast.success("Transcript saved successfully!", {
                  description: audioFile
                    ? `Saved "${audioFileName || "untitled"}" with audio`
                    : `Saved "${audioFileName || "untitled"}" (without audio)`,
                });

                console.log(
                  "Transcript saved with ID:",
                  id,
                  audioFile ? "with audio" : "without audio",
                );
              } catch (error) {
                console.error("Failed to save transcript:", error);
                toast.error("Failed to save transcript", {
                  description:
                    error instanceof Error
                      ? error.message
                      : "Unknown error occurred",
                });
              } finally {
                setIsSaving(false);
              }
            }}
            variant="outline"
            className="gap-2"
            size="sm"
            disabled={isSaving}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            {isSaving ? "Saving..." : "Save"}
          </Button>
          {onReset && (
            <Button
              onClick={onReset}
              variant="outline"
              className="gap-2"
              size="sm"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Back to Home
            </Button>
          )}
        </div>
      </div>

      {/* Transcript card */}
      <Card>
        <WhisperTranscript
          className="p-4"
          currentTime={currentTime}
          setCurrentTime={(time) => {
            setCurrentTime(time);
            mediaInputRef.current?.setMediaTime(time);
          }}
        />
      </Card>

      {generationTime !== null && generationTime > 0 && (
        <p className="text-muted-foreground text-end text-xs">
          Generation time:{" "}
          <span className="font-semibold">{generationTime.toFixed(2)}ms</span>
        </p>
      )}
    </div>
  );
};

export default TranscriptViewer;
