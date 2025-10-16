"use client";

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type {
  TranscriptionStatus,
  TranscriptionResult,
  ProgressItem,
  DeviceType,
} from "../types";

// ==================== Types ====================

interface AudioState {
  audio: Float32Array | null;
  audioFileName: string;
  language: string;
  currentTime: number;
}

interface ModelState {
  status: TranscriptionStatus;
  device: DeviceType;
  model: string;
  modelSize: number;
}

interface LoadingState {
  loadingMessage: string;
  progressItems: ProgressItem[];
}

interface TranscriptionState {
  result: TranscriptionResult | null;
  streamingWords: Array<{ text: string; timestamp: number }>;
  generationTime: number | null;
  speakerNames: Record<string, string> | null; // Custom speaker names
  currentTranscriptId: string | null; // ID of currently loaded transcript
}

interface ProcessingState {
  processingMessage: string;
  processedSeconds: number;
  totalSeconds: number;
  estimatedTimeRemaining: number | null;
}

interface UIState {
  isSaving: boolean;
  isLoadingFromStorage: boolean; // Fix the ref workaround!
}

interface StorageState {
  savedTranscripts: Array<{
    id: string;
    fileName: string;
    duration: number;
    updatedAt: number;
  }>;
  transcriptsLoading: boolean;
}

// ==================== Store ====================

interface WhisperStore {
  // State slices
  audio: AudioState;
  model: ModelState;
  loading: LoadingState;
  transcription: TranscriptionState;
  processing: ProcessingState;
  ui: UIState;
  storage: StorageState;

  // Audio actions
  setAudio: (audio: Float32Array | null) => void;
  setAudioFileName: (fileName: string) => void;
  setLanguage: (language: string) => void;
  setCurrentTime: (time: number) => void;

  // Model actions
  setStatus: (status: TranscriptionStatus) => void;
  setDevice: (device: DeviceType) => void;
  setModel: (model: string) => void;
  setModelSize: (size: number) => void;

  // Loading actions
  setLoadingMessage: (message: string) => void;
  setProgressItems: (items: ProgressItem[]) => void;
  addProgressItem: (item: ProgressItem) => void;
  updateProgressItem: (
    file: string,
    updates: Partial<ProgressItem>,
  ) => void;
  removeProgressItem: (file: string) => void;

  // Transcription actions
  setResult: (result: TranscriptionResult | null) => void;
  setStreamingWords: (
    words: Array<{ text: string; timestamp: number }>,
  ) => void;
  addStreamingWord: (word: { text: string; timestamp: number }) => void;
  clearStreamingWords: () => void;
  setGenerationTime: (time: number | null) => void;
  setSpeakerNames: (speakerNames: Record<string, string> | null) => void;
  setCurrentTranscriptId: (id: string | null) => void;

  // Processing actions
  setProcessingMessage: (message: string) => void;
  setProcessedSeconds: (seconds: number) => void;
  setTotalSeconds: (seconds: number) => void;
  setEstimatedTimeRemaining: (time: number | null) => void;

  // UI actions
  setIsSaving: (saving: boolean) => void;
  setIsLoadingFromStorage: (loading: boolean) => void;

  // Storage actions
  setSavedTranscripts: (
    transcripts: StorageState["savedTranscripts"],
  ) => void;
  setTranscriptsLoading: (loading: boolean) => void;

  // Compound actions (orchestrate multiple state changes)
  reset: () => void;
  resetForNewTranscription: () => void;
  loadTranscriptFromStorage: (data: {
    result: TranscriptionResult;
    fileName: string;
    language: string;
    model: string;
  }) => void;
}

// ==================== Initial State ====================

const DEFAULT_MODEL = "Xenova/whisper-tiny";

const initialAudioState: AudioState = {
  audio: null,
  audioFileName: "",
  language: "en",
  currentTime: 0,
};

const initialModelState: ModelState = {
  status: null,
  device: "webgpu",
  model: DEFAULT_MODEL,
  modelSize: 77,
};

const initialLoadingState: LoadingState = {
  loadingMessage: "",
  progressItems: [],
};

const initialTranscriptionState: TranscriptionState = {
  result: null,
  streamingWords: [],
  generationTime: null,
  speakerNames: null,
  currentTranscriptId: null,
};

const initialProcessingState: ProcessingState = {
  processingMessage: "",
  processedSeconds: 0,
  totalSeconds: 0,
  estimatedTimeRemaining: null,
};

const initialUIState: UIState = {
  isSaving: false,
  isLoadingFromStorage: false,
};

const initialStorageState: StorageState = {
  savedTranscripts: [],
  transcriptsLoading: false,
};

// ==================== Store Implementation ====================

// Debounce helper for null values
let nullTimeoutRef: NodeJS.Timeout | null = null;

export const useWhisperStore = create<WhisperStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        audio: initialAudioState,
        model: initialModelState,
        loading: initialLoadingState,
        transcription: initialTranscriptionState,
        processing: initialProcessingState,
        ui: initialUIState,
        storage: initialStorageState,

        // Audio actions
        setAudio: (audio) =>
          set(
            (state) => ({ audio: { ...state.audio, audio } }),
            false,
            "setAudio",
          ),
        setAudioFileName: (fileName) =>
          set(
            (state) => ({
              audio: { ...state.audio, audioFileName: fileName },
            }),
            false,
            "setAudioFileName",
          ),
        setLanguage: (language) =>
          set(
            (state) => ({ audio: { ...state.audio, language } }),
            false,
            "setLanguage",
          ),
        setCurrentTime: (time) =>
          set(
            (state) => ({ audio: { ...state.audio, currentTime: time } }),
            false,
            "setCurrentTime",
          ),

        // Model actions
        setStatus: (status) =>
          set(
            (state) => ({ model: { ...state.model, status } }),
            false,
            "setStatus",
          ),
        setDevice: (device) =>
          set(
            (state) => ({ model: { ...state.model, device } }),
            false,
            "setDevice",
          ),
        setModel: (model) =>
          set(
            (state) => ({ model: { ...state.model, model } }),
            false,
            "setModel",
          ),
        setModelSize: (size) =>
          set(
            (state) => ({ model: { ...state.model, modelSize: size } }),
            false,
            "setModelSize",
          ),

        // Loading actions
        setLoadingMessage: (message) =>
          set(
            (state) => ({
              loading: { ...state.loading, loadingMessage: message },
            }),
            false,
            "setLoadingMessage",
          ),
        setProgressItems: (items) =>
          set(
            (state) => ({
              loading: { ...state.loading, progressItems: items },
            }),
            false,
            "setProgressItems",
          ),
        addProgressItem: (item) =>
          set(
            (state) => ({
              loading: {
                ...state.loading,
                progressItems: [...state.loading.progressItems, item],
              },
            }),
            false,
            "addProgressItem",
          ),
        updateProgressItem: (file, updates) =>
          set(
            (state) => ({
              loading: {
                ...state.loading,
                progressItems: state.loading.progressItems.map((item) =>
                  item.file === file ? { ...item, ...updates } : item,
                ),
              },
            }),
            false,
            "updateProgressItem",
          ),
        removeProgressItem: (file) =>
          set(
            (state) => ({
              loading: {
                ...state.loading,
                progressItems: state.loading.progressItems.filter(
                  (item) => item.file !== file,
                ),
              },
            }),
            false,
            "removeProgressItem",
          ),

        // Transcription actions
        setResult: (result) =>
          set(
            (state) => ({
              transcription: { ...state.transcription, result },
            }),
            false,
            "setResult",
          ),
        setStreamingWords: (words) =>
          set(
            (state) => ({
              transcription: {
                ...state.transcription,
                streamingWords: words,
              },
            }),
            false,
            "setStreamingWords",
          ),
        addStreamingWord: (word) =>
          set(
            (state) => ({
              transcription: {
                ...state.transcription,
                streamingWords: [
                  ...state.transcription.streamingWords,
                  word,
                ],
              },
            }),
            false,
            "addStreamingWord",
          ),
        clearStreamingWords: () =>
          set(
            (state) => ({
              transcription: {
                ...state.transcription,
                streamingWords: [],
              },
            }),
            false,
            "clearStreamingWords",
          ),
        setGenerationTime: (time) =>
          set(
            (state) => ({
              transcription: {
                ...state.transcription,
                generationTime: time,
              },
            }),
            false,
            "setGenerationTime",
          ),
        setSpeakerNames: (speakerNames) =>
          set(
            (state) => ({
              transcription: {
                ...state.transcription,
                speakerNames,
              },
            }),
            false,
            "setSpeakerNames",
          ),
        setCurrentTranscriptId: (id) =>
          set(
            (state) => ({
              transcription: {
                ...state.transcription,
                currentTranscriptId: id,
              },
            }),
            false,
            "setCurrentTranscriptId",
          ),

        // Processing actions
        setProcessingMessage: (message) =>
          set(
            (state) => ({
              processing: {
                ...state.processing,
                processingMessage: message,
              },
            }),
            false,
            "setProcessingMessage",
          ),
        setProcessedSeconds: (seconds) =>
          set(
            (state) => ({
              processing: {
                ...state.processing,
                processedSeconds: seconds,
              },
            }),
            false,
            "setProcessedSeconds",
          ),
        setTotalSeconds: (seconds) =>
          set(
            (state) => ({
              processing: { ...state.processing, totalSeconds: seconds },
            }),
            false,
            "setTotalSeconds",
          ),

        // setEstimatedTimeRemaining: (time) =>
        //   set(
        //     (state) => ({
        //       processing: {
        //         ...state.processing,
        //         estimatedTimeRemaining: time,
        //       },
        //     }),
        //     false,
        //     "setEstimatedTimeRemaining"
        //   ),
        // Debounced version of setEstimatedTimeRemaining
        setEstimatedTimeRemaining: (time) => {
          if (time === null) {
            // Clear any existing timeout
            if (nullTimeoutRef) clearTimeout(nullTimeoutRef);

            // Debounce null values
            nullTimeoutRef = setTimeout(() => {
              set(
                (state) => ({
                  processing: {
                    ...state.processing,
                    estimatedTimeRemaining: null,
                  },
                }),
                false,
                "setEstimatedTimeRemaining",
              );
              nullTimeoutRef = null;
            }, 300);
          } else {
            // Cancel pending null update and set immediately
            if (nullTimeoutRef) {
              clearTimeout(nullTimeoutRef);
              nullTimeoutRef = null;
            }

            set(
              (state) => ({
                processing: {
                  ...state.processing,
                  estimatedTimeRemaining: time,
                },
              }),
              false,
              "setEstimatedTimeRemaining",
            );
          }
        },

        // UI actions
        setIsSaving: (saving) =>
          set(
            (state) => ({ ui: { ...state.ui, isSaving: saving } }),
            false,
            "setIsSaving",
          ),
        setIsLoadingFromStorage: (loading) =>
          set(
            (state) => ({
              ui: { ...state.ui, isLoadingFromStorage: loading },
            }),
            false,
            "setIsLoadingFromStorage",
          ),

        // Storage actions
        setSavedTranscripts: (transcripts) =>
          set(
            (state) => ({
              storage: { ...state.storage, savedTranscripts: transcripts },
            }),
            false,
            "setSavedTranscripts",
          ),
        setTranscriptsLoading: (loading) =>
          set(
            (state) => ({
              storage: { ...state.storage, transcriptsLoading: loading },
            }),
            false,
            "setTranscriptsLoading",
          ),

        // Compound actions
        reset: () =>
          set(
            {
              audio: initialAudioState,
              model: { ...get().model, status: null }, // Keep device/model selection
              loading: initialLoadingState,
              transcription: initialTranscriptionState,
              processing: initialProcessingState,
              ui: initialUIState,
            },
            false,
            "reset",
          ),

        resetForNewTranscription: () =>
          set(
            {
              transcription: initialTranscriptionState,
              processing: initialProcessingState,
              loading: initialLoadingState,
            },
            false,
            "resetForNewTranscription",
          ),

        loadTranscriptFromStorage: (data) =>
          set(
            (state) => ({
              transcription: {
                result: data.result,
                streamingWords: [],
                generationTime: 0,
              },
              audio: {
                ...state.audio,
                audioFileName: data.fileName,
                language: data.language,
              },
              model: {
                ...state.model,
                model: data.model,
              },
              ui: {
                ...state.ui,
                isLoadingFromStorage: true,
              },
            }),
            false,
            "loadTranscriptFromStorage",
          ),
      }),
      {
        name: "whisper-storage", // localStorage key
        partialize: (state) => ({
          // Only persist user preferences, not runtime state
          model: {
            device: state.model.device,
            model: state.model.model,
          },
          audio: {
            language: state.audio.language,
          },
        }),
      },
    ),
  ),
);

// ==================== Selectors ====================
// Use these to subscribe to specific slices and avoid unnecessary re-renders

export const useAudioState = () => useWhisperStore((state) => state.audio);
export const useModelState = () => useWhisperStore((state) => state.model);
export const useLoadingState = () =>
  useWhisperStore((state) => state.loading);
export const useTranscriptionState = () =>
  useWhisperStore((state) => state.transcription);
export const useProcessingState = () =>
  useWhisperStore((state) => state.processing);
export const useUIState = () => useWhisperStore((state) => state.ui);
export const useStorageState = () =>
  useWhisperStore((state) => state.storage);

// Granular selectors for specific values
export const useStatus = () =>
  useWhisperStore((state) => state.model.status);
export const useAudio = () =>
  useWhisperStore((state) => state.audio.audio);
export const useResult = () =>
  useWhisperStore((state) => state.transcription.result);
export const useIsLoadingFromStorage = () =>
  useWhisperStore((state) => state.ui.isLoadingFromStorage);
