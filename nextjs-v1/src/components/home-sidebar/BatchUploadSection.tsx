"use client";

import { useBatchStore } from "@/app/web-transc/store/useBatchStore";
import { useRouterStore } from "@/app/web-transc/store/useRouterStore";
import { motion } from "framer-motion";
import {
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Layers,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

const BatchUploadSection = () => {
  const { files, processingCount, totalCompleted, totalFailed } =
    useBatchStore();
  const { navigate } = useRouterStore();
  const { state: sidebarState } = useSidebar();

  const totalFiles = files.length;
  const hasFiles = totalFiles > 0;
  const isProcessing = processingCount > 0;

  // Calculate overall progress including current file progress
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

  // Calculate estimated time
  const calculateEstimatedTime = () => {
    const processingFile = files.find(f => f.status === "processing");
    if (!processingFile || !processingFile.estimatedTimeRemaining) {
      return null;
    }

    // Calculate processing rate from current file
    const processedDuration = processingFile.audioDuration
      ? processingFile.audioDuration * (processingFile.progress / 100)
      : null;

    if (!processedDuration || processedDuration === 0) {
      return processingFile.estimatedTimeRemaining;
    }

    const elapsedTime = (processingFile.audioDuration || 0) -
      (processingFile.estimatedTimeRemaining * (processingFile.progress / 100));
    const processingRate = elapsedTime > 0 ? processedDuration / elapsedTime : 1.0;

    // Add time for queued files based on their actual durations
    const queuedFiles = files.filter(f => f.status === "queued");
    const queuedTime = queuedFiles.reduce((total, file) => {
      if (file.audioDuration && processingRate > 0) {
        return total + (file.audioDuration / processingRate);
      }
      return total;
    }, 0);

    return processingFile.estimatedTimeRemaining + queuedTime;
  };

  const estimatedTime = calculateEstimatedTime();

  // Format time helper
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const handleClick = () => {
    navigate("upload", {});
  };

  // Show button when no files, or widget when has files
  if (!hasFiles) {
    // Empty state - show "Start Batch Upload" button
    if (sidebarState === "collapsed") {
      return (
        <motion.button
          onClick={handleClick}
          className="hover:bg-accent relative flex h-10 w-10 items-center justify-center rounded-md"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Batch Upload"
        >
          <Layers className="text-muted-foreground h-5 w-5" />
        </motion.button>
      );
    }

    return (
      <motion.button
        onClick={handleClick}
        className="group hover:border-primary hover:bg-accent/50 relative w-full rounded-lg border border-dashed p-3 text-left transition-all"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Layers className="h-4 w-4" />
          <span className="font-medium">Start Batch Upload</span>
          <ChevronRight className="ml-auto h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </motion.button>
    );
  }

  // Collapsed view - just show icon with badge
  if (sidebarState === "collapsed") {
    return (
      <motion.button
        onClick={handleClick}
        className="hover:bg-accent relative flex h-10 w-10 items-center justify-center rounded-md"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isProcessing ? (
          <Loader2 className="text-primary h-5 w-5 animate-spin" />
        ) : totalFailed > 0 ? (
          <XCircle className="text-destructive h-5 w-5" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        )}
        {totalFiles > 0 && (
          <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold">
            {totalFiles}
          </span>
        )}
      </motion.button>
    );
  }

  // Expanded view - show full widget
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="w-full"
    >
      <button
        onClick={handleClick}
        className="group bg-card relative w-full overflow-hidden rounded-lg border p-3 text-left shadow-sm transition-all hover:shadow-md"
      >
        {/* Background gradient effect */}
        <div className="from-primary/5 absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

        <div className="relative space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isProcessing ? (
                <Loader2 className="text-primary h-4 w-4 animate-spin" />
              ) : totalFailed > 0 ? (
                <XCircle className="text-destructive h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
              <span className="text-sm font-semibold">Batch Upload</span>
            </div>
            <ChevronRight className="text-muted-foreground h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>

          {/* Stats */}
          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <Upload className="h-3 w-3" />
              <span>{totalFiles} files</span>
            </div>
            {isProcessing && (
              <div className="flex items-center gap-1">
                <div className="bg-primary h-2 w-2 animate-pulse rounded-full" />
                <span>{processingCount} active</span>
              </div>
            )}
            {totalCompleted > 0 && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                <span>{totalCompleted} done</span>
              </div>
            )}
            {totalFailed > 0 && (
              <div className="text-destructive flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                <span>{totalFailed} failed</span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
              <motion.div
                className="from-primary to-primary/80 h-full bg-gradient-to-r"
                animate={{ width: `${overallProgress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            <div className="text-muted-foreground flex items-center justify-between text-[10px]">
              <span>
                {isProcessing ? (
                  estimatedTime && estimatedTime > 0 ? (
                    `~${formatTime(estimatedTime)} left`
                  ) : (
                    "Processing..."
                  )
                ) : (
                  "Complete"
                )}
              </span>
              <span className="font-semibold">{overallProgress}%</span>
            </div>
          </div>
        </div>

        {/* Pulse animation when processing */}
        {isProcessing && (
          <motion.div
            className="border-primary absolute inset-0 rounded-lg border-2"
            animate={{
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </button>
    </motion.div>
  );
};

export default BatchUploadSection;
