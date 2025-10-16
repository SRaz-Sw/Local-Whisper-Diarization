"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { toast } from "sonner";
import WhisperProgress from "./WhisperProgress";
import MediaFileUpload from "./MediaFileUpload";
import WhisperTranscript from "./WhisperTranscript";
import WhisperLanguageSelector from "./WhisperLanguageSelector";
import { StreamingTranscript } from "./StreamingTranscript";
import { IntroSection } from "./IntroSection";
import { ThemeToggle } from "./ThemeToggle";
import { ModelSelector } from "./ModelSelector";
import {
  DEFAULT_MODEL,
  getModelSize,
  AVAILABLE_MODELS,
} from "../config/modelConfig";
import { remapSpeakerLabels } from "../utils/transcriptFormatter";
import { useTranscripts } from "../hooks/useTranscripts";
import { exposeStorageUtilsToWindow } from "@/lib/localStorage/utils";
import { useWhisperStore } from "../store/useWhisperStore";
import type {
  TranscriptionStatus,
  ProgressItem,
  TranscriptionResult,
  DeviceType,
  WhisperMediaInputRef,
} from "../types";

async function hasWebGPU(): Promise<boolean> {
  if (!navigator.gpu) {
    return false;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch (e) {
    return false;
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function WhisperDiarization() {
  // Create a reference to the worker object.
  const worker = useRef<Worker | null>(null);

  // Storage hook for saving and loading transcripts
  const {
    save: saveTranscript,
    transcripts: savedTranscripts,
    loading: transcriptsLoading,
    remove: removeTranscript,
    getWithAudio,
  } = useTranscripts();

  // Storage State from Zustand
  const setSavedTranscripts = useWhisperStore(
    (state) => state.setSavedTranscripts,
  );
  const setTranscriptsLoading = useWhisperStore(
    (state) => state.setTranscriptsLoading,
  );

  // Sync useTranscripts hook state to Zustand for global access
  useEffect(() => {
    setSavedTranscripts(
      savedTranscripts.map((t) => ({
        id: t.id,
        fileName: t.metadata.fileName,
        duration: t.metadata.duration,
        updatedAt: t.metadata.updatedAt,
      })),
    );
    setTranscriptsLoading(transcriptsLoading);
  }, [
    savedTranscripts,
    transcriptsLoading,
    setSavedTranscripts,
    setTranscriptsLoading,
  ]);

  // Model State from Zustand
  const status = useWhisperStore((state) => state.model.status);
  const setStatus = useWhisperStore((state) => state.setStatus);
  const device = useWhisperStore((state) => state.model.device);
  const setDevice = useWhisperStore((state) => state.setDevice);
  const model = useWhisperStore((state) => state.model.model);
  const setModel = useWhisperStore((state) => state.setModel);
  const modelSize = useWhisperStore((state) => state.model.modelSize);
  const setModelSize = useWhisperStore((state) => state.setModelSize);

  // Loading State from Zustand
  const loadingMessage = useWhisperStore(
    (state) => state.loading.loadingMessage,
  );
  const setLoadingMessage = useWhisperStore(
    (state) => state.setLoadingMessage,
  );
  const progressItems = useWhisperStore(
    (state) => state.loading.progressItems,
  );
  const setProgressItems = useWhisperStore(
    (state) => state.setProgressItems,
  );
  const addProgressItem = useWhisperStore(
    (state) => state.addProgressItem,
  );
  const updateProgressItem = useWhisperStore(
    (state) => state.updateProgressItem,
  );
  const removeProgressItem = useWhisperStore(
    (state) => state.removeProgressItem,
  );

  const mediaInputRef = useRef<WhisperMediaInputRef>(null);

  // Audio State from Zustand
  const audio = useWhisperStore((state) => state.audio.audio);
  const setAudio = useWhisperStore((state) => state.setAudio);
  const language = useWhisperStore((state) => state.audio.language);
  const setLanguage = useWhisperStore((state) => state.setLanguage);
  const audioFileName = useWhisperStore(
    (state) => state.audio.audioFileName,
  );
  const setAudioFileName = useWhisperStore(
    (state) => state.setAudioFileName,
  );

  // Transcription State from Zustand
  const result = useWhisperStore((state) => state.transcription.result);
  const setResult = useWhisperStore((state) => state.setResult);
  const streamingWords = useWhisperStore(
    (state) => state.transcription.streamingWords,
  );
  const setStreamingWords = useWhisperStore(
    (state) => state.setStreamingWords,
  );
  const addStreamingWord = useWhisperStore(
    (state) => state.addStreamingWord,
  );
  const generationTime = useWhisperStore(
    (state) => state.transcription.generationTime,
  );
  const setGenerationTime = useWhisperStore(
    (state) => state.setGenerationTime,
  );

  const [currentTime, setCurrentTime] = useState(0);

  // Processing State from Zustand
  const processingMessage = useWhisperStore(
    (state) => state.processing.processingMessage,
  );
  const setProcessingMessage = useWhisperStore(
    (state) => state.setProcessingMessage,
  );
  const processedSeconds = useWhisperStore(
    (state) => state.processing.processedSeconds,
  );
  const setProcessedSeconds = useWhisperStore(
    (state) => state.setProcessedSeconds,
  );
  const totalSeconds = useWhisperStore(
    (state) => state.processing.totalSeconds,
  );
  const setTotalSeconds = useWhisperStore(
    (state) => state.setTotalSeconds,
  );
  const estimatedTimeRemaining = useWhisperStore(
    (state) => state.processing.estimatedTimeRemaining,
  );
  const setEstimatedTimeRemaining = useWhisperStore(
    (state) => state.setEstimatedTimeRemaining,
  );

  // UI State from Zustand (replacing useState and ref)
  const isSaving = useWhisperStore((state) => state.ui.isSaving);
  const setIsSaving = useWhisperStore((state) => state.setIsSaving);
  const isLoadingFromStorage = useWhisperStore(
    (state) => state.ui.isLoadingFromStorage,
  );
  const setIsLoadingFromStorage = useWhisperStore(
    (state) => state.setIsLoadingFromStorage,
  );

  // Store event handlers in refs so they can be reused when recreating worker
  const onMessageReceivedRef = useRef<((e: MessageEvent) => void) | null>(
    null,
  );
  const onErrorRef = useRef<((error: ErrorEvent) => void) | null>(null);

  useEffect(() => {
    hasWebGPU().then((b) => {
      const detectedDevice = b ? "webgpu" : "wasm";
      setDevice(detectedDevice);
      setModelSize(getModelSize(model, detectedDevice));
    });

    // Expose storage utilities to browser console for debugging
    if (process.env.NODE_ENV === "development") {
      exposeStorageUtilsToWindow();
    }
  }, []);

  // Update model size when model changes
  useEffect(() => {
    setModelSize(getModelSize(model, device));
  }, [model, device]);

  // Helper function to create and initialize worker with event listeners
  const initializeWorker = useCallback(() => {
    try {
      const isDev = process.env.NODE_ENV === "development";

      if (isDev) {
        worker.current = new Worker(
          new URL(
            "../workers/whisperDiarization.worker.js",
            import.meta.url,
          ),
          { type: "module" },
        );
      } else {
        worker.current = new Worker(
          "/workers/whisperDiarization.worker.js",
        );
      }

      console.log("✅ Worker created successfully");

      // Attach event listeners if handlers exist
      if (onMessageReceivedRef.current && worker.current) {
        worker.current.addEventListener(
          "message",
          onMessageReceivedRef.current,
        );
      }
      if (onErrorRef.current && worker.current) {
        worker.current.addEventListener("error", onErrorRef.current);
      }

      return true;
    } catch (error) {
      console.error("❌ Failed to create worker:", error);
      const errorMessage =
        typeof error === "object" && error !== null && "message" in error
          ? (error as { message: string }).message
          : "Unknown error";
      alert(
        `Failed to initialize worker: ${errorMessage}. Check console for details.`,
      );
      return false;
    }
  }, []);

  // We use the `useEffect` hook to setup the worker as soon as the `WhisperDiarization` component is mounted.
  useEffect(() => {
    // Create a callback function for messages from the worker thread.
    const onMessageReceived = (e: MessageEvent) => {
      console.log("📨 Worker message received:", e.data);

      switch (e.data.status) {
        case "loading":
          // Model file start load: add a new progress item to the list.
          setStatus("loading");
          setLoadingMessage(e.data.data || "Loading models...");
          console.log("🔄 Loading started:", e.data.data);
          break;

        case "initiate":
          console.log("🆕 Initiating download:", e.data.file);
          addProgressItem(e.data);
          break;

        case "progress":
          // Model file progress: update one of the progress items.
          updateProgressItem(e.data.file, e.data);
          break;

        case "done":
          // Model file loaded: remove the progress item from the list.
          console.log("✅ Download complete:", e.data.file);
          removeProgressItem(e.data.file);
          break;

        case "loaded":
          // Pipeline ready: the worker is ready to accept messages.
          console.log("✅ Models loaded and ready");
          setStatus("ready");
          setProgressItems([]);
          break;

        case "update":
          // Processing status update
          console.log("🔄 Update:", e.data.data);
          setProcessingMessage(e.data.data);
          break;

        case "transcribing":
          // Streaming transcription words from WhisperTextStreamer
          console.log("📝 Transcribing text received:", e.data.data);
          console.log("📝 Current status:", status);
          // Accumulate words with timestamps
          if (e.data.data?.text) {
            addStreamingWord({
              text: e.data.data.text,
              timestamp: e.data.data.timestamp,
            });
          }
          break;

        case "chunk_start":
          console.log("🎬 Chunk started:", e.data.data);
          break;

        case "chunk_end":
          console.log("🎬 Chunk ended:", e.data.data);
          break;

        case "processing_progress":
          console.log("📊 Processing progress:", e.data);
          setProcessedSeconds(e.data.processedSeconds || 0);
          setTotalSeconds(e.data.totalSeconds || 0);
          setEstimatedTimeRemaining(e.data.estimatedTimeRemaining || null);
          break;

        case "complete":
          console.log("✅ Transcription complete");
          // Remap speaker labels to start from SPEAKER_1
          const remappedResult = {
            ...e.data.result,
            segments: remapSpeakerLabels(e.data.result.segments),
          };
          setResult(remappedResult);
          setStreamingWords([]); // Clear streaming words
          setGenerationTime(e.data.time);
          setStatus("ready");
          setProcessingMessage("");
          setProcessedSeconds(0);
          setTotalSeconds(0);
          setEstimatedTimeRemaining(null);
          break;

        case "backup_check":
          console.log("💾 Backup check result:", e.data.hasBackup);
          if (e.data.hasBackup && e.data.backup) {
            const backup = e.data.backup;
            const backupDate = new Date(backup.timestamp).toLocaleString();
            const shouldResume = confirm(
              `Found a backup from ${backupDate}.\n` +
                `Progress: ${Math.round((backup.processedSeconds / backup.totalSeconds) * 100)}% ` +
                `(${formatTime(backup.processedSeconds)} / ${formatTime(backup.totalSeconds)})\n\n` +
                `Would you like to resume from this backup?`,
            );
            if (shouldResume) {
              // Resume from backup - restore state
              setAudio(backup.audio);
              setLanguage(backup.language);
              alert(
                "Backup loaded. Click 'Run model' to continue transcription.\n" +
                  "Note: The model will restart from the beginning, but this is the full audio file.",
              );
            } else {
              // Clear backup
              worker.current?.postMessage({ type: "clear_backup" });
            }
          }
          break;

        case "backup_cleared":
          console.log("🗑️ Backup cleared");
          break;

        case "error":
          console.error("❌ Worker error:", e.data.error);
          alert(`Error: ${e.data.error}`);
          setStatus(null);
          setProgressItems([]);
          setProcessingMessage("");
          setProcessedSeconds(0);
          setTotalSeconds(0);
          setEstimatedTimeRemaining(null);
          break;

        default:
          console.log("⚠️ Unknown status:", e.data.status, e.data);
      }
    };

    // Worker error handler
    const onError = (error: ErrorEvent) => {
      console.error("❌ Worker error:", error);
      alert(`Worker error: ${error.message}`);
      setStatus(null);
    };

    // Store handlers in refs so they can be reused
    onMessageReceivedRef.current = onMessageReceived;
    onErrorRef.current = onError;

    // Create worker if it doesn't exist
    if (!worker.current) {
      initializeWorker();
    } else {
      // If worker exists, attach listeners
      worker.current.addEventListener("message", onMessageReceived);
      worker.current.addEventListener("error", onError);
    }

    // Define a cleanup function for when the component is unmounted.
    return () => {
      worker.current?.removeEventListener("message", onMessageReceived);
      worker.current?.removeEventListener("error", onError);
    };
  }, [initializeWorker]);

  const handleClick = useCallback(() => {
    setResult(null);
    setStreamingWords([]);
    setGenerationTime(null);
    setProcessingMessage("");
    setProcessedSeconds(0);
    setTotalSeconds(0);
    setEstimatedTimeRemaining(null);
    if (status === null) {
      console.log(
        "🚀 Loading models with device:",
        device,
        "model:",
        model,
      );
      setStatus("loading");
      setLoadingMessage("Initializing...");
      worker.current?.postMessage({
        type: "load",
        data: { device, model },
      });
    } else {
      console.log("🎤 Running transcription...");
      setStatus("running");
      setProcessingMessage("Starting transcription...");
      worker.current?.postMessage({
        type: "run",
        data: { audio, language },
      });
    }
  }, [status, audio, language, device, model]);

  // Check for backup on mount (after model is loaded)
  useEffect(() => {
    if (status === "ready" && !audio) {
      worker.current?.postMessage({ type: "check_backup" });
    }
  }, [status, audio]);

  const handleModelChange = useCallback(
    (newModel: string) => {
      console.log("🔄 Model changed to:", newModel);
      setModel(newModel);

      // If model is already loaded, we need to reload
      if (status !== null) {
        setStatus(null);
        setResult(null);
        setStreamingWords([]);
        setGenerationTime(null);
        setProcessingMessage("");
        alert(
          "Model changed. Please click 'Load model' to load the new model before transcribing.",
        );
      }
    },
    [status],
  );

  const handleReset = useCallback(() => {
    // If running, terminate the worker and recreate it
    if (status === "running") {
      worker.current?.terminate();

      // Recreate worker with event listeners
      const success = initializeWorker();

      if (success) {
        console.log("✅ Worker recreated after reset");
      }

      // Reset status to null so user needs to reload model
      setStatus(null);
    }

    // Reset media component
    mediaInputRef.current?.reset();
    // Reset all states
    setAudio(null);
    setResult(null);
    setStreamingWords([]);
    setGenerationTime(null);
    setProcessingMessage("");
    setCurrentTime(0);
    setProcessedSeconds(0);
    setTotalSeconds(0);
    setEstimatedTimeRemaining(null);
  }, [status, initializeWorker]);

  const handleLoadTranscript = useCallback(
    async (transcriptId: string) => {
      try {
        // Get transcript with audio blob
        const result = await getWithAudio(transcriptId);
        if (!result) {
          toast.error("Transcript not found");
          return;
        }

        const { transcript: data, audioBlob } = result;

        // Map segments to include missing properties (id and confidence)
        const segmentsWithMissingProps = data.segments.map(
          (segment, index) => ({
            ...segment,
            id: index,
            confidence: 1.0, // Default confidence since it's not stored
          }),
        );

        // Load the transcript data into the result state
        setResult({
          transcript: data.transcript,
          segments: segmentsWithMissingProps,
        });

        // Set a time value to show the result properly (use 0 as placeholder)
        setGenerationTime(0);

        setAudioFileName(data.metadata.fileName);
        setLanguage(data.metadata.language);

        // Validate model ID - fallback to default if not found in AVAILABLE_MODELS
        const loadedModel = data.metadata.model;
        const validModel = AVAILABLE_MODELS[loadedModel]
          ? loadedModel
          : DEFAULT_MODEL;

        if (loadedModel !== validModel) {
          console.warn(
            `Model "${loadedModel}" not found in AVAILABLE_MODELS. Using default: "${validModel}"`,
          );
          toast.info("Model updated", {
            description: `The saved model is no longer available. Using ${AVAILABLE_MODELS[validModel].name} instead.`,
          });
        }

        setModel(validModel);

        // Load audio blob if available
        if (audioBlob && mediaInputRef.current) {
          // Set flag to prevent clearing the result when audio loads
          setIsLoadingFromStorage(true);
          mediaInputRef.current.loadFromBlob(
            audioBlob,
            data.metadata.fileName,
          );
        } else if (!audioBlob) {
          console.warn(
            "No audio blob found for transcript:",
            transcriptId,
          );
          toast.info("Transcript loaded without audio", {
            description: "Audio file was not saved with this transcript",
          });
        }

        toast.success("Transcript loaded!", {
          description: `Loaded "${data.metadata.fileName}"`,
        });

        console.log("✅ Transcript loaded:", transcriptId);
      } catch (error) {
        console.error("Failed to load transcript:", error);
        toast.error("Failed to load transcript", {
          description:
            error instanceof Error
              ? error.message
              : "Unknown error occurred",
        });
      }
    },
    [getWithAudio],
  );

  return (
    <div className="relative min-h-screen">
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
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 80% 20%, hsl(var(--chart-3) / 0.1) 0%, transparent 50%), radial-gradient(circle at 20% 80%, hsl(var(--chart-4) / 0.1) 0%, transparent 50%)",
          }}
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 pt-4 pb-8 sm:px-6 lg:px-8">
        {status === "loading" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          >
            <div className="w-[90%] max-w-[500px] space-y-4">
              <p className="mb-3 text-center text-lg font-semibold text-white">
                {loadingMessage || "Loading models..."}
              </p>
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
                <p className="mt-3 text-sm text-gray-300">
                  Initializing worker and downloading models...
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  This may take a few moments on first load
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="my-auto space-y-8">
          {/* Theme toggle button - fixed position */}
          <div className="fixed top-4 right-4 z-[55] sm:top-6 sm:right-6">
            <ThemeToggle />
          </div>

          {/* Modern header with gradient */}
          {!result && (
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
                Whisper Diarization
              </motion.h1>
              <motion.p
                className="text-muted-foreground max-w-2xl px-4 text-base sm:text-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                In-browser automatic speech recognition with word-level
                timestamps and speaker segmentation
              </motion.p>
            </motion.div>
          )}

          {/* Audio player - always rendered outside Card to avoid backdrop-blur containing block issue */}
          <div
            className={
              result
                ? "bg-background/95 fixed top-0 right-0 left-0 z-50 border-b shadow-lg backdrop-blur-sm"
                : "relative"
            }
          >
            <div className={result ? "mx-auto max-w-6xl px-4 py-3" : ""}>
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
                onFileNameChange={(fileName) => setAudioFileName(fileName)}
              />
            </div>
          </div>

          <Card className="border-muted/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex min-h-[220px] w-full flex-col items-center justify-center space-y-6">
                {!result && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="relative flex w-full flex-col items-center justify-center gap-4"
                  >
                    {/* Main action buttons */}
                    <div className="flex flex-wrap justify-center gap-3">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          onClick={handleClick}
                          disabled={
                            status === "running" ||
                            (status !== null && audio === null) ||
                            audio === undefined
                          }
                          size="lg"
                          className="shadow-lg transition-shadow hover:shadow-xl"
                        >
                          {status === null
                            ? "Load model"
                            : status === "running"
                              ? "Running..."
                              : "Run model"}
                        </Button>
                      </motion.div>

                      {audio && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            onClick={handleReset}
                            size="lg"
                            variant="outline"
                            className="shadow-lg transition-shadow hover:shadow-xl"
                          >
                            Reset
                          </Button>
                        </motion.div>
                      )}

                      {/* Model selector - show always */}
                      <ModelSelector
                        disabled={
                          status === "running" || status === "loading"
                        }
                        onModelChange={handleModelChange}
                      />
                    </div>

                    {/* Language selector - show when model is loaded but not running */}
                    {status === "ready" && !result && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.4 }}
                        className="flex flex-col items-center space-y-1"
                      >
                        <span className="text-muted-foreground text-xs">
                          Language:
                        </span>
                        <WhisperLanguageSelector className="w-[120px]" />
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* Show streaming transcription with new component */}
                <StreamingTranscript />

                {/* Saved Transcripts Section - Show when not running and no result */}
                {!result &&
                  status !== "running" &&
                  savedTranscripts.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                      className="w-full space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-foreground text-sm font-semibold">
                          Saved Transcripts
                        </h3>
                        <span className="text-muted-foreground text-xs">
                          {savedTranscripts.length} saved
                        </span>
                      </div>

                      <div className="border-muted/50 bg-muted/20 max-h-[300px] space-y-2 overflow-y-auto rounded-lg border p-3">
                        {transcriptsLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"></div>
                          </div>
                        ) : (
                          savedTranscripts.map((transcript) => (
                            <motion.div
                              key={transcript.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              whileHover={{ scale: 1.01 }}
                              onDoubleClick={() =>
                                handleLoadTranscript(transcript.id)
                              }
                              className="group border-muted/50 bg-card/50 hover:border-primary/50 hover:bg-card/80 cursor-pointer rounded-md border p-3 transition-all hover:shadow-md"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-foreground truncate text-sm font-medium">
                                    {transcript.metadata.fileName}
                                  </h4>
                                  <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                                    <span className="flex items-center gap-1">
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
                                      {formatTime(
                                        transcript.metadata.duration,
                                      )}
                                    </span>
                                    <span className="flex items-center gap-1">
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
                                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                        />
                                      </svg>
                                      {transcript.metadata.speakerCount}{" "}
                                      speaker
                                      {transcript.metadata.speakerCount !==
                                      1
                                        ? "s"
                                        : ""}
                                    </span>
                                    <span>
                                      {new Date(
                                        transcript.metadata.updatedAt,
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (
                                      confirm(
                                        `Delete "${transcript.metadata.fileName}"?`,
                                      )
                                    ) {
                                      removeTranscript(
                                        transcript.id,
                                      ).catch((err) => {
                                        toast.error(
                                          "Failed to delete transcript",
                                          {
                                            description: err.message,
                                          },
                                        );
                                      });
                                    }
                                  }}
                                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex-shrink-0 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100"
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
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              </div>
                              <p className="text-muted-foreground/70 mt-1 text-xs">
                                Double-click to load
                              </p>
                            </motion.div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}

                {/* Show final result with speaker diarization */}
                {result && generationTime !== null && (
                  <div className="w-full space-y-4 pt-24">
                    {/* Action buttons at top */}
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
                        {/* <Button
                          onClick={() => {
                            const jsonTranscript = JSON.stringify(
                              {
                                ...result.transcript,
                                segments: result.segments,
                              },
                              null,
                              2,
                            ).replace(
                              /( {4}"timestamp": )\[\s+(\S+)\s+(\S+)\s+\]/gm,
                              "$1[$2 $3]",
                            );
                            const blob = new Blob([jsonTranscript], {
                              type: "application/json",
                            });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = "whisper-transcript.json";
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
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
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                          Download JSON
                        </Button> */}
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
                              const audioFile =
                                mediaInputRef.current?.getFile();

                              const id = await saveTranscript({
                                transcript: result.transcript,
                                segments: result.segments,
                                fileName: audioFileName || "untitled",
                                language: language,
                                model: model,
                                audioBlob: audioFile || undefined, // Include audio blob if available
                              });

                              toast.success(
                                "Transcript saved successfully!",
                                {
                                  description: audioFile
                                    ? `Saved "${audioFileName || "untitled"}" with audio`
                                    : `Saved "${audioFileName || "untitled"}" (without audio)`,
                                },
                              );

                              console.log(
                                "Transcript saved with ID:",
                                id,
                                audioFile ? "with audio" : "without audio",
                              );
                            } catch (error) {
                              console.error(
                                "Failed to save transcript:",
                                error,
                              );
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
                        <Button
                          onClick={handleReset}
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
                          mediaInputRef.current?.setMediaTime(time);
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
                )}
              </div>
            </CardContent>
          </Card>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-muted-foreground flex flex-wrap items-center justify-center gap-2 text-center text-xs sm:text-sm"
          >
            <span className="bg-background/50 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 backdrop-blur-sm sm:px-3">
              <svg
                className="h-3 w-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              Models cached locally
            </span>
            <span className="text-muted-foreground/50">•</span>
            <span className="bg-background/50 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 backdrop-blur-sm sm:px-3">
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
                  d="M5 12h14M12 5l7 7-7 7"
                />
              </svg>
              Works offline
            </span>
          </motion.div>
        </div>
        {/* Intro section - show only when no audio is loaded */}
        {!audio && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="- mt-100 mb-8">
              <IntroSection modelSize={modelSize} currentModel={model} />
            </div>{" "}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default WhisperDiarization;
