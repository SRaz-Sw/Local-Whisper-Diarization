"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useBatchStore } from "../store/useBatchStore";
import { useWhisperStore } from "../store/useWhisperStore";
import { BatchFileItem } from "./BatchFileItem";
import { batchQueueManager } from "../services/BatchQueueManager";
import { useTranscripts } from "../hooks/useTranscripts";
import { ModelSelector } from "./ModelSelector";
import { AVAILABLE_MODELS } from "../config/modelConfig";
import { useRouterStore } from "../store/useRouterStore";

const MAX_BATCH_SIZE = 50;
const ALLOWED_TYPES = ["audio/", "video/"];

export function BatchFileUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [duplicates, setDuplicates] = useState<string[]>([]);

  const { transcripts: savedTranscripts, findDuplicateByFileName } =
    useTranscripts();

  const {
    files,
    processingCount,
    totalCompleted,
    totalFailed,
    totalCancelled,
    batchStatus,
    isPaused,
    isDragging,
    isComponentInitialized,
    addFiles,
    removeFile,
    cancelFile,
    retryFile,
    pauseBatch,
    resumeBatch,
    clearCompleted,
    clearAll,
    reorderFiles,
    setIsDragging,
    setComponentInitialized,
  } = useBatchStore();

  // Get model and device from Whisper store (shared with single-file upload)
  const model = useWhisperStore((state) => state.model.model);
  const device = useWhisperStore((state) => state.model.device);
  const setModel = useWhisperStore((state) => state.setModel);

  // Handle model change
  const handleModelChange = useCallback(
    (newModel: string) => {
      console.log("🔄 Batch: Model changed to:", newModel);
      setModel(newModel);
    },
    [setModel],
  );

  const navigate = useRouterStore((state) => state.navigate);

  // Debug: Log renders and state
  console.log(
    `🎨 BatchFileUpload render - files: ${files.length}, processing: ${processingCount}, completed: ${totalCompleted}`,
  );

  // Initialize queue manager
  useEffect(() => {
    const init = async () => {
      const success = await batchQueueManager.initialize();
      if (success) {
        setComponentInitialized(true);
        console.log("✅ Batch upload initialized");
      } else {
        console.error("❌ Failed to initialize batch upload");
      }
    };

    init();

    // Don't terminate on unmount - let the manager persist
    // Only terminate when truly needed (e.g., navigating away from batch mode)
    return () => {
      // Cleanup is handled when exiting batch mode entirely
      console.log(
        "📤 BatchFileUpload unmounting (not terminating manager)",
      );
    };
  }, [setComponentInitialized]);

  // Start processing when files are added
  useEffect(() => {
    if (files.length > 0 && !isPaused && batchStatus !== "completed") {
      batchQueueManager.start(() => {
        console.log("✅ Batch processing completed!");
        // Optional: Show notification
      });
    }
  }, [files, isPaused, batchStatus]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Handle file selection
  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      console.log(
        "📥 handleFileSelect called with:",
        selectedFiles?.length || 0,
        "files",
      );

      if (!selectedFiles || selectedFiles.length === 0) {
        console.log("❌ No files selected, returning early");
        return;
      }

      const fileArray = Array.from(selectedFiles);
      console.log(
        "📋 File array created:",
        fileArray.map((f) => `${f.name} (${f.type}, ${f.size} bytes)`),
      );

      // Check max batch size
      if (files.length + fileArray.length > MAX_BATCH_SIZE) {
        console.warn(
          `⚠️ Exceeded max batch size: ${files.length} + ${fileArray.length} > ${MAX_BATCH_SIZE}`,
        );
        alert(
          `Maximum batch size is ${MAX_BATCH_SIZE} files. Current: ${files.length}`,
        );
        return;
      }

      // Validate file types
      const validFiles = fileArray.filter((file) => {
        const isValid = ALLOWED_TYPES.some((type) =>
          file.type.startsWith(type),
        );
        if (!isValid) {
          console.warn(
            `⚠️ Skipping invalid file type: ${file.name} (${file.type})`,
          );
        }
        return isValid;
      });

      console.log(
        "✅ Valid files after type check:",
        validFiles.length,
        validFiles.map((f) => f.name),
      );

      if (validFiles.length === 0) {
        console.warn("❌ No valid audio/video files after filtering");
        alert("No valid audio/video files selected.");
        return;
      }

      // Check for duplicates
      const foundDuplicates: string[] = [];
      validFiles.forEach((file) => {
        const existing = findDuplicateByFileName(file.name);
        if (existing) {
          foundDuplicates.push(file.name);
        }
      });

      if (foundDuplicates.length > 0) {
        console.log("⚠️ Found duplicates:", foundDuplicates);
        const proceed = window.confirm(
          `Found ${foundDuplicates.length} duplicate file(s):\n${foundDuplicates.slice(0, 5).join("\n")}${foundDuplicates.length > 5 ? "\n..." : ""}\n\nDo you want to process them anyway?`,
        );
        if (!proceed) {
          console.log("❌ User cancelled due to duplicates");
          return;
        }
      }

      // Add files to batch
      console.log("➕ Calling addFiles with", validFiles.length, "files");
      addFiles(validFiles);
      console.log("✅ addFiles called successfully");

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [files.length, findDuplicateByFileName, addFiles],
  );

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      console.log("🎯 handleDrop triggered");
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFiles = e.dataTransfer.files;
      console.log("📦 Dropped files:", droppedFiles.length);
      handleFileSelect(droppedFiles);
    },
    [handleFileSelect],
  );

  // Handle drag end for reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = files.findIndex((f) => f.id === active.id);
      const newIndex = files.findIndex((f) => f.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderFiles(active.id as string, newIndex);
      }
    }
  };

  // Calculate progress including current file progress
  const totalFiles = files.length;
  const calculateOverallProgress = () => {
    if (totalFiles === 0) return 0;

    let totalProgress = 0;
    files.forEach((file) => {
      if (file.status === "completed") {
        totalProgress += 100;
      } else if (file.status === "processing") {
        totalProgress += file.progress || 0;
      } else if (file.status === "error" || file.status === "cancelled") {
        totalProgress += 100; // Count as complete for progress calculation
      }
      // queued files contribute 0
    });

    return Math.round(totalProgress / totalFiles);
  };

  const overallProgress = calculateOverallProgress();

  // Calculate estimated time remaining for batch
  const calculateEstimatedTime = () => {
    // Get current processing file's estimated time
    const processingFile = files.find((f) => f.status === "processing");
    if (!processingFile || !processingFile.estimatedTimeRemaining) {
      return null;
    }

    // Calculate processing rate (seconds of audio processed per second of real time)
    // If file is 60s long and we're at 50% progress after 30s of real time, rate = 1.0
    const processedDuration = processingFile.audioDuration
      ? processingFile.audioDuration * (processingFile.progress / 100)
      : null;

    if (!processedDuration || processedDuration === 0) {
      return processingFile.estimatedTimeRemaining;
    }

    // Time elapsed = total duration * progress / 100, divided by processing rate
    // But we already have estimatedTimeRemaining from worker, so we can calculate rate:
    // rate = processedDuration / (total_time - remaining_time)
    const elapsedTime =
      (processingFile.audioDuration || 0) -
      processingFile.estimatedTimeRemaining *
        (processingFile.progress / 100);
    const processingRate =
      elapsedTime > 0 ? processedDuration / elapsedTime : 1.0;

    // Add time for queued files based on their actual durations
    const queuedFiles = files.filter((f) => f.status === "queued");
    const queuedTime = queuedFiles.reduce((total, file) => {
      if (file.audioDuration && processingRate > 0) {
        // Estimate time = audio duration / processing rate
        return total + file.audioDuration / processingRate;
      }
      return total;
    }, 0);

    return processingFile.estimatedTimeRemaining + queuedTime;
  };

  const estimatedTimeRemaining = calculateEstimatedTime();

  // Format time helper
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const queuedFiles = files.filter((f) => f.status === "queued");
  const processingFiles = files.filter((f) => f.status === "processing");
  const completedFiles = files.filter((f) => f.status === "completed");
  const errorFiles = files.filter((f) => f.status === "error");
  const cancelledFiles = files.filter((f) => f.status === "cancelled");

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      {/* Model Selector - Always visible at top */}
      <div className="border-accent bg-background mb-6 flex items-center justify-between rounded-lg border p-4 shadow-sm">
        <div>
          <h3 className="text-popover-foreground mb-1 text-sm font-medium">
            Model Selection
          </h3>
          <p className="text-muted-foreground text-xs">
            Choose model for batch processing (affects all files)
          </p>
        </div>
        <ModelSelector
          disabled={
            processingCount > 0 ||
            files.some((f) => f.status === "processing")
          }
          onModelChange={handleModelChange}
        />
      </div>

      {/* Current Model Info */}
      {model && (
        <div className="text-muted-foreground mb-4 text-center text-sm">
          Using{" "}
          <span className="font-semibold">
            {AVAILABLE_MODELS[model]?.name || model}
          </span>{" "}
          on <span className="font-semibold uppercase">{device}</span>
        </div>
      )}

      {/* Drop Zone */}
      {files.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-lg border-2 border-dashed p-12 text-center transition-all ${
            isDragging
              ? "border-primary bg-primary/10"
              : "border-muted bg-muted/10 hover:border-muted/20"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,video/*"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            id="batch-file-input"
          />
          <label htmlFor="batch-file-input" className="cursor-pointer">
            <div className="mb-4 text-6xl">📁</div>
            <h3 className="text-popover-foreground mb-2 text-xl font-semibold">
              Drop files here or click to browse
            </h3>
            <p className="text-gray-500">
              Upload up to {MAX_BATCH_SIZE} audio or video files
            </p>
            <p className="mt-2 text-sm text-gray-400">
              Supports MP3, WAV, M4A, MP4, and more
            </p>
          </label>
        </motion.div>
      )}

      {/* Batch Summary */}
      {files.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-background mb-6 rounded-lg p-6 shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Batch: {totalFiles} file{totalFiles !== 1 ? "s" : ""}
              </h3>
              <p className="text-sm text-gray-600">
                {totalCompleted} completed • {processingCount} processing •{" "}
                {queuedFiles.length} queued
                {totalFailed > 0 && ` • ${totalFailed} failed`}
                {totalCancelled > 0 && ` • ${totalCancelled} cancelled`}
              </p>
            </div>

            <div className="flex gap-2">
              {files.length > 0 && (
                <button
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.click();
                    }
                  }}
                  className="bg-secondary text-popover-foreground hover:bg-accent rounded px-4 py-2 text-sm transition-colors"
                  disabled={files.length >= MAX_BATCH_SIZE}
                >
                  Add More
                </button>
              )}
              {isPaused ? (
                <button
                  onClick={resumeBatch}
                  className="text-background bg-success/80 hover:bg-sucess rounded px-4 py-2 text-sm transition-colors"
                >
                  Resume
                </button>
              ) : (
                <button
                  onClick={pauseBatch}
                  className="text-background bg-warning/80 hover:bg-warning rounded px-4 py-2 text-sm transition-colors"
                  disabled={
                    processingCount === 0 && queuedFiles.length === 0
                  }
                >
                  Pause
                </button>
              )}
              <button
                onClick={clearCompleted}
                className="hover:bg-popover-fotext-popover-foreground text-background bg-muted-foreground rounded px-4 py-2 text-sm transition-colors"
                disabled={completedFiles.length === 0}
              >
                Clear Completed
              </button>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to cancel all and clear the queue?",
                    )
                  ) {
                    batchQueueManager.cancelAll();
                  }
                }}
                className="text-background bg-destructive/80 hover:bg-destructive rounded px-4 py-2 text-sm transition-colors"
              >
                Cancel All
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-popover-foreground font-medium">
                Overall Progress
              </span>
              <div className="flex items-center gap-2">
                {estimatedTimeRemaining !== null &&
                  estimatedTimeRemaining > 0 && (
                    <span className="text-xs text-gray-500">
                      ~{formatTime(estimatedTimeRemaining)} remaining
                    </span>
                  )}
                <span className="text-primary font-semibold">
                  {overallProgress}%
                </span>
              </div>
            </div>
            <div className="bg-accent h-3 w-full overflow-hidden rounded-full">
              <motion.div
                className="from-primary to-primary/80 h-full rounded-full bg-gradient-to-r transition-all"
                animate={{ width: `${overallProgress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="max-h-[26rem] space-y-2 overflow-y-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={files.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <AnimatePresence>
                {files.map((file) => (
                  <BatchFileItem
                    key={file.id}
                    file={file}
                    onCancel={(fileId) => {
                      batchQueueManager.cancelFile(fileId);
                    }}
                    onRetry={(fileId) => retryFile(fileId)}
                    onRemove={(fileId) => removeFile(fileId)}
                    onViewTranscript={(transcriptId) => {
                      navigate("transcript", { id: transcriptId });
                    }}
                  />
                ))}
              </AnimatePresence>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Hidden file input for "Add More" button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/*"
        multiple
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* Status Messages */}
      {!isComponentInitialized && (
        <div className="mt-4 text-center text-gray-500">
          Initializing batch upload...
        </div>
      )}
    </div>
  );
}
