/**
 * TranscriptView - Display completed transcript with actions
 * Props: { id: string } - transcript ID
 * Shows: Audio player (sticky), transcript, search, actions
 */

"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouterStore } from "../store/useRouterStore";
import { useWhisperStore } from "../store/useWhisperStore";
import { useTranscripts } from "../hooks/useTranscripts";
import {
  AudioPlayer,
  type AudioPlayerRef,
} from "../components/AudioPlayer";
import WhisperTranscript from "../components/WhisperTranscript";
import { ThemeToggle } from "../components/ThemeToggle";
import { useSidebar } from "@/components/ui/sidebar"; // Add this import

interface TranscriptViewProps {
  id: string;
}

export default function TranscriptView({ id }: TranscriptViewProps) {
  const navigate = useRouterStore((state) => state.navigate);

  // Whisper store state
  const result = useWhisperStore((state) => state.transcription.result);
  const setResult = useWhisperStore((state) => state.setResult);
  const generationTime = useWhisperStore(
    (state) => state.transcription.generationTime,
  );
  const setGenerationTime = useWhisperStore(
    (state) => state.setGenerationTime,
  );
  const audioFile = useWhisperStore((state) => state.audio.audioFile);
  const setAudioFile = useWhisperStore((state) => state.setAudioFile);
  const audioFileName = useWhisperStore(
    (state) => state.audio.audioFileName,
  );
  const setAudioFileName = useWhisperStore(
    (state) => state.setAudioFileName,
  );
  const setAudio = useWhisperStore((state) => state.setAudio);
  const language = useWhisperStore((state) => state.audio.language);
  const setLanguage = useWhisperStore((state) => state.setLanguage);
  const model = useWhisperStore((state) => state.model.model);
  const setModel = useWhisperStore((state) => state.setModel);
  const searchQuery = useWhisperStore((state) => state.ui.searchQuery);
  const setSearchQuery = useWhisperStore((state) => state.setSearchQuery);

  const setSpeakerNames = useWhisperStore(
    (state) => state.setSpeakerNames,
  );
  const setCurrentTranscriptId = useWhisperStore(
    (state) => state.setCurrentTranscriptId,
  );
  const setIsLoadingFromStorage = useWhisperStore(
    (state) => state.setIsLoadingFromStorage,
  );

  // Local state
  const [currentTime, setCurrentTime] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const audioPlayerRef = useRef<AudioPlayerRef>(null);

  // Storage
  const { save: saveTranscript, getWithAudio } = useTranscripts();
  const { state: sidebarState, isMobile } = useSidebar(); // Get sidebar state

  // Calculate dynamic positioning based on sidebar state
  const sidebarWidth = isMobile
    ? 0
    : sidebarState === "expanded"
      ? "var(--sidebar-width)"
      : "var(--sidebar-width-icon)";

  // Load transcript if not in store (e.g., deep link)
  useEffect(() => {
    if (id !== "unsaved") {
      console.log("📥 Loading transcript from storage:", id);
      loadTranscriptFromStorage(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Load transcript from storage
  const loadTranscriptFromStorage = async (transcriptId: string) => {
    try {
      console.log("📥 Loading transcript from storage:", transcriptId);
      const result = await getWithAudio(transcriptId);
      if (!result) {
        console.error("❌ Transcript not found:", transcriptId);
        toast.error("Transcript not found");
        navigate("upload");
        return;
      }

      const { transcript: data, audioBlob } = result;
      console.log(
        "📦 Audio blob retrieved:",
        !!audioBlob,
        audioBlob?.type,
      );

      // Map segments
      const segmentsWithMissingProps = data.segments.map(
        (segment, index) => ({
          ...segment,
          id: index,
          confidence: 1.0,
        }),
      );

      // Load into store
      setResult({
        transcript: data.transcript,
        segments: segmentsWithMissingProps,
      });
      setGenerationTime(0);
      setSpeakerNames(data.metadata.speakerNames || null);
      setCurrentTranscriptId(transcriptId);
      setAudioFileName(data.metadata.fileName);
      setLanguage(data.metadata.language);
      setModel(data.metadata.model);

      // Load audio into store
      if (audioBlob) {
        setIsLoadingFromStorage(true);
        // Convert Blob to File for consistency
        const file = new File([audioBlob], data.metadata.fileName, {
          type: audioBlob.type,
        });
        setAudioFile(file);
      } else {
        console.warn(
          "⚠️ No audio blob found for transcript:",
          transcriptId,
        );
        setAudioFile(null);
      }

      toast.success("Transcript loaded!", {
        description: `Loaded "${data.metadata.fileName}"`,
      });
    } catch (error) {
      console.error("Failed to load transcript:", error);
      toast.error("Failed to load transcript", {
        description:
          error instanceof Error ? error.message : "Unknown error",
      });
      navigate("upload");
    }
  };

  // Handle save transcript
  const handleSave = useCallback(async () => {
    if (!result) return;

    console.log("💾 Saving transcript manually...");
    console.log("📦 Audio file available:", !!audioFile, audioFile?.name);

    setIsSaving(true);
    try {
      if (!audioFile) {
        console.error(
          "⚠️ WARNING: No audio file available for manual save!",
        );
        toast.warning("Saving without audio file", {
          description:
            "The audio file is not available and will not be saved",
        });
      }
      const savedId = await saveTranscript({
        transcript: result.transcript,
        segments: result.segments,
        fileName: audioFileName || "untitled",
        language: language,
        model: model,
        audioBlob: audioFile || undefined,
      });

      toast.success("Transcript saved successfully!", {
        description: audioFile
          ? `Saved "${audioFileName || "untitled"}" with audio`
          : `Saved "${audioFileName || "untitled"}" (without audio)`,
      });

      // Update ID if it was unsaved
      if (id === "unsaved") {
        // Use replace to update URL without pushing to history
        const { replace } = useRouterStore.getState();
        replace("transcript", { id: savedId });
      }

      console.log("Transcript saved with ID:", savedId);
    } catch (error) {
      console.error("Failed to save transcript:", error);
      toast.error("Failed to save transcript", {
        description:
          error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    result,
    audioFileName,
    language,
    model,
    id,
    saveTranscript,
    navigate,
  ]);

  // Handle export to LLM
  const handleExportToLLM = useCallback(() => {
    const event = new CustomEvent("export-to-llm");
    window.dispatchEvent(event);
  }, []);

  // Handle back to home
  const handleBackToHome = useCallback(() => {
    navigate("upload");
  }, [navigate]);

  // Handle view saved
  const handleViewSaved = useCallback(() => {
    navigate("saved");
  }, [navigate]);

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="border-primary h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Animated gradient background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, hsl(var(--primary) / 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, hsl(var(--chart-2) / 0.15) 0%, transparent 50%)",
          }}
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10">
        {/* Sticky audio player and search */}
        <div
          className="bg-background/95 fixed top-16 right-0 z-50 border-b shadow-lg backdrop-blur-sm transition-all duration-200 ease-in-out"
          style={{
            left: isMobile ? 0 : sidebarWidth,
            width: isMobile ? "100%" : `calc(100% - ${sidebarWidth})`,
          }}
        >
          <div className="mx-auto max-w-6xl px-4 py-3">
            <div className="flex flex-col gap-3">
              {audioFile ? (
                <AudioPlayer
                  ref={audioPlayerRef}
                  src={audioFile}
                  onTimeUpdate={(time) => setCurrentTime(time)}
                />
              ) : (
                <div className="bg-muted/50 text-muted-foreground flex items-center justify-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                  <span>Audio file not available for this transcript</span>
                </div>
              )}

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
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setSearchQuery(e.currentTarget.value);
                      }
                      if (e.key === "Escape") {
                        if (searchQuery !== "") {
                          setSearchQuery("");
                        } else {
                          // second time - move out of focus from the input
                          e.currentTarget.blur();
                        }
                      }
                    }}
                  />
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
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

        {/* Main transcript content */}
        <div className="mx-auto max-w-6xl px-2 pt-60 pb-8 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {/* Primary actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleExportToLLM}
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
                {id === "unsaved" && (
                  <Button
                    onClick={handleSave}
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
                )}
                <Button
                  onClick={handleViewSaved}
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
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                    />
                  </svg>
                  View Saved
                </Button>
                <Button
                  onClick={handleBackToHome}
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
              </div>
            </div>

            {/* Transcript card */}
            <Card>
              <WhisperTranscript
                className="p-4"
                currentTime={currentTime}
                setCurrentTime={(time) => {
                  setCurrentTime(time);
                  audioPlayerRef.current?.setTime(time);
                }}
              />
            </Card>

            {generationTime !== null && generationTime > 0 && (
              <p className="text-muted-foreground text-end text-xs">
                Generation time:{" "}
                <span className="font-semibold">
                  {generationTime.toFixed(2)}ms
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Floating Scroll to Top Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: showScrollTop ? 1 : 0,
          scale: showScrollTop ? 1 : 0.8,
          y: showScrollTop ? 0 : 20,
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        onClick={() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        className={`bg-primary text-primary-foreground focus:ring-primary fixed bottom-6 left-6 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all hover:scale-110 hover:shadow-xl focus:ring-2 focus:ring-offset-2 focus:outline-none active:scale-95 sm:right-8 sm:bottom-8 sm:h-14 sm:w-14 ${
          showScrollTop ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-label="Scroll to top"
      >
        <svg
          className="h-6 w-6 sm:h-7 sm:w-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>
      </motion.button>
    </div>
  );
}
