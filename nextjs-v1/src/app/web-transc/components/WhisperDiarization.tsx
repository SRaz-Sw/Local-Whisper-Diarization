"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { toast } from "sonner";
import WhisperProgress from "./WhisperProgress";
import MediaFileUpload from "./MediaFileUpload";
import TranscriptViewer from "./TranscriptViewer";
import WhisperLanguageSelector from "./WhisperLanguageSelector";
import { StreamingTranscript } from "./StreamingTranscript";
import { ThemeToggle } from "./ThemeToggle";
import { ModelSelector } from "./ModelSelector";
import { EditConversationModal } from "./EditConversationModal";
import { EditSpeakersModal } from "./EditSpeakersModal";
import { getModelSize } from "../config/modelConfig";
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
import type { SavedTranscript } from "@/lib/localStorage/schemas";

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
  const router = useRouter();

  // Create a reference to the worker object.
  const worker = useRef<Worker | null>(null);

  // Storage hook for saving and loading transcripts
  const {
    save: saveTranscript,
    transcripts: savedTranscripts,
    loading: transcriptsLoading,
    remove: removeTranscript,
    updateMetadata,
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
  const audioFileName = useWhisperStore((state) => state.audio.audioFileName);
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
  const setGenerationTime = useWhisperStore(
    (state) => state.setGenerationTime,
  );
  const setSpeakerNames = useWhisperStore(
    (state) => state.setSpeakerNames,
  );
  const setCurrentTranscriptId = useWhisperStore(
    (state) => state.setCurrentTranscriptId,
  );

  const setCurrentTime = useWhisperStore((state) => state.setCurrentTime);

  // Modal state for editing
  const [editConversationModal, setEditConversationModal] = useState<{
    open: boolean;
    transcript: SavedTranscript | null;
  }>({ open: false, transcript: null });
  const [editSpeakersModal, setEditSpeakersModal] = useState<{
    open: boolean;
    transcript: SavedTranscript | null;
  }>({ open: false, transcript: null });

  // Scroll to top button visibility
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      // Show button when user scrolls down more than 300px
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

          // Auto-save and redirect to transcript page
          (async () => {
            try {
              console.log("💾 Auto-saving transcript...");
              // Get the audio file from the media component
              const audioFile = mediaInputRef.current?.getFile();

              const transcriptId = await saveTranscript({
                transcript: remappedResult.transcript,
                segments: remappedResult.segments,
                fileName: audioFileName || "untitled",
                language: language,
                model: model,
                audioBlob: audioFile || undefined,
              });

              console.log(
                "✅ Transcript auto-saved with ID:",
                transcriptId,
              );

              toast.success("Transcript saved!", {
                description: `Redirecting to transcript view...`,
              });

              // Small delay before redirect for better UX
              setTimeout(() => {
                router.push(`/web-transc/transcript/${transcriptId}`);
              }, 1000);
            } catch (error) {
              console.error("Failed to auto-save transcript:", error);
              toast.error("Failed to save transcript", {
                description:
                  error instanceof Error
                    ? error.message
                    : "Unknown error occurred",
              });
            }
          })();
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
    setSpeakerNames(null);
    setCurrentTranscriptId(null);
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
    setSpeakerNames(null);
    setCurrentTranscriptId(null);
    setProcessingMessage("");
    setCurrentTime(0);
    setProcessedSeconds(0);
    setTotalSeconds(0);
    setEstimatedTimeRemaining(null);
  }, [status, initializeWorker]);

  // Handlers for editing modals
  const handleSaveConversationName = useCallback(
    async (conversationName: string) => {
      if (!editConversationModal.transcript) return;

      try {
        await updateMetadata(editConversationModal.transcript.id, {
          conversationName,
        });
        toast.success("Conversation name updated!");
      } catch (error) {
        toast.error("Failed to update conversation name", {
          description:
            error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [editConversationModal.transcript, updateMetadata],
  );

  const handleSaveSpeakerNames = useCallback(
    async (speakerNames: Record<string, string>) => {
      if (!editSpeakersModal.transcript) return;

      try {
        await updateMetadata(editSpeakersModal.transcript.id, {
          speakerNames,
        });

        // Update Zustand store if this is the currently displayed transcript
        if (result) {
          setSpeakerNames(speakerNames);
        }

        toast.success("Speaker names updated!");
      } catch (error) {
        toast.error("Failed to update speaker names", {
          description:
            error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [
      editSpeakersModal.transcript,
      updateMetadata,
      result,
      setSpeakerNames,
    ],
  );

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
      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-4rem)] max-w-6xl flex-col px-2 sm:px-6 lg:px-8">
        {status === "loading" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          >
            <div className="w-[95%] max-w-[500px] space-y-4">
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

          {/* Audio player - only show when no result */}

          <div className="relative">
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

          <Card className="border-muted/50 bg-card/50 px-2 backdrop-blur-sm">
            <CardContent className="md: px-0 pt-6 sm:px-2 md:px-4 lg:px-8">
              <div className="flex min-h-[220px] w-full flex-col items-center justify-center space-y-6">
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

                {/* Show streaming transcription with new component */}
                <StreamingTranscript />

                {/* Saved Transcripts Section - Show when not running and no result */}
                {status !== "running" && savedTranscripts.length > 0 && (
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
                            onClick={() =>
                              router.push(
                                `/web-transc/transcript/${transcript.id}`,
                              )
                            }
                            className="group border-muted/50 bg-card/50 hover:border-primary/50 hover:bg-card/80 cursor-pointer rounded-md border p-3 transition-all hover:shadow-md"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h4 className="text-foreground truncate text-sm font-medium">
                                  {transcript.metadata.conversationName ||
                                    transcript.metadata.fileName}
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
                                    {transcript.metadata.speakerCount !== 1
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
                              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                {/* Edit conversation name button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditConversationModal({
                                      open: true,
                                      transcript,
                                    });
                                  }}
                                  className="text-muted-foreground hover:bg-primary/10 hover:text-primary flex-shrink-0 rounded p-1 transition-colors"
                                  title="Edit conversation name"
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
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                  </svg>
                                </button>
                                {/* Edit speakers button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditSpeakersModal({
                                      open: true,
                                      transcript,
                                    });
                                  }}
                                  className="text-muted-foreground hover:bg-primary/10 hover:text-primary flex-shrink-0 rounded p-1 transition-colors"
                                  title="Edit speaker names"
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
                                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                    />
                                  </svg>
                                </button>
                                {/* Delete button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (
                                      confirm(
                                        `Delete "${transcript.metadata.conversationName || transcript.metadata.fileName}"?`,
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
                                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex-shrink-0 rounded p-1 transition-colors"
                                  title="Delete transcript"
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
                            </div>
                            <p className="text-muted-foreground/70 mt-1 text-xs">
                              Click to view
                            </p>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Show final result with TranscriptViewer */}
                {/* <TranscriptViewer onReset={handleReset} /> */}
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

      {/* Edit Modals */}
      <EditConversationModal
        open={editConversationModal.open}
        onOpenChange={(open) =>
          setEditConversationModal({ open, transcript: null })
        }
        transcript={editConversationModal.transcript}
        onSave={handleSaveConversationName}
      />
      <EditSpeakersModal
        open={editSpeakersModal.open}
        onOpenChange={(open) =>
          setEditSpeakersModal({ open, transcript: null })
        }
        transcript={editSpeakersModal.transcript}
        onSave={handleSaveSpeakerNames}
      />
    </div>
  );
}

export default WhisperDiarization;
