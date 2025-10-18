/**
 * SavedTranscriptsSummary - Component for displaying saved transcripts list
 * Shows: List of saved transcripts with metadata and action buttons
 */

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { EditConversationModal } from "./EditConversationModal";
import { EditSpeakersModal } from "./EditSpeakersModal";
import type { SavedTranscript } from "@/lib/localStorage/schemas";
import { cn } from "@/lib/utils";

interface SavedTranscriptsSummaryProps {
  savedTranscripts: SavedTranscript[];
  transcriptsLoading: boolean;
  onLoadTranscript: (transcriptId: string) => void;
  onRemoveTranscript: (transcriptId: string) => Promise<void>;
  onUpdateMetadata: (
    transcriptId: string,
    metadata: Partial<SavedTranscript["metadata"]>,
  ) => Promise<void>;
  className?: string;
  scrollableClassName?: string;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function SavedTranscriptsSummary({
  savedTranscripts,
  transcriptsLoading,
  onLoadTranscript,
  onRemoveTranscript,
  onUpdateMetadata,
  className,
  scrollableClassName,
}: SavedTranscriptsSummaryProps) {
  const [editConversationModal, setEditConversationModal] = useState<{
    open: boolean;
    transcript: SavedTranscript | null;
  }>({ open: false, transcript: null });
  const [editSpeakersModal, setEditSpeakersModal] = useState<{
    open: boolean;
    transcript: SavedTranscript | null;
  }>({ open: false, transcript: null });

  // Modal handlers
  const handleSaveConversationName = async (conversationName: string) => {
    if (!editConversationModal.transcript) return;

    try {
      await onUpdateMetadata(editConversationModal.transcript.id, {
        conversationName,
      });
      toast.success("Conversation name updated!");
    } catch (error) {
      toast.error("Failed to update conversation name", {
        description:
          error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleSaveSpeakerNames = async (
    speakerNames: Record<string, string>,
  ) => {
    if (!editSpeakersModal.transcript) return;

    try {
      await onUpdateMetadata(editSpeakersModal.transcript.id, {
        speakerNames,
      });
      toast.success("Speaker names updated!");
    } catch (error) {
      toast.error("Failed to update speaker names", {
        description:
          error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  if (savedTranscripts.length === 0) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className={cn("w-full space-y-3", className)}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-foreground text-sm font-semibold">
            Saved Transcripts
          </h3>
          <span className="text-muted-foreground text-xs">
            {savedTranscripts.length} saved
          </span>
        </div>

        <div
          className={cn(
            "border-muted/50 bg-muted/20 space-y-2 overflow-y-auto rounded-lg border p-3",
            scrollableClassName,
          )}
        >
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
                onDoubleClick={() => onLoadTranscript(transcript.id)}
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
                        {formatTime(transcript.metadata.duration)}
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
                        {transcript.metadata.speakerCount} speaker
                        {transcript.metadata.speakerCount !== 1 ? "s" : ""}
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
                          onRemoveTranscript(transcript.id).catch(
                            (err) => {
                              toast.error("Failed to delete transcript", {
                                description: err.message,
                              });
                            },
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
    </>
  );
}
