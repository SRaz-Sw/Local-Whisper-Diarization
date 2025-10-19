'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBatchStore } from '../store/useBatchStore';
import { useRouterStore } from '../store/useRouterStore';

export function BatchProgressWidget() {
  const {
    files,
    processingCount,
    totalCompleted,
    totalFailed,
    batchStatus,
    isPaused,
  } = useBatchStore();

  const { setCurrentView } = useRouterStore();

  // Don't show widget if no files
  if (files.length === 0) {
    return null;
  }

  const totalFiles = files.length;
  const overallProgress = totalFiles > 0
    ? ((totalCompleted + totalFailed) / totalFiles) * 100
    : 0;
  const queuedCount = files.filter((f) => f.status === 'queued').length;

  // Determine status text and color
  const getStatusDisplay = () => {
    if (isPaused) {
      return {
        text: 'Paused',
        color: 'text-yellow-600',
        icon: '⏸️',
      };
    }
    if (batchStatus === 'completed') {
      return {
        text: 'Completed',
        color: 'text-green-600',
        icon: '✓',
      };
    }
    if (processingCount > 0) {
      return {
        text: 'Processing',
        color: 'text-blue-600',
        icon: '⚙️',
      };
    }
    return {
      text: 'Queued',
      color: 'text-gray-600',
      icon: '⏳',
    };
  };

  const statusDisplay = getStatusDisplay();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => {
          // Navigate to upload view with batch tab
          setCurrentView('upload');
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{statusDisplay.icon}</span>
            <h4 className="font-semibold text-sm text-gray-900">Batch Processing</h4>
          </div>
          <button
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentView('upload');
            }}
          >
            Expand ↗
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-2">
          <motion.div
            className={`h-full rounded-full ${
              batchStatus === 'completed'
                ? 'bg-green-600'
                : isPaused
                ? 'bg-yellow-600'
                : 'bg-blue-600'
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
          <span className="text-gray-600">
            {totalCompleted} of {totalFiles} complete
          </span>
        </div>

        {/* Details */}
        <div className="text-xs text-gray-500 mt-2">
          {processingCount > 0 && (
            <span className="mr-3">
              ⚙️ {processingCount} processing
            </span>
          )}
          {queuedCount > 0 && (
            <span className="mr-3">
              ⏳ {queuedCount} queued
            </span>
          )}
          {totalFailed > 0 && (
            <span className="text-red-600">
              ✗ {totalFailed} failed
            </span>
          )}
        </div>

        {/* Percentage */}
        {batchStatus !== 'completed' && (
          <div className="text-xs text-gray-400 mt-1">
            {overallProgress.toFixed(0)}%
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
