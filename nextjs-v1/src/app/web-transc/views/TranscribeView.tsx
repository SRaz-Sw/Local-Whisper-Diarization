/**
 * TranscribeView - Model loading and transcription process
 * Shows: Model loading, transcription progress, streaming transcript
 */

"use client";

import { useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouterStore } from "../store/useRouterStore";
import { useWhisperStore } from "../store/useWhisperStore";
import { useWhisperWorker } from "../hooks/useWhisperWorker";
import { useTranscripts } from "../hooks/useTranscripts";
import { StreamingTranscript } from "../components/StreamingTranscript";
import { ThemeToggle } from "../components/ThemeToggle";
import { AudioPlayer } from "../components/AudioPlayer";

export default function TranscribeView() {
  const navigate = useRouterStore((state) => state.navigate);

  // Whisper store state
  const status = useWhisperStore((state) => state.model.status);
  const setStatus = useWhisperStore((state) => state.setStatus);
  const audio = useWhisperStore((state) => state.audio.audio);
  const setAudio = useWhisperStore((state) => state.setAudio);
  const audioFile = useWhisperStore((state) => state.audio.audioFile);

  // Debug: Log audioFile on mount
  useEffect(() => {
    console.log("🎬 TranscribeView mounted - audioFile:", !!audioFile, audioFile?.name, audioFile?.size);
  }, []);
  const language = useWhisperStore((state) => state.audio.language);
  const audioFileName = useWhisperStore(
    (state) => state.audio.audioFileName,
  );
  const setAudioFileName = useWhisperStore(
    (state) => state.setAudioFileName,
  );
  const model = useWhisperStore((state) => state.model.model);
  const result = useWhisperStore((state) => state.transcription.result);
  const setResult = useWhisperStore((state) => state.setResult);
  const processingStatus = useWhisperStore(
    (state) => state.processing.status,
  );
  const processingMessage = useWhisperStore(
    (state) => state.processing.processingMessage,
  );
  const processedSeconds = useWhisperStore(
    (state) => state.processing.processedSeconds,
  );
  const totalSeconds = useWhisperStore(
    (state) => state.processing.totalSeconds,
  );
  const estimatedTimeRemaining = useWhisperStore(
    (state) => state.processing.estimatedTimeRemaining,
  );
  const setIsLoadingFromStorage = useWhisperStore(
    (state) => state.setIsLoadingFromStorage,
  );

  // Storage
  const { save: saveTranscript } = useTranscripts();

  // Refs
  const hasStartedTranscriptionRef = useRef(false);
  const isSavingRef = useRef(false);

  // Worker integration
  const { postMessage, recreate } = useWhisperWorker(
    useCallback(() => {
      // Worker messages are handled globally in Router
      // Views just react to store changes
    }, []),
  );

  // Load model if not already loaded
  useEffect(() => {
    if (status === null) {
      const state = useWhisperStore.getState();
      const device = state.model.device;
      const model = state.model.model;
      console.log("🚀 Loading model on TranscribeView mount:", model);
      // Worker will send 'loading' status message
      postMessage({
        type: "load",
        data: { device, model },
      });
    }
  }, []); // Only run once on mount

  // Auto-start transcription when view mounts (if model is ready)
  useEffect(() => {
    if (
      status === "ready" &&
      audio &&
      !hasStartedTranscriptionRef.current
    ) {
      console.log("🎤 Auto-starting transcription...");
      hasStartedTranscriptionRef.current = true;
      postMessage({
        type: "run",
        data: { audio, language },
      });
    }
  }, [status, audio, language, postMessage]);

  // Auto-save and navigate when transcription completes
  useEffect(() => {
    if (result && !isSavingRef.current) {
      console.log("✅ Transcription complete, auto-saving...");
      console.log("📦 Audio file available:", !!audioFile, audioFile?.name);
      isSavingRef.current = true;

      // Auto-save transcript
      (async () => {
        try {
          if (!audioFile) {
            console.error("⚠️ WARNING: No audio file available for saving!");
            toast.warning("Saving without audio file", {
              description: "The audio file is not available and will not be saved",
            });
          }
          const id = await saveTranscript({
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

          console.log("✅ Transcript auto-saved with ID:", id);

          // Navigate to transcript view
          navigate("transcript", { id });
        } catch (error) {
          console.error("Failed to auto-save transcript:", error);
          toast.error("Failed to save transcript", {
            description:
              error instanceof Error ? error.message : "Unknown error",
          });

          // Still navigate to transcript view (unsaved state)
          navigate("transcript", { id: "unsaved" });
        } finally {
          isSavingRef.current = false;
        }
      })();
    }
  }, [result, saveTranscript, audioFileName, language, model, navigate]);

  // Handle cancel transcription
  const handleCancel = useCallback(() => {
    const confirmCancel = confirm(
      "Cancel transcription in progress? All progress will be lost.",
    );

    if (confirmCancel) {
      console.log("🛑 Cancelling transcription...");

      // Recreate worker to stop transcription
      recreate();

      // Reset states
      setResult(null);
      setStatus(null);

      // Navigate back to upload
      navigate("upload");

      toast.info("Transcription cancelled");
    }
  }, [recreate, setResult, setStatus, navigate]);

  // Format time helper
  const formatTime = (seconds: number): string => {
    if (!seconds || seconds <= 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate progress percentage
  const progressPercentage =
    totalSeconds > 0
      ? Math.min((processedSeconds / totalSeconds) * 100, 100)
      : 0;

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
      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-4rem)] max-w-6xl flex-col px-2 sm:px-6 lg:px-8">
        <div className="my-auto space-y-8">
          {/* Theme toggle button */}
          <div className="fixed top-4 right-4 z-[55] sm:top-6 sm:right-6">
            <ThemeToggle />
          </div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center text-center"
          >
            <motion.h1
              className="from-foreground via-foreground/90 to-foreground/70 mb-4 bg-gradient-to-br bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl lg:text-6xl"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Transcribing Audio
            </motion.h1>
            <motion.p
              className="text-muted-foreground max-w-2xl px-4 text-base sm:text-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {processingStatus === "running"
                ? "Processing your audio with speaker diarization..."
                : "Preparing transcription..."}
            </motion.p>
          </motion.div>

          {/* Audio player */}
          {audioFile && (
            <div className="w-full max-w-3xl">
              <AudioPlayer src={audioFile} />
            </div>
          )}

          <Card className="border-muted/50 bg-card/50 px-2 backdrop-blur-sm">
            <CardContent className="px-0 pt-6 sm:px-2 md:px-4 lg:px-8">
              <div className="flex min-h-[400px] w-full flex-col items-center justify-center space-y-6">
                {/* Progress information */}
                {processingStatus === "running" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-lg space-y-6"
                  >
                    {/* Processing message */}
                    {processingMessage && (
                      <div className="text-center">
                        <p className="text-muted-foreground text-sm">
                          {processingMessage}
                        </p>
                      </div>
                    )}

                    {/* Progress bar */}
                    {totalSeconds > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Progress
                          </span>
                          <span className="text-foreground font-medium">
                            {progressPercentage.toFixed(0)}%
                          </span>
                        </div>
                        <div className="bg-muted h-2 overflow-hidden rounded-full">
                          <motion.div
                            className="bg-primary h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercentage}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <div className="text-muted-foreground flex items-center justify-between text-xs">
                          <span>
                            {formatTime(processedSeconds)} /{" "}
                            {formatTime(totalSeconds)}
                          </span>
                          {estimatedTimeRemaining &&
                            estimatedTimeRemaining > 0 && (
                              <span>
                                Est. {formatTime(estimatedTimeRemaining)}{" "}
                                remaining
                              </span>
                            )}
                        </div>
                      </div>
                    )}

                    {/* Streaming transcript preview */}
                    <div className="w-full">
                      <StreamingTranscript />
                    </div>

                    {/* Cancel button */}
                    <div className="flex justify-center">
                      <Button
                        onClick={handleCancel}
                        variant="destructive"
                        size="sm"
                      >
                        Cancel Transcription
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Waiting state */}
                {processingStatus !== "running" && !result && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                  >
                    <div className="border-primary mx-auto h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"></div>
                    <p className="text-muted-foreground mt-4">
                      Starting transcription...
                    </p>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-muted-foreground flex flex-wrap items-center justify-center gap-2 pb-4 text-center text-xs sm:text-sm"
          >
            <span className="bg-background/50 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 backdrop-blur-sm sm:px-3">
              Processing locally in your browser
            </span>
            <span className="text-muted-foreground/50">•</span>
            <span className="bg-background/50 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 backdrop-blur-sm sm:px-3">
              Your audio never leaves your device
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
