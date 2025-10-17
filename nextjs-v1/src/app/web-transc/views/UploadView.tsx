/**
 * UploadView - Initial state, audio file upload
 * Shows: Upload area, saved transcripts list, model selector
 */

"use client";

import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouterStore } from "../store/useRouterStore";
import { useWhisperStore } from "../store/useWhisperStore";
import { useWhisperWorker } from "../hooks/useWhisperWorker";
import { useTranscripts } from "../hooks/useTranscripts";
import MediaFileUpload from "../components/MediaFileUpload";
import { ModelSelector } from "../components/ModelSelector";
import WhisperLanguageSelector from "../components/WhisperLanguageSelector";
import { ThemeToggle } from "../components/ThemeToggle";
import { EditConversationModal } from "../components/EditConversationModal";
import { EditSpeakersModal } from "../components/EditSpeakersModal";
import { AVAILABLE_MODELS, DEFAULT_MODEL } from "../config/modelConfig";
import type { WhisperMediaInputRef } from "../types";
import type { SavedTranscript } from "@/lib/localStorage/schemas";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function UploadView() {
  const navigate = useRouterStore((state) => state.navigate);

  // Whisper store state
  const status = useWhisperStore((state) => state.model.status);
  const setStatus = useWhisperStore((state) => state.setStatus);
  const audio = useWhisperStore((state) => state.audio.audio);
  const setAudio = useWhisperStore((state) => state.setAudio);
  const setAudioFileName = useWhisperStore((state) => state.setAudioFileName);
  const model = useWhisperStore((state) => state.model.model);
  const setModel = useWhisperStore((state) => state.setModel);
  const device = useWhisperStore((state) => state.model.device);
  const setResult = useWhisperStore((state) => state.setResult);
  const setStreamingWords = useWhisperStore((state) => state.setStreamingWords);
  const setGenerationTime = useWhisperStore((state) => state.setGenerationTime);
  const setSpeakerNames = useWhisperStore((state) => state.setSpeakerNames);
  const setCurrentTranscriptId = useWhisperStore(
    (state) => state.setCurrentTranscriptId
  );
  const setIsLoadingFromStorage = useWhisperStore(
    (state) => state.setIsLoadingFromStorage
  );
  const setLanguage = useWhisperStore((state) => state.setLanguage);
  const loadingMessage = useWhisperStore(
    (state) => state.loading.loadingMessage
  );
  const setLoadingMessage = useWhisperStore(
    (state) => state.setLoadingMessage
  );

  // Storage state
  const savedTranscripts = useWhisperStore(
    (state) => state.storage.savedTranscripts
  );
  const transcriptsLoading = useWhisperStore(
    (state) => state.storage.transcriptsLoading
  );

  // Storage hooks
  const { getWithAudio, remove: removeTranscript, updateMetadata } = useTranscripts();

  // Local state
  const mediaInputRef = useRef<WhisperMediaInputRef>(null);
  const [editConversationModal, setEditConversationModal] = useState<{
    open: boolean;
    transcript: SavedTranscript | null;
  }>({ open: false, transcript: null });
  const [editSpeakersModal, setEditSpeakersModal] = useState<{
    open: boolean;
    transcript: SavedTranscript | null;
  }>({ open: false, transcript: null });

  // Worker integration
  const { postMessage } = useWhisperWorker(
    useCallback((e: MessageEvent) => {
      // Worker messages are handled globally, but we can add view-specific handling here if needed
      console.log("📨 UploadView received worker message:", e.data.status);
    }, [])
  );

  // Handle load model / run transcription
  const handleClick = useCallback(() => {
    if (status === null) {
      // Load model
      console.log("🚀 Loading models with device:", device, "model:", model);
      setStatus("loading");
      setLoadingMessage("Initializing...");
      postMessage({
        type: "load",
        data: { device, model },
      });
    } else if (status === "ready" && audio) {
      // Navigate to transcribe view
      console.log("🎤 Navigating to transcribe view...");
      navigate("transcribe");
    }
  }, [status, audio, device, model, postMessage, setStatus, setLoadingMessage, navigate]);

  // Handle model change
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
        alert(
          "Model changed. Please click 'Load model' to load the new model before transcribing."
        );
      }
    },
    [status, setModel, setStatus, setResult, setStreamingWords, setGenerationTime]
  );

  // Handle reset
  const handleReset = useCallback(() => {
    // Reset media component
    mediaInputRef.current?.reset();
    // Reset audio state
    setAudio(null);
  }, [setAudio]);

  // Handle load transcript from saved list
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
            confidence: 1.0,
          })
        );

        // Load the transcript data into the result state
        setResult({
          transcript: data.transcript,
          segments: segmentsWithMissingProps,
        });

        // Set generation time
        setGenerationTime(0);

        // Load speaker names if available
        setSpeakerNames(data.metadata.speakerNames || null);

        // Set current transcript ID
        setCurrentTranscriptId(transcriptId);

        setAudioFileName(data.metadata.fileName);
        setLanguage(data.metadata.language);

        // Validate model ID
        const loadedModel = data.metadata.model;
        const validModel = AVAILABLE_MODELS[loadedModel]
          ? loadedModel
          : DEFAULT_MODEL;

        if (loadedModel !== validModel) {
          console.warn(
            `Model "${loadedModel}" not found. Using default: "${validModel}"`
          );
          toast.info("Model updated", {
            description: `The saved model is no longer available. Using ${AVAILABLE_MODELS[validModel].name} instead.`,
          });
        }

        setModel(validModel);

        // Load audio blob if available
        if (audioBlob && mediaInputRef.current) {
          setIsLoadingFromStorage(true);
          mediaInputRef.current.loadFromBlob(
            audioBlob,
            data.metadata.fileName
          );
        } else if (!audioBlob) {
          console.warn("No audio blob found for transcript:", transcriptId);
          toast.info("Transcript loaded without audio", {
            description: "Audio file was not saved with this transcript",
          });
        }

        toast.success("Transcript loaded!", {
          description: `Loaded "${data.metadata.fileName}"`,
        });

        // Navigate to transcript view
        navigate("transcript", { id: transcriptId });

        console.log("✅ Transcript loaded:", transcriptId);
      } catch (error) {
        console.error("Failed to load transcript:", error);
        toast.error("Failed to load transcript", {
          description:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    },
    [
      getWithAudio,
      setResult,
      setGenerationTime,
      setSpeakerNames,
      setCurrentTranscriptId,
      setAudioFileName,
      setLanguage,
      setModel,
      setIsLoadingFromStorage,
      navigate,
    ]
  );

  // Modal handlers
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
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [editConversationModal.transcript, updateMetadata]
  );

  const handleSaveSpeakerNames = useCallback(
    async (speakerNames: Record<string, string>) => {
      if (!editSpeakersModal.transcript) return;

      try {
        await updateMetadata(editSpeakersModal.transcript.id, {
          speakerNames,
        });
        toast.success("Speaker names updated!");
      } catch (error) {
        toast.error("Failed to update speaker names", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [editSpeakersModal.transcript, updateMetadata]
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

      {/* Loading overlay */}
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

          {/* Audio player */}
          <div className="relative">
            <MediaFileUpload
              ref={mediaInputRef}
              onInputChange={(audio) => {
                const currentFlag =
                  useWhisperStore.getState().ui.isLoadingFromStorage;

                if (!currentFlag) {
                  setResult(null);
                }
                setAudio(audio);
                setIsLoadingFromStorage(false);
              }}
              onTimeUpdate={() => {}} // Not needed in upload view
              onFileNameChange={(fileName) => setAudioFileName(fileName)}
            />
          </div>

          <Card className="border-muted/50 bg-card/50 px-2 backdrop-blur-sm">
            <CardContent className="px-0 pt-6 sm:px-2 md:px-4 lg:px-8">
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

                    {/* Model selector */}
                    <ModelSelector
                      disabled={status === "running" || status === "loading"}
                      onModelChange={handleModelChange}
                    />
                  </div>

                  {/* Language selector - show when model is loaded but not running */}
                  {status === "ready" && (
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

                {/* Saved Transcripts Section */}
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
                            onDoubleClick={() =>
                              handleLoadTranscript(transcript.id)
                            }
                            className="group border-muted/50 bg-card/50 hover:border-primary/50 hover:bg-card/80 cursor-pointer rounded-md border p-3 transition-all hover:shadow-md"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h4 className="text-foreground truncate text-sm font-medium">
                                  {transcript.fileName}
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
                                    {formatTime(transcript.duration)}
                                  </span>
                                  <span>
                                    {new Date(
                                      transcript.updatedAt
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                {/* Delete button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (
                                      confirm(
                                        `Delete "${transcript.fileName}"?`
                                      )
                                    ) {
                                      removeTranscript(transcript.id).catch(
                                        (err) => {
                                          toast.error(
                                            "Failed to delete transcript",
                                            {
                                              description: err.message,
                                            }
                                          );
                                        }
                                      );
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
                              Double-click to load
                            </p>
                          </motion.div>
                        ))
                      )}
                    </div>
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
