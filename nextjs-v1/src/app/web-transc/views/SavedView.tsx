/**
 * SavedView - Browse and manage saved transcripts
 * Shows: List of saved transcripts, search/filter, actions
 */

"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouterStore } from "../store/useRouterStore";
import { useWhisperStore } from "../store/useWhisperStore";
import { useTranscripts } from "../hooks/useTranscripts";
import { ThemeToggle } from "../components/ThemeToggle";
import { EditConversationModal } from "../components/EditConversationModal";
import { EditSpeakersModal } from "../components/EditSpeakersModal";
import type { SavedTranscript } from "@/lib/localStorage/schemas";
import { SavedTranscriptsSummary } from "../components/SavedTranscriptsSummary";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function SavedView() {
  const navigate = useRouterStore((state) => state.navigate);

  // Storage hooks

  const {
    save: saveTranscript,
    transcripts: savedTranscripts,
    loading: transcriptsLoading,
    remove: removeTranscript,
    getWithAudio,
    updateMetadata,
  } = useTranscripts();

  // Local state
  const [searchQuery, setSearchQuery] = useState("");
  const [editConversationModal, setEditConversationModal] = useState<{
    open: boolean;
    transcript: SavedTranscript | null;
  }>({ open: false, transcript: null });
  const [editSpeakersModal, setEditSpeakersModal] = useState<{
    open: boolean;
    transcript: SavedTranscript | null;
  }>({ open: false, transcript: null });

  // Filter transcripts by search query
  const filteredTranscripts = savedTranscripts.filter((transcript) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      transcript.metadata.fileName.toLowerCase().includes(query) ||
      new Date(transcript.metadata.updatedAt)
        .toLocaleDateString()
        .includes(query)
    );
  });

  // Handle load transcript
  const handleLoadTranscript = useCallback(
    (transcriptId: string) => {
      navigate("transcript", { id: transcriptId });
    },
    [navigate],
  );

  // Handle delete transcript
  const handleDelete = useCallback(
    async (transcript: { id: string; fileName: string }) => {
      if (confirm(`Delete "${transcript.fileName}"?`)) {
        try {
          await removeTranscript(transcript.id);
          toast.success("Transcript deleted");
        } catch (err) {
          toast.error("Failed to delete transcript", {
            description:
              err instanceof Error ? err.message : "Unknown error",
          });
        }
      }
    },
    [removeTranscript],
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
        toast.success("Speaker names updated!");
      } catch (error) {
        toast.error("Failed to update speaker names", {
          description:
            error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [editSpeakersModal.transcript, updateMetadata],
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
        <div className="my-auto space-y-8 py-8">
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
              Saved Transcripts
            </motion.h1>
            <motion.p
              className="text-muted-foreground max-w-2xl px-4 text-base sm:text-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Browse and manage your saved transcription sessions
            </motion.p>
          </motion.div>

          {/* Actions bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Search */}
            <div className="relative max-w-md flex-1">
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
                placeholder="Search transcripts..."
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-10 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 transition-colors"
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

            {/* Back button */}
            <Button
              onClick={() => navigate("upload")}
              variant="outline"
              size="sm"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Home
            </Button>
          </div>

          <Card className="border-muted/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              {transcriptsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
                </div>
              ) : filteredTranscripts.length === 0 ? (
                <div className="py-16 text-center">
                  <svg
                    className="text-muted-foreground mx-auto h-16 w-16"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="text-foreground mt-4 text-lg font-semibold">
                    {searchQuery
                      ? "No matching transcripts"
                      : "No saved transcripts"}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm">
                    {searchQuery
                      ? "Try adjusting your search query"
                      : "Start by creating a new transcription"}
                  </p>
                  {!searchQuery && (
                    <Button
                      onClick={() => navigate("upload")}
                      className="mt-4"
                      size="sm"
                    >
                      Create Transcription
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-foreground text-sm font-semibold">
                      {filteredTranscripts.length} transcript
                      {filteredTranscripts.length !== 1 ? "s" : ""}
                      {searchQuery && ` matching "${searchQuery}"`}
                    </h3>
                  </div>

                  <div className="space-y-2">
                    <SavedTranscriptsSummary
                      savedTranscripts={filteredTranscripts}
                      transcriptsLoading={transcriptsLoading}
                      onLoadTranscript={handleLoadTranscript}
                      onRemoveTranscript={removeTranscript}
                      onUpdateMetadata={updateMetadata}
                    />
                  </div>
                </div>
              )}
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
              All data stored locally
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
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Privacy first
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
