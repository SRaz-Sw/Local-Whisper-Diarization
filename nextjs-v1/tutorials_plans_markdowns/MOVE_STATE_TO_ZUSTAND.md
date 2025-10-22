# Migration Plan: Moving State to Zustand

## Executive Summary

The `WhisperDiarization` component currently manages **20+ state variables** using React's `useState` and `useRef`, leading to:
- Complex prop drilling
- Difficult state synchronization
- Hard-to-track data flow
- Ref-based workarounds (e.g., `isLoadingFromStorageRef`)
- Tightly coupled components

**Goal**: Migrate to Zustand for centralized, predictable state management.

---

## Current State Analysis

### Location: `WhisperDiarization.tsx`

#### 1. **Worker Management** (Keep as-is - Refs are appropriate)
```typescript
const worker = useRef<Worker | null>(null);
const onMessageReceivedRef = useRef<((e: MessageEvent) => void) | null>(null);
const onErrorRef = useRef<((error: ErrorEvent) => void) | null>(null);
```
**Decision**:  Keep as refs (DOM/worker references shouldn't be in global state)

---

#### 2. **Model Configuration State** � MOVE TO ZUSTAND
```typescript
const [status, setStatus] = useState<TranscriptionStatus>(null);
const [device, setDevice] = useState<DeviceType>("webgpu");
const [model, setModel] = useState<string>(DEFAULT_MODEL);
const [modelSize, setModelSize] = useState(77);
```
**Why Move**: Shared across multiple components, affects UI globally

---

#### 3. **Model Loading Progress** � MOVE TO ZUSTAND
```typescript
const [loadingMessage, setLoadingMessage] = useState("");
const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
```
**Why Move**: Displayed in multiple locations, needs centralized updates

---

#### 4. **Audio/Media State** � MOVE TO ZUSTAND
```typescript
const [audio, setAudio] = useState<Float32Array | null>(null);
const [audioFileName, setAudioFileName] = useState<string>("");
const [language, setLanguage] = useState("en");
const [currentTime, setCurrentTime] = useState(0);
```
**Why Move**: Shared between MediaFileUpload, WhisperTranscript, and parent

---

#### 5. **Transcription Results** � MOVE TO ZUSTAND
```typescript
const [result, setResult] = useState<TranscriptionResult | null>(null);
const [streamingWords, setStreamingWords] = useState<Array<{ text: string; timestamp: number }>>();
const [time, setTime] = useState<number | null>(null);
```
**Why Move**: Core app data, needs to persist across component lifecycle

---

#### 6. **Processing State** � MOVE TO ZUSTAND
```typescript
const [processingMessage, setProcessingMessage] = useState("");
const [processedSeconds, setProcessedSeconds] = useState(0);
const [totalSeconds, setTotalSeconds] = useState(0);
const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
```
**Why Move**: Progress tracking used by multiple components

---

#### 7. **UI State** � MOVE TO ZUSTAND
```typescript
const [isSaving, setIsSaving] = useState(false);
const isLoadingFromStorageRef = useRef(false); // L This is a code smell!
```
**Why Move**: `isLoadingFromStorageRef` as a ref is a workaround - should be proper state

---

#### 8. **Component Refs** � KEEP AS-IS
```typescript
const mediaInputRef = useRef<WhisperMediaInputRef>(null);
```
**Decision**:  Keep (imperative handle to DOM component)

---

#### 9. **Storage Hook State** � KEEP BUT SYNC WITH ZUSTAND
```typescript
const {
  save: saveTranscript,
  transcripts: savedTranscripts,
  loading: transcriptsLoading,
  remove: removeTranscript,
  getWithAudio,
} = useTranscripts();
```
**Decision**: Keep `useTranscripts` hook for CRUD operations, but sync metadata to Zustand for global access

**Integration Strategy**:
- `useTranscripts` remains the source of truth for storage operations (save, delete, update)
- After any storage operation, sync lightweight metadata to Zustand `storage` slice
- Components can access `savedTranscripts` from Zustand instead of prop drilling
- The hook's `transcripts` state syncs to store via `setSavedTranscripts()`

---

## Proposed Zustand Store Structure

### File: `src/app/web-transc/store/useWhisperStore.ts`

```typescript
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type {
  TranscriptionStatus,
  TranscriptionResult,
  ProgressItem,
  DeviceType,
} from '../types'

// ==================== Types ====================

interface AudioState {
  audio: Float32Array | null
  audioFileName: string
  language: string
  currentTime: number
}

interface ModelState {
  status: TranscriptionStatus
  device: DeviceType
  model: string
  modelSize: number
}

interface LoadingState {
  loadingMessage: string
  progressItems: ProgressItem[]
}

interface TranscriptionState {
  result: TranscriptionResult | null
  streamingWords: Array<{ text: string; timestamp: number }>
  generationTime: number | null
}

interface ProcessingState {
  processingMessage: string
  processedSeconds: number
  totalSeconds: number
  estimatedTimeRemaining: number | null
}

interface UIState {
  isSaving: boolean
  isLoadingFromStorage: boolean // Fix the ref workaround!
}

interface StorageState {
  savedTranscripts: Array<{
    id: string
    fileName: string
    duration: number
    updatedAt: number
  }>
  transcriptsLoading: boolean
}

// ==================== Store ====================

interface WhisperStore {
  // State slices
  audio: AudioState
  model: ModelState
  loading: LoadingState
  transcription: TranscriptionState
  processing: ProcessingState
  ui: UIState
  storage: StorageState

  // Audio actions
  setAudio: (audio: Float32Array | null) => void
  setAudioFileName: (fileName: string) => void
  setLanguage: (language: string) => void
  setCurrentTime: (time: number) => void

  // Model actions
  setStatus: (status: TranscriptionStatus) => void
  setDevice: (device: DeviceType) => void
  setModel: (model: string) => void
  setModelSize: (size: number) => void

  // Loading actions
  setLoadingMessage: (message: string) => void
  setProgressItems: (items: ProgressItem[]) => void
  addProgressItem: (item: ProgressItem) => void
  updateProgressItem: (file: string, updates: Partial<ProgressItem>) => void
  removeProgressItem: (file: string) => void

  // Transcription actions
  setResult: (result: TranscriptionResult | null) => void
  setStreamingWords: (words: Array<{ text: string; timestamp: number }>) => void
  addStreamingWord: (word: { text: string; timestamp: number }) => void
  clearStreamingWords: () => void
  setGenerationTime: (time: number | null) => void

  // Processing actions
  setProcessingMessage: (message: string) => void
  setProcessedSeconds: (seconds: number) => void
  setTotalSeconds: (seconds: number) => void
  setEstimatedTimeRemaining: (time: number | null) => void

  // UI actions
  setIsSaving: (saving: boolean) => void
  setIsLoadingFromStorage: (loading: boolean) => void

  // Storage actions
  setSavedTranscripts: (transcripts: StorageState['savedTranscripts']) => void
  setTranscriptsLoading: (loading: boolean) => void

  // Compound actions (orchestrate multiple state changes)
  reset: () => void
  resetForNewTranscription: () => void
  loadTranscriptFromStorage: (data: {
    result: TranscriptionResult
    fileName: string
    language: string
    model: string
  }) => void
}

// ==================== Initial State ====================

const initialAudioState: AudioState = {
  audio: null,
  audioFileName: '',
  language: 'en',
  currentTime: 0,
}

const initialModelState: ModelState = {
  status: null,
  device: 'webgpu',
  model: 'Xenova/whisper-tiny',
  modelSize: 77,
}

const initialLoadingState: LoadingState = {
  loadingMessage: '',
  progressItems: [],
}

const initialTranscriptionState: TranscriptionState = {
  result: null,
  streamingWords: [],
  generationTime: null,
}

const initialProcessingState: ProcessingState = {
  processingMessage: '',
  processedSeconds: 0,
  totalSeconds: 0,
  estimatedTimeRemaining: null,
}

const initialUIState: UIState = {
  isSaving: false,
  isLoadingFromStorage: false,
}

const initialStorageState: StorageState = {
  savedTranscripts: [],
  transcriptsLoading: false,
}

// ==================== Store Implementation ====================

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
          set((state) => ({ audio: { ...state.audio, audio } }), false, 'setAudio'),
        setAudioFileName: (fileName) =>
          set((state) => ({ audio: { ...state.audio, audioFileName: fileName } }), false, 'setAudioFileName'),
        setLanguage: (language) =>
          set((state) => ({ audio: { ...state.audio, language } }), false, 'setLanguage'),
        setCurrentTime: (time) =>
          set((state) => ({ audio: { ...state.audio, currentTime: time } }), false, 'setCurrentTime'),

        // Model actions
        setStatus: (status) =>
          set((state) => ({ model: { ...state.model, status } }), false, 'setStatus'),
        setDevice: (device) =>
          set((state) => ({ model: { ...state.model, device } }), false, 'setDevice'),
        setModel: (model) =>
          set((state) => ({ model: { ...state.model, model } }), false, 'setModel'),
        setModelSize: (size) =>
          set((state) => ({ model: { ...state.model, modelSize: size } }), false, 'setModelSize'),

        // Loading actions
        setLoadingMessage: (message) =>
          set((state) => ({ loading: { ...state.loading, loadingMessage: message } }), false, 'setLoadingMessage'),
        setProgressItems: (items) =>
          set((state) => ({ loading: { ...state.loading, progressItems: items } }), false, 'setProgressItems'),
        addProgressItem: (item) =>
          set(
            (state) => ({
              loading: { ...state.loading, progressItems: [...state.loading.progressItems, item] },
            }),
            false,
            'addProgressItem'
          ),
        updateProgressItem: (file, updates) =>
          set(
            (state) => ({
              loading: {
                ...state.loading,
                progressItems: state.loading.progressItems.map((item) =>
                  item.file === file ? { ...item, ...updates } : item
                ),
              },
            }),
            false,
            'updateProgressItem'
          ),
        removeProgressItem: (file) =>
          set(
            (state) => ({
              loading: {
                ...state.loading,
                progressItems: state.loading.progressItems.filter((item) => item.file !== file),
              },
            }),
            false,
            'removeProgressItem'
          ),

        // Transcription actions
        setResult: (result) =>
          set((state) => ({ transcription: { ...state.transcription, result } }), false, 'setResult'),
        setStreamingWords: (words) =>
          set((state) => ({ transcription: { ...state.transcription, streamingWords: words } }), false, 'setStreamingWords'),
        addStreamingWord: (word) =>
          set(
            (state) => ({
              transcription: { ...state.transcription, streamingWords: [...state.transcription.streamingWords, word] },
            }),
            false,
            'addStreamingWord'
          ),
        clearStreamingWords: () =>
          set((state) => ({ transcription: { ...state.transcription, streamingWords: [] } }), false, 'clearStreamingWords'),
        setGenerationTime: (time) =>
          set((state) => ({ transcription: { ...state.transcription, generationTime: time } }), false, 'setGenerationTime'),

        // Processing actions
        setProcessingMessage: (message) =>
          set((state) => ({ processing: { ...state.processing, processingMessage: message } }), false, 'setProcessingMessage'),
        setProcessedSeconds: (seconds) =>
          set((state) => ({ processing: { ...state.processing, processedSeconds: seconds } }), false, 'setProcessedSeconds'),
        setTotalSeconds: (seconds) =>
          set((state) => ({ processing: { ...state.processing, totalSeconds: seconds } }), false, 'setTotalSeconds'),
        setEstimatedTimeRemaining: (time) =>
          set((state) => ({ processing: { ...state.processing, estimatedTimeRemaining: time } }), false, 'setEstimatedTimeRemaining'),

        // UI actions
        setIsSaving: (saving) =>
          set((state) => ({ ui: { ...state.ui, isSaving: saving } }), false, 'setIsSaving'),
        setIsLoadingFromStorage: (loading) =>
          set((state) => ({ ui: { ...state.ui, isLoadingFromStorage: loading } }), false, 'setIsLoadingFromStorage'),

        // Storage actions
        setSavedTranscripts: (transcripts) =>
          set((state) => ({ storage: { ...state.storage, savedTranscripts: transcripts } }), false, 'setSavedTranscripts'),
        setTranscriptsLoading: (loading) =>
          set((state) => ({ storage: { ...state.storage, transcriptsLoading: loading } }), false, 'setTranscriptsLoading'),

        // Compound actions
        reset: () =>
          set(
            {
              audio: initialAudioState,
              model: { ...initialModelState, status: null }, // Keep device/model selection
              loading: initialLoadingState,
              transcription: initialTranscriptionState,
              processing: initialProcessingState,
              ui: initialUIState,
            },
            false,
            'reset'
          ),

        resetForNewTranscription: () =>
          set(
            (state) => ({
              transcription: initialTranscriptionState,
              processing: initialProcessingState,
              loading: initialLoadingState,
            }),
            false,
            'resetForNewTranscription'
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
            'loadTranscriptFromStorage'
          ),
      }),
      {
        name: 'whisper-storage', // localStorage key
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
      }
    )
  )
)

// ==================== Selectors ====================
// Use these to subscribe to specific slices and avoid unnecessary re-renders

export const useAudioState = () => useWhisperStore((state) => state.audio)
export const useModelState = () => useWhisperStore((state) => state.model)
export const useLoadingState = () => useWhisperStore((state) => state.loading)
export const useTranscriptionState = () => useWhisperStore((state) => state.transcription)
export const useProcessingState = () => useWhisperStore((state) => state.processing)
export const useUIState = () => useWhisperStore((state) => state.ui)
export const useStorageState = () => useWhisperStore((state) => state.storage)

// Granular selectors for specific values
export const useStatus = () => useWhisperStore((state) => state.model.status)
export const useAudio = () => useWhisperStore((state) => state.audio.audio)
export const useResult = () => useWhisperStore((state) => state.transcription.result)
export const useIsLoadingFromStorage = () => useWhisperStore((state) => state.ui.isLoadingFromStorage)
```

---

## Migration Strategy

### Phase 1: Setup (1 hour)
1.  Install Zustand: `npm install zustand`
2.  Create store file: `src/app/web-transc/store/useWhisperStore.ts`
3.  Copy structure above and adjust types/imports
4.  Add devtools middleware for debugging

### Phase 2: Migrate Core State (2-3 hours)
Migrate in this order (least � most impactful):

#### Step 1: Model State
- Replace `status`, `device`, `model`, `modelSize` with Zustand
- Update `ModelSelector` component
- Test model switching

#### Step 2: Loading State
- Replace `loadingMessage`, `progressItems`
- Update `WhisperProgress` component
- Test loading UI

#### Step 3: Processing State
- Replace `processingMessage`, `processedSeconds`, etc.
- Update progress display
- Test worker message handlers

#### Step 4: Audio State
- Replace `audio`, `audioFileName`, `language`, `currentTime`
- Update `MediaFileUpload` component
- Test audio loading/playback

#### Step 5: Transcription State
- Replace `result`, `streamingWords`, `time`
- Update `WhisperTranscript` component
- Update `StreamingTranscript` component
- Test transcription flow

#### Step 6: UI State
- Replace `isSaving`, `isLoadingFromStorageRef` (fix the ref workaround!)
- Test save/load from storage

### Phase 3: Worker Integration (1-2 hours)
Update worker message handlers to dispatch to Zustand:

```typescript
// Before
case "progress":
  setProgressItems((prev) => prev.map(...))
  break

// After
case "progress":
  useWhisperStore.getState().updateProgressItem(e.data.file, e.data)
  break
```

### Phase 4: Cleanup & Storage Integration (1-2 hours)
1. Remove old useState declarations
2. Remove prop drilling (props no longer needed)
3. Simplify component interfaces
4. Update TypeScript types
5. **Integrate `useTranscripts` with Zustand**:
   ```typescript
   // In WhisperDiarization component
   const { transcripts, loading, ...transcriptActions } = useTranscripts()
   const { setSavedTranscripts, setTranscriptsLoading } = useWhisperStore()

   // Sync to Zustand whenever transcripts change
   useEffect(() => {
     setSavedTranscripts(
       transcripts.map(t => ({
         id: t.id,
         fileName: t.metadata.fileName,
         duration: t.metadata.duration,
         updatedAt: t.metadata.updatedAt,
       }))
     )
     setTranscriptsLoading(loading)
   }, [transcripts, loading])
   ```
6. Update child components to read from Zustand instead of receiving props

### Phase 5: Testing (1-2 hours)
1. Test complete transcription flow
2. Test save/load from storage
3. Test model switching
4. Test error handling
5. Test browser refresh (persistence)

---

## Benefits After Migration

### 1. **No More Prop Drilling**
```typescript
// Before
<WhisperTranscript
  transcript={result.transcript}
  segments={result.segments}
  currentTime={currentTime}
  setCurrentTime={setCurrentTime}
/>

// After
<WhisperTranscript />  // Gets state from Zustand internally
```

### 2. **No More Ref Workarounds**
```typescript
// Before
const isLoadingFromStorageRef = useRef(false)  // L Code smell

// After
const { isLoadingFromStorage, setIsLoadingFromStorage } = useUIState()  //  Proper state
```

### 3. **Better DevTools**
- Time-travel debugging
- State inspection
- Action logging

### 4. **Easier Testing**
```typescript
// Can test store logic independently
import { useWhisperStore } from './store/useWhisperStore'

test('should update progress', () => {
  const store = useWhisperStore.getState()
  store.addProgressItem({ file: 'test.mp3', progress: 50 })
  expect(store.loading.progressItems).toHaveLength(1)
})
```

### 5. **Performance**
- Components only re-render when their specific slice changes
- Use selectors to subscribe to minimal state

### 6. **State Persistence**
- User preferences automatically saved to localStorage
- Survives page refresh

---

## Migration Checklist

- [ ] Phase 1: Setup Zustand store
- [ ] Phase 2.1: Migrate Model State
- [ ] Phase 2.2: Migrate Loading State
- [ ] Phase 2.3: Migrate Processing State
- [ ] Phase 2.4: Migrate Audio State
- [ ] Phase 2.5: Migrate Transcription State
- [ ] Phase 2.6: Migrate UI State
- [ ] Phase 3: Update Worker Integration
- [ ] Phase 4: Cleanup old state
- [ ] Phase 5: Testing
- [ ] Documentation update

---

## Estimated Time

- **Total**: 8-10 hours
- **Can be done incrementally** (state-by-state migration)
- **No breaking changes** (can migrate gradually)

---

## Notes

1. **Keep refs for:**
   - DOM elements (`mediaInputRef`)
   - Worker instances
   - Callback functions

2. **Move to Zustand:**
   - All React state (`useState`)
   - Ref workarounds (`isLoadingFromStorageRef`)

3. **Storage hooks:**
   - Keep `useTranscripts`, `useTemplates` hooks
   - Sync lightweight metadata to Zustand for global access
   - Hook remains source of truth for CRUD operations

4. **Worker:**
   - Keep as ref
   - Dispatch actions to Zustand from message handlers

5. **Type Safety:**
   - `TranscriptionStatus` is already strictly typed: `null | "loading" | "ready" | "running"`
   - `DeviceType` is already strictly typed: `"webgpu" | "wasm"`
   - All state updates are type-safe via TypeScript
