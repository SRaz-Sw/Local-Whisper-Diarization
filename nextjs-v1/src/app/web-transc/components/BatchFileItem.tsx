'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { BatchFile } from '../store/useBatchStore';

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
    disabled: file.status !== 'queued', // Only allow dragging queued files
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

  // Get status icon and color
  const getStatusDisplay = () => {
    switch (file.status) {
      case 'queued':
        return {
          icon: '⏳',
          text: 'Queued',
          color: 'text-gray-400',
          bgColor: 'bg-gray-100',
        };
      case 'processing':
        return {
          icon: '⚙️',
          text: 'Processing',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
        };
      case 'completed':
        return {
          icon: '✓',
          text: 'Completed',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
        };
      case 'error':
        return {
          icon: '✗',
          text: 'Error',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
        };
      case 'cancelled':
        return {
          icon: '⊘',
          text: 'Cancelled',
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
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
        className={`relative rounded-lg border ${statusDisplay.bgColor} p-4 mb-2 transition-all`}
      >
        {/* Drag Handle - Only show for queued files */}
        {file.status === 'queued' && (
          <div
            {...attributes}
            {...listeners}
            className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
            title="Drag to reorder"
          >
            <svg
              className="w-5 h-5"
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

        <div className={`${file.status === 'queued' ? 'ml-8' : ''}`}>
          {/* File Info */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">{statusDisplay.icon}</span>
                <h4 className="font-medium text-gray-900 truncate" title={file.fileName}>
                  {file.fileName}
                </h4>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {formatFileSize(file.fileSize)}
                {file.retryCount > 0 && (
                  <span className="ml-2 text-orange-600">
                    (Retry {file.retryCount}/3)
                  </span>
                )}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 ml-4">
              {file.status === 'processing' && (
                <button
                  onClick={() => onCancel(file.id)}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Cancel"
                >
                  Cancel
                </button>
              )}

              {file.status === 'error' && (
                <button
                  onClick={() => onRetry(file.id)}
                  className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Retry"
                  disabled={file.retryCount >= 3}
                >
                  Retry
                </button>
              )}

              {file.status === 'completed' && file.transcriptId && onViewTranscript && (
                <button
                  onClick={() => onViewTranscript(file.transcriptId!)}
                  className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="View Transcript"
                >
                  View
                </button>
              )}

              {(file.status === 'queued' ||
                file.status === 'cancelled' ||
                file.status === 'error' ||
                file.status === 'completed') && (
                <button
                  onClick={() => onRemove(file.id)}
                  className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Remove from list"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar - Show for processing files */}
          {file.status === 'processing' && (
            <div className="space-y-1">
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="bg-blue-600 h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${file.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-xs text-gray-600">{file.progress.toFixed(1)}%</p>
            </div>
          )}

          {/* Status Text */}
          <div className={`text-sm ${statusDisplay.color} mt-2`}>
            {statusDisplay.text}
            {file.error && file.status === 'error' && (
              <p className="text-xs text-red-600 mt-1" title={file.error}>
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
