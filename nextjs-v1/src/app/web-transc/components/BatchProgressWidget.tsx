"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBatchStore } from "../store/useBatchStore";
import { useRouterStore } from "../store/useRouterStore";

export function BatchProgressWidget() {
  const {
    files,
    processingCount,
    totalCompleted,
    totalFailed,
    batchStatus,
    isPaused,
  } = useBatchStore();

  const { navigate } = useRouterStore();

  // Don't show widget if no files
  if (files.length === 0) {
    return null;
  }

  const totalFiles = files.length;
  const overallProgress =
    totalFiles > 0
      ? ((totalCompleted + totalFailed) / totalFiles) * 100
      : 0;
  const queuedCount = files.filter((f) => f.status === "queued").length;

  // Determine status text and color
  const getStatusDisplay = () => {
    if (isPaused) {
      return {
        text: "Paused",
        color: "text-yellow-600",
        icon: "⏸️",
      };
    }
    if (batchStatus === "completed") {
      return {
        text: "Completed",
        color: "text-green-600",
        icon: "✓",
      };
    }
    if (processingCount > 0) {
      return {
        text: "Processing",
        color: "text-blue-600",
        icon: "⚙️",
      };
    }
    return {
      text: "Queued",
      color: "text-gray-600",
      icon: "⏳",
    };
  };

  const statusDisplay = getStatusDisplay();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-background border-border mb-4 w-full cursor-pointer rounded-lg p-4 shadow-sm transition-shadow hover:shadow-md"
        onClick={() => {
          // Navigate to upload view with batch tab
          navigate("upload");
        }}
      >
        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{statusDisplay.icon}</span>
            <h4 className="text-sm font-semibold text-gray-900">
              Batch Processing
            </h4>
          </div>
          <button
            className="text-primary/70 hover:text-primary text-xs font-medium"
            onClick={(e) => {
              e.stopPropagation();
              navigate("upload");
            }}
          >
            Expand ↗
          </button>
        </div>

        {/* Progress Bar */}
        <div className="bg-secondary-foreground mb-2 h-2 w-full overflow-hidden rounded-full">
          <motion.div
            className={`h-full rounded-full ${
              batchStatus === "completed"
                ? "bg-success"
                : isPaused
                  ? "bg-warning"
                  : "bg-ring"
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Status Text */}
        <div className="flex items-center justify-between text-xs">
          <span className={`font-medium ${statusDisplay.color}`}>
            {statusDisplay.text}
          </span>
          <span className="text-muted-foreground">
            {totalCompleted} of {totalFiles} complete
          </span>
        </div>

        {/* Details */}
        <div className="mt-2 text-xs text-gray-500">
          {processingCount > 0 && (
            <span className="mr-3">⚙️ {processingCount} processing</span>
          )}
          {queuedCount > 0 && (
            <span className="mr-3">⏳ {queuedCount} queued</span>
          )}
          {totalFailed > 0 && (
            <span className="text-red-600">✗ {totalFailed} failed</span>
          )}
        </div>

        {/* Percentage */}
        {batchStatus !== "completed" && (
          <div className="muted-foreground/70 mt-1 text-xs">
            {overallProgress.toFixed(0)}%
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
