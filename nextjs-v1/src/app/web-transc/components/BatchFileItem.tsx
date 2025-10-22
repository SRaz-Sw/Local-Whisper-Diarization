"use client";

import React from "react";
import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BatchFile } from "../store/useBatchStore";

interface BatchFileItemProps {
  file: BatchFile;
  onCancel: (fileId: string) => void;
  onRetry: (fileId: string) => void;
  onRemove: (fileId: string) => void;
  onViewTranscript?: (transcriptId: string) => void;
}

export function BatchFileItem({
  file,
  onCancel,
  onRetry,
  onRemove,
  onViewTranscript,
}: BatchFileItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: file.id,
    disabled: file.status !== "queued", // Only allow dragging queued files
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get status icon and color
  const getStatusDisplay = () => {
    switch (file.status) {
      case "queued":
        return {
          icon: "⏳",
          text: "Queued",
          color: "text-accent",
          bgColor: "bg-accent/30",
        };
      case "processing":
        return {
          icon: "⚙️",
          text: "Processing",
          color: "text-primary",
          bgColor: "bg-primary/5",
        };
      case "completed":
        return {
          icon: "✓",
          text: "Completed",
          color: "text-success",
          bgColor: "bg-success/5",
        };
      case "error":
        return {
          icon: "✗",
          text: "Error",
          color: "text-destructive",
          bgColor: "bg-destructive/5",
        };
      case "cancelled":
        return {
          icon: "⊘",
          text: "Cancelled",
          color: "text-muted-foreground",
          bgColor: "bg-muted/5",
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div ref={setNodeRef} style={style}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -100 }}
        className={`relative rounded-lg border ${statusDisplay.bgColor} mb-2 p-4 transition-all`}
      >
        {/* Drag Handle - Only show for queued files */}
        {file.status === "queued" && (
          <div
            {...attributes}
            {...listeners}
            className="text-accent hover:text-muted-foreground absolute top-1/2 left-2 -translate-y-1/2 cursor-grab active:cursor-grabbing"
            title="Drag to reorder"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8h16M4 16h16"
              />
            </svg>
          </div>
        )}

        <div className={`${file.status === "queued" ? "ml-8" : ""}`}>
          {/* File Info */}
          <div className="mb-2 flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">{statusDisplay.icon}</span>
                <h4
                  className="text-foreground truncate font-medium"
                  title={file.fileName}
                >
                  {file.fileName}
                </h4>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                {formatFileSize(file.fileSize)}
                {file.audioDuration && (
                  <span className="ml-2">• {formatDuration(file.audioDuration)}</span>
                )}
                {file.retryCount > 0 && (
                  <span className="text-warning ml-2">
                    (Retry {file.retryCount}/3)
                  </span>
                )}
              </p>
            </div>

            {/* Actions */}
            <div className="ml-4 flex items-center gap-2">
              {file.status === "processing" && (
                <button
                  onClick={() => onCancel(file.id)}
                  className="text-background bg-destructive hover:bg-destructive/80 rounded px-3 py-1 text-sm transition-colors"
                  title="Cancel"
                >
                  Cancel
                </button>
              )}

              {file.status === "error" && (
                <button
                  onClick={() => onRetry(file.id)}
                  className="text-primary hover:bg-primary/5 rounded px-3 py-1 text-sm transition-colors"
                  title="Retry"
                  disabled={file.retryCount >= 3}
                >
                  Retry
                </button>
              )}

              {file.status === "completed" &&
                file.transcriptId &&
                onViewTranscript && (
                  <button
                    onClick={() => onViewTranscript(file.transcriptId!)}
                    className="text-primary hover:bg-primary/5 rounded px-3 py-1 text-sm transition-colors"
                    title="View Transcript"
                  >
                    View
                  </button>
                )}

              {(file.status === "queued" ||
                file.status === "cancelled" ||
                file.status === "error" ||
                file.status === "completed") && (
                <button
                  onClick={() => onRemove(file.id)}
                  className="text-muted-foreground hover:bg-card rounded px-3 py-1 text-sm transition-colors"
                  title="Remove from list"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar - Show for processing files */}
          {file.status === "processing" && (
            <div className="space-y-1">
              <div className="bg-popover h-2 w-full overflow-hidden rounded-full">
                <motion.div
                  className="bg-primary h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${file.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                {file.progress.toFixed(1)}%
              </p>
            </div>
          )}

          {/* Status Text */}
          <div className={`text-sm ${statusDisplay.color} mt-2`}>
            {statusDisplay.text}
            {file.error && file.status === "error" && (
              <p
                className="text-destructive mt-1 text-xs"
                title={file.error}
              >
                {file.error.length > 100
                  ? `${file.error.substring(0, 100)}...`
                  : file.error}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
