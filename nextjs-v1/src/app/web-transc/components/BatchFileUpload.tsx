'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useBatchStore } from '../store/useBatchStore';
import { useWhisperStore } from '../store/useWhisperStore';
import { BatchFileItem } from './BatchFileItem';
import { batchQueueManager } from '../services/BatchQueueManager';
import { useTranscripts } from '../hooks/useTranscripts';
import { ModelSelector } from './ModelSelector';
import { AVAILABLE_MODELS } from '../config/modelConfig';

const MAX_BATCH_SIZE = 50;
const ALLOWED_TYPES = ['audio/', 'video/'];

export function BatchFileUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const { transcripts: savedTranscripts, findDuplicateByFileName } = useTranscripts();

  const {
    files,
    processingCount,
    totalCompleted,
    totalFailed,
    totalCancelled,
    batchStatus,
    isPaused,
    addFiles,
    removeFile,
    cancelFile,
    retryFile,
    pauseBatch,
    resumeBatch,
    clearCompleted,
    clearAll,
    reorderFiles,
  } = useBatchStore();

  // Get model and device from Whisper store (shared with single-file upload)
  const model = useWhisperStore((state) => state.model.model);
  const device = useWhisperStore((state) => state.model.device);
  const setModel = useWhisperStore((state) => state.setModel);

  // Handle model change
  const handleModelChange = useCallback((newModel: string) => {
    console.log('🔄 Batch: Model changed to:', newModel);
    setModel(newModel);
  }, [setModel]);

  // Debug: Log renders and state
  console.log(`🎨 BatchFileUpload render - files: ${files.length}, processing: ${processingCount}, completed: ${totalCompleted}`);

  // Initialize queue manager
  useEffect(() => {
    const init = async () => {
      const success = await batchQueueManager.initialize();
      if (success) {
        setIsInitialized(true);
        console.log('✅ Batch upload initialized');
      } else {
        console.error('❌ Failed to initialize batch upload');
      }
    };

    init();

    return () => {
      // Cleanup on unmount
      batchQueueManager.terminate();
    };
  }, []);

  // Start processing when files are added
  useEffect(() => {
    if (files.length > 0 && !isPaused && batchStatus !== 'completed') {
      batchQueueManager.start(() => {
        console.log('✅ Batch processing completed!');
        // Optional: Show notification
      });
    }
  }, [files, isPaused, batchStatus]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle file selection
  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      console.log('📥 handleFileSelect called with:', selectedFiles?.length || 0, 'files');

      if (!selectedFiles || selectedFiles.length === 0) {
        console.log('❌ No files selected, returning early');
        return;
      }

      const fileArray = Array.from(selectedFiles);
      console.log('📋 File array created:', fileArray.map(f => `${f.name} (${f.type}, ${f.size} bytes)`));

      // Check max batch size
      if (files.length + fileArray.length > MAX_BATCH_SIZE) {
        console.warn(`⚠️ Exceeded max batch size: ${files.length} + ${fileArray.length} > ${MAX_BATCH_SIZE}`);
        alert(`Maximum batch size is ${MAX_BATCH_SIZE} files. Current: ${files.length}`);
        return;
      }

      // Validate file types
      const validFiles = fileArray.filter((file) => {
        const isValid = ALLOWED_TYPES.some((type) => file.type.startsWith(type));
        if (!isValid) {
          console.warn(`⚠️ Skipping invalid file type: ${file.name} (${file.type})`);
        }
        return isValid;
      });

      console.log('✅ Valid files after type check:', validFiles.length, validFiles.map(f => f.name));

      if (validFiles.length === 0) {
        console.warn('❌ No valid audio/video files after filtering');
        alert('No valid audio/video files selected.');
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
        console.log('⚠️ Found duplicates:', foundDuplicates);
        const proceed = window.confirm(
          `Found ${foundDuplicates.length} duplicate file(s):\n${foundDuplicates.slice(0, 5).join('\n')}${foundDuplicates.length > 5 ? '\n...' : ''}\n\nDo you want to process them anyway?`
        );
        if (!proceed) {
          console.log('❌ User cancelled due to duplicates');
          return;
        }
      }

      // Add files to batch
      console.log('➕ Calling addFiles with', validFiles.length, 'files');
      addFiles(validFiles);
      console.log('✅ addFiles called successfully');

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [files.length, findDuplicateByFileName, addFiles]
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
      console.log('🎯 handleDrop triggered');
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFiles = e.dataTransfer.files;
      console.log('📦 Dropped files:', droppedFiles.length);
      handleFileSelect(droppedFiles);
    },
    [handleFileSelect]
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

  // Calculate progress
  const totalFiles = files.length;
  const overallProgress =
    totalFiles > 0 ? ((totalCompleted + totalFailed + totalCancelled) / totalFiles) * 100 : 0;

  const queuedFiles = files.filter((f) => f.status === 'queued');
  const processingFiles = files.filter((f) => f.status === 'processing');
  const completedFiles = files.filter((f) => f.status === 'completed');
  const errorFiles = files.filter((f) => f.status === 'error');
  const cancelledFiles = files.filter((f) => f.status === 'cancelled');

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Model Selector - Always visible at top */}
      <div className="mb-6 flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-1">Model Selection</h3>
          <p className="text-xs text-gray-500">
            Choose model for batch processing (affects all files)
          </p>
        </div>
        <ModelSelector
          disabled={processingCount > 0 || files.some(f => f.status === 'processing')}
          onModelChange={handleModelChange}
        />
      </div>

      {/* Current Model Info */}
      {model && (
        <div className="mb-4 text-sm text-gray-600 text-center">
          Using <span className="font-semibold">{AVAILABLE_MODELS[model]?.name || model}</span> on{' '}
          <span className="font-semibold uppercase">{device}</span>
        </div>
      )}

      {/* Drop Zone */}
      {files.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
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
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Drop files here or click to browse
            </h3>
            <p className="text-gray-500">
              Upload up to {MAX_BATCH_SIZE} audio or video files
            </p>
            <p className="text-sm text-gray-400 mt-2">
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
          className="bg-white rounded-lg shadow-sm p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Batch: {totalFiles} file{totalFiles !== 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-gray-600">
                {totalCompleted} completed • {processingCount} processing • {queuedFiles.length}{' '}
                queued
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
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  disabled={files.length >= MAX_BATCH_SIZE}
                >
                  Add More
                </button>
              )}
              {isPaused ? (
                <button
                  onClick={resumeBatch}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Resume
                </button>
              ) : (
                <button
                  onClick={pauseBatch}
                  className="px-4 py-2 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                  disabled={processingCount === 0 && queuedFiles.length === 0}
                >
                  Pause
                </button>
              )}
              <button
                onClick={clearCompleted}
                className="px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                disabled={completedFiles.length === 0}
              >
                Clear Completed
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to cancel all and clear the queue?')) {
                    batchQueueManager.cancelAll();
                  }
                }}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Cancel All
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <motion.div
              className="bg-blue-600 h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">{overallProgress.toFixed(1)}% complete</p>
        </motion.div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={files.map((f) => f.id)} strategy={verticalListSortingStrategy}>
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
                      // TODO: Navigate to transcript view
                      console.log('View transcript:', transcriptId);
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
      {!isInitialized && (
        <div className="text-center text-gray-500 mt-4">Initializing batch upload...</div>
      )}
    </div>
  );
}
