"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { SavedTranscript } from "@/lib/localStorage/schemas";

interface DuplicateFileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingTranscript: SavedTranscript | null;
  onViewExisting: () => void;
  onGoBack: () => void;
}

export function DuplicateFileModal({
  open,
  onOpenChange,
  existingTranscript,
  onViewExisting,
  onGoBack,
}: DuplicateFileModalProps) {
  if (!existingTranscript) return null;

  const fileName =
    existingTranscript.metadata.conversationName ||
    existingTranscript.metadata.fileName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>File Already Exists</DialogTitle>
          <DialogDescription>
            This file has already been transcribed and saved in the system.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                File name:
              </p>
              <p className="text-sm text-gray-900 dark:text-white">
                {fileName}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Duration:
              </p>
              <p className="text-sm text-gray-900 dark:text-white">
                {formatDuration(existingTranscript.metadata.duration)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Created:
              </p>
              <p className="text-sm text-gray-900 dark:text-white">
                {new Date(
                  existingTranscript.metadata.createdAt,
                ).toLocaleDateString()}{" "}
                at{" "}
                {new Date(
                  existingTranscript.metadata.createdAt,
                ).toLocaleTimeString()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Speakers:
              </p>
              <p className="text-sm text-gray-900 dark:text-white">
                {existingTranscript.metadata.speakerCount}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="outline"
            onClick={onGoBack}
            className="w-full sm:w-auto"
          >
            Go Back & Pick Another File
          </Button>
          <Button
            onClick={onViewExisting}
            className="w-full sm:w-auto"
          >
            View Existing Transcript
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
