"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import TranscriptViewer from "../../components/TranscriptViewer";
import { ThemeToggle } from "../../components/ThemeToggle";
import { EditConversationModal } from "../../components/EditConversationModal";
import { EditSpeakersModal } from "../../components/EditSpeakersModal";
import { useTranscripts } from "../../hooks/useTranscripts";
import { useWhisperStore } from "../../store/useWhisperStore";
import { AVAILABLE_MODELS, DEFAULT_MODEL } from "../../config/modelConfig";
import type { SavedTranscript } from "@/lib/localStorage/schemas";

export default function TranscriptPage() {
  const params = useParams();
  const router = useRouter();
  const transcriptId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [transcript, setTranscript] = useState<SavedTranscript | null>(null);

  // Edit modals state
  const [editConversationModal, setEditConversationModal] = useState<{
    open: boolean;
    transcript: SavedTranscript | null;
  }>({ open: false, transcript: null });
  const [editSpeakersModal, setEditSpeakersModal] = useState<{
    open: boolean;
    transcript: SavedTranscript | null;
  }>({ open: false, transcript: null });

  const { getWithAudio, updateMetadata } = useTranscripts();

  // Zustand setters - copy exact pattern from handleLoadTranscript
  const setResult = useWhisperStore((state) => state.setResult);
  const setGenerationTime = useWhisperStore(
    (state) => state.setGenerationTime,
  );
  const setSpeakerNames = useWhisperStore(
    (state) => state.setSpeakerNames,
  );
  const setCurrentTranscriptId = useWhisperStore(
    (state) => state.setCurrentTranscriptId,
  );
  const setAudioFileName = useWhisperStore(
    (state) => state.setAudioFileName,
  );
  const setLanguage = useWhisperStore((state) => state.setLanguage);
  const setModel = useWhisperStore((state) => state.setModel);
  const setIsLoadingFromStorage = useWhisperStore(
    (state) => state.setIsLoadingFromStorage,
  );

  // Load transcript on mount - exact copy of handleLoadTranscript logic
  useEffect(() => {
    const loadTranscript = async () => {
      try {
        setLoading(true);

        // Get transcript with audio blob
        const result = await getWithAudio(transcriptId);
        if (!result) {
          toast.error("Transcript not found");
          router.push("/web-transc");
          return;
        }

        const { transcript: data, audioBlob } = result;
        setTranscript(data);

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

        // Load speaker names if available
        setSpeakerNames(data.metadata.speakerNames || null);

        // Set current transcript ID for edit functionality
        setCurrentTranscriptId(transcriptId);

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
        if (audioBlob) {
          // Set flag to prevent clearing the result when audio loads
          setIsLoadingFromStorage(true);

          // Get the mediaInputRef from TranscriptViewer
          // We'll trigger this via a custom event to avoid ref drilling
          window.dispatchEvent(
            new CustomEvent("load-audio-blob", {
              detail: { blob: audioBlob, fileName: data.metadata.fileName },
            }),
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

        console.log("✅ Transcript loaded:", transcriptId);
      } catch (error) {
        console.error("Failed to load transcript:", error);
        toast.error("Failed to load transcript", {
          description:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
        router.push("/web-transc");
      } finally {
        setLoading(false);
      }
    };

    loadTranscript();
  }, [transcriptId, getWithAudio, router]);

  // Handlers for editing modals - copy from WhisperDiarization
  const handleSaveConversationName = async (conversationName: string) => {
    if (!transcript) return;

    try {
      await updateMetadata(transcript.id, { conversationName });
      toast.success("Conversation name updated!");

      // Update local state
      setTranscript({
        ...transcript,
        metadata: { ...transcript.metadata, conversationName },
      });
    } catch (error) {
      toast.error("Failed to update conversation name", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleSaveSpeakerNames = async (
    speakerNames: Record<string, string>,
  ) => {
    if (!transcript) return;

    try {
      await updateMetadata(transcript.id, { speakerNames });

      // Update Zustand store
      setSpeakerNames(speakerNames);

      // Update local state
      setTranscript({
        ...transcript,
        metadata: { ...transcript.metadata, speakerNames },
      });

      toast.success("Speaker names updated!");
    } catch (error) {
      toast.error("Failed to update speaker names", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"></div>
          <p className="text-muted-foreground mt-4">Loading transcript...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Animated gradient background - copy from WhisperDiarization */}
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
        {/* Theme toggle button - fixed position */}
        <div className="fixed top-4 right-4 z-[55] sm:top-6 sm:right-6">
          <ThemeToggle />
        </div>

        {/* Edit buttons - floating action buttons */}
        {transcript && (
          <div className="fixed top-20 right-4 z-[55] flex flex-col gap-2 sm:top-24 sm:right-6">
            <button
              onClick={() => {
                setEditConversationModal({
                  open: true,
                  transcript,
                });
              }}
              className="bg-card hover:bg-primary/10 text-muted-foreground hover:text-primary flex h-10 w-10 items-center justify-center rounded-full border shadow-lg transition-colors"
              title="Edit conversation name"
            >
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              onClick={() => {
                setEditSpeakersModal({
                  open: true,
                  transcript,
                });
              }}
              className="bg-card hover:bg-primary/10 text-muted-foreground hover:text-primary flex h-10 w-10 items-center justify-center rounded-full border shadow-lg transition-colors"
              title="Edit speaker names"
            >
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </button>
          </div>
        )}

        <div className="my-auto">
          <TranscriptViewer onReset={() => router.push("/web-transc")} />
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
