import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BatchFile {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  status: 'queued' | 'processing' | 'completed' | 'error' | 'cancelled';
  progress: number;
  error?: string;
  transcriptId?: string;
  startedAt?: string;
  completedAt?: string;
  retryCount: number;
  estimatedTimeRemaining?: number | null; // in seconds
}

interface BatchState {
  files: BatchFile[];
  processingCount: number;
  totalCompleted: number;
  totalFailed: number;
  totalCancelled: number;
  batchStatus: 'idle' | 'processing' | 'paused' | 'completed';
  isPaused: boolean;
}

interface BatchActions {
  addFiles: (files: File[]) => void;
  removeFile: (fileId: string) => void;
  cancelFile: (fileId: string) => void;
  retryFile: (fileId: string) => void;
  pauseBatch: () => void;
  resumeBatch: () => void;
  clearCompleted: () => void;
  clearAll: () => void;
  reorderFiles: (fileId: string, newIndex: number) => void;
  updateFileProgress: (fileId: string, progress: number) => void;
  updateFileEstimatedTime: (fileId: string, estimatedTime: number | null) => void;
  setFileStatus: (
    fileId: string,
    status: BatchFile['status'],
    error?: string,
    transcriptId?: string
  ) => void;
  incrementProcessingCount: () => void;
  decrementProcessingCount: () => void;
  getQueuedFiles: () => BatchFile[];
  getProcessingFiles: () => BatchFile[];
  canStartProcessing: () => boolean;
}

type BatchStore = BatchState & BatchActions;

// Helper to generate UUID
const generateId = () => crypto.randomUUID();

// Helper to serialize File objects for persistence
const serializeBatchFile = (batchFile: BatchFile): any => {
  const { file, ...rest } = batchFile;
  return {
    ...rest,
    // Store minimal file info for reload
    fileData: {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    },
  };
};

// Helper to check if we can deserialize a file (file still exists)
const deserializeBatchFile = (serialized: any): BatchFile | null => {
  // Note: We can't fully restore File objects from localStorage
  // Files that were processing or queued should be marked as cancelled since we can't restore the actual file
  if (serialized.status === 'processing' || serialized.status === 'queued') {
    serialized.status = 'cancelled';
    serialized.progress = 0;
    serialized.error = 'Session interrupted - file needs to be re-uploaded';
    serialized.completedAt = new Date().toISOString();
  }

  // Create a placeholder File object (just for display purposes)
  const placeholderFile = new File([], serialized.fileData.name, {
    type: serialized.fileData.type,
    lastModified: serialized.fileData.lastModified,
  });

  return {
    ...serialized,
    file: placeholderFile,
  };
};

export const useBatchStore = create<BatchStore>()((set, get) => ({
  // Initial state
  files: [],
  processingCount: 0,
  totalCompleted: 0,
  totalFailed: 0,
  totalCancelled: 0,
  batchStatus: 'idle',
  isPaused: false,

      // Actions
      addFiles: (newFiles: File[]) => {
        console.log('🏪 STORE addFiles called with:', newFiles.length, 'files');
        const currentFiles = get().files;
        const totalCount = currentFiles.length + newFiles.length;

        console.log('📊 Current files in store:', currentFiles.length);
        console.log('📊 Total count after add:', totalCount);

        // Check max batch size
        if (totalCount > 50) {
          console.warn(`❌ Cannot add ${newFiles.length} files. Max batch size is 50. Current: ${currentFiles.length}`);
          return;
        }

        // Check for duplicates within new files
        const fileNameSet = new Set(newFiles.map(f => f.name.toLowerCase()));
        if (fileNameSet.size !== newFiles.length) {
          console.warn('⚠️ Duplicate files detected within selection');
          // Remove duplicates from newFiles
          const uniqueFiles: File[] = [];
          const seen = new Set<string>();
          newFiles.forEach(f => {
            const key = f.name.toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              uniqueFiles.push(f);
            }
          });
          newFiles = uniqueFiles;
          console.log('✅ After deduplication:', newFiles.length, 'unique files');
        }

        // Create batch file entries
        const batchFiles: BatchFile[] = newFiles.map(file => ({
          id: generateId(),
          file,
          fileName: file.name,
          fileSize: file.size,
          status: 'queued',
          progress: 0,
          retryCount: 0,
        }));

        console.log('✅ Created batch file entries:', batchFiles.map(bf => `${bf.fileName} (${bf.id})`));

        set(state => ({
          files: [...state.files, ...batchFiles],
          batchStatus: state.batchStatus === 'idle' ? 'processing' : state.batchStatus,
        }));

        console.log('✅ Store updated. New file count:', get().files.length);
      },

      removeFile: (fileId: string) => {
        set(state => {
          const file = state.files.find(f => f.id === fileId);
          if (!file) return state;

          // Can only remove queued, completed, error, or cancelled files
          if (file.status === 'processing') {
            console.warn('Cannot remove file that is currently processing. Cancel it first.');
            return state;
          }

          const newFiles = state.files.filter(f => f.id !== fileId);

          return {
            files: newFiles,
            batchStatus: newFiles.length === 0 ? 'idle' : state.batchStatus,
          };
        });
      },

      cancelFile: (fileId: string) => {
        set(state => {
          const file = state.files.find(f => f.id === fileId);
          if (!file) return state;

          // Update file status
          const newFiles = state.files.map(f =>
            f.id === fileId
              ? { ...f, status: 'cancelled' as const, completedAt: new Date().toISOString() }
              : f
          );

          // Decrement processing count if it was processing
          const wasProcessing = file.status === 'processing';

          return {
            files: newFiles,
            processingCount: wasProcessing ? state.processingCount - 1 : state.processingCount,
            totalCancelled: state.totalCancelled + 1,
          };
        });
      },

      retryFile: (fileId: string) => {
        set(state => {
          const file = state.files.find(f => f.id === fileId);
          if (!file || file.status !== 'error') return state;

          // Check retry limit
          if (file.retryCount >= 3) {
            console.warn('Max retry attempts (3) reached for file:', file.fileName);
            return state;
          }

          const newFiles = state.files.map(f =>
            f.id === fileId
              ? {
                  ...f,
                  status: 'queued' as const,
                  progress: 0,
                  error: undefined,
                  retryCount: f.retryCount + 1,
                }
              : f
          );

          return {
            files: newFiles,
            totalFailed: state.totalFailed - 1,
            batchStatus: 'processing',
          };
        });
      },

      pauseBatch: () => {
        set({ isPaused: true, batchStatus: 'paused' });
      },

      resumeBatch: () => {
        set({ isPaused: false, batchStatus: 'processing' });
      },

      clearCompleted: () => {
        set(state => ({
          files: state.files.filter(f => f.status !== 'completed'),
          totalCompleted: 0,
        }));
      },

      clearAll: () => {
        set({
          files: [],
          processingCount: 0,
          totalCompleted: 0,
          totalFailed: 0,
          totalCancelled: 0,
          batchStatus: 'idle',
          isPaused: false,
        });
      },

      reorderFiles: (fileId: string, newIndex: number) => {
        set(state => {
          const files = [...state.files];
          const currentIndex = files.findIndex(f => f.id === fileId);

          if (currentIndex === -1 || currentIndex === newIndex) {
            return state;
          }

          // Can only reorder queued files
          const file = files[currentIndex];
          if (file.status !== 'queued') {
            console.warn('Can only reorder queued files');
            return state;
          }

          // Remove from current position and insert at new position
          files.splice(currentIndex, 1);
          files.splice(newIndex, 0, file);

          return { files };
        });
      },

      updateFileProgress: (fileId: string, progress: number) => {
        set(state => ({
          files: state.files.map(f =>
            f.id === fileId ? { ...f, progress: Math.min(100, Math.max(0, progress)) } : f
          ),
        }));
      },

      updateFileEstimatedTime: (fileId: string, estimatedTime: number | null) => {
        set(state => ({
          files: state.files.map(f =>
            f.id === fileId ? { ...f, estimatedTimeRemaining: estimatedTime } : f
          ),
        }));
      },

      setFileStatus: (fileId: string, status: BatchFile['status'], error?: string, transcriptId?: string) => {
        set(state => {
          const file = state.files.find(f => f.id === fileId);
          if (!file) return state;

          const now = new Date().toISOString();
          const updates: Partial<BatchFile> = {
            status,
            error,
            transcriptId,
          };

          if (status === 'processing' && file.status !== 'processing') {
            updates.startedAt = now;
          }

          if (status === 'completed' || status === 'error' || status === 'cancelled') {
            updates.completedAt = now;
          }

          const newFiles = state.files.map(f => (f.id === fileId ? { ...f, ...updates } : f));

          // Update counters
          let totalCompleted = state.totalCompleted;
          let totalFailed = state.totalFailed;

          if (status === 'completed' && file.status !== 'completed') {
            totalCompleted++;
          }
          if (status === 'error' && file.status !== 'error') {
            totalFailed++;
          }

          // Check if batch is complete
          const hasQueued = newFiles.some(f => f.status === 'queued');
          const hasProcessing = newFiles.some(f => f.status === 'processing');
          const batchStatus = !hasQueued && !hasProcessing ? 'completed' : state.batchStatus;

          return {
            files: newFiles,
            totalCompleted,
            totalFailed,
            batchStatus,
          };
        });
      },

      incrementProcessingCount: () => {
        set(state => ({
          processingCount: Math.min(2, state.processingCount + 1),
        }));
      },

      decrementProcessingCount: () => {
        set(state => ({
          processingCount: Math.max(0, state.processingCount - 1),
        }));
      },

      getQueuedFiles: () => {
        return get().files.filter(f => f.status === 'queued');
      },

      getProcessingFiles: () => {
        return get().files.filter(f => f.status === 'processing');
      },

      canStartProcessing: () => {
        const state = get();
        return (
          !state.isPaused &&
          state.processingCount < 2 &&
          state.getQueuedFiles().length > 0
        );
      },
}));
