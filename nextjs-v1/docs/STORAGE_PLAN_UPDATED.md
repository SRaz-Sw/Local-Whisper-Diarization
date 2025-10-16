# Streamlined Storage Architecture Plan (Updated with API & Zustand Integration)

## Overview

This document outlines the complete unified storage system that integrates:
- **Local Storage** (IndexedDB) for offline-first functionality
- **External API** (optional sync when online)
- **Zustand** for reactive UI state management
- **TanStack Query** for server state and caching

The system works seamlessly in both Web and Electron modes.

---

## Architecture Design

### Core Principles

1. **Single Source of Truth**: One API for all storage operations
2. **Environment Adaptive**: Automatically use best storage method for environment
3. **Type Safe**: Full TypeScript support with generics
4. **Resource Oriented**: Dedicated hooks for each data type (transcripts, templates, etc.)
5. **Separation of Concerns**: Storage logic separate from UI logic
6. **Offline-First**: Local storage as primary, sync with API when available (optional)
7. **Reactive State**: Zustand for global UI state, TanStack Query for server state
8. **Clear Boundaries**: Distinguish between local-only data and sync-able data

---

## Complete Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    React Components                          │
│               (WhisperDiarization, etc.)                     │
└──────────────┬────────────────────────┬──────────────────────┘
               │                        │
               ▼                        ▼
    ┌──────────────────┐    ┌──────────────────────┐
    │  Zustand Stores  │    │  TanStack Query      │
    │  (UI State)      │    │  (Server State)      │
    │                  │    │                      │
    │ • Modal state    │    │ • API data cache     │
    │ • Selection      │    │ • Optimistic updates │
    │ • Form state     │    │ • Sync status        │
    │ • Temp data      │    │ • Invalidation       │
    └──────────────────┘    └──────────┬───────────┘
                                       │
                                       ▼
               ┌────────────────────────────────────────┐
               │     Resource-Specific Hooks            │
               │  • useTranscripts()  • useTemplates()  │
               │  • useAudioFiles()   • useSettings()   │
               │                                        │
               │  (Combines local storage + API sync)  │
               └────────────┬───────────────────────────┘
                            │
                            ▼
          ┌─────────────────────────────────────────────┐
          │        Unified Storage Manager               │
          │           (Sync Coordinator)                 │
          │  • Local-first operations                   │
          │  • Background sync with API (optional)      │
          │  • Conflict resolution                      │
          │  • Event emitter for updates                │
          └────────────┬──────────────┬─────────────────┘
                       │              │
            ┌──────────▼─────┐   ┌────▼────────────────┐
            │ Local Storage  │   │   API Service       │
            │   Provider     │   │   (Optional Sync)   │
            └────────┬───────┘   └─────────────────────┘
                     │
         ┌───────────▼───────────┐
         │  Environment Detection│
         └───────┬────────┬──────┘
                 │        │
      ┌──────────▼──┐  ┌─▼───────────────┐
      │Web Provider │  │Electron Provider│
      │ (IndexedDB) │  │(File System +   │
      │             │  │  IndexedDB)     │
      └─────────────┘  └─────────────────┘
```

---

## State Management Strategy

### When to Use What?

| State Type | Tool | Example Use Cases | Persistence |
|-----------|------|-------------------|-------------|
| **UI State** | Zustand | Modal open/close, selected items, form drafts, theme | Session only (memory) |
| **Local Data** | Storage Manager | Transcripts, templates, audio files | IndexedDB/FS (persistent) |
| **Server Data** | TanStack Query | User profile, shared resources (if API exists) | Cache + persistence |
| **Hybrid** | Hooks + both | Sync-able transcripts (local + cloud backup) | Both local & server |

---

### 1. Zustand Stores (UI State Only)

**Purpose**: Fast, reactive UI state that doesn't need persistence

**File Structure**:
```
src/stores/
  ├── useTranscriptUIStore.ts     # Transcript-related UI state
  ├── useAudioPlayerStore.ts      # Audio player state
  ├── useModalStore.ts            # Modal state
  └── useAppSettingsStore.ts      # App-wide UI settings
```

**Example: Transcript UI Store**

```typescript
// src/stores/useTranscriptUIStore.ts
import { create } from 'zustand'

interface TranscriptUIState {
  // Selection state
  selectedTranscriptId: string | null
  selectedChunks: Set<string>

  // View state
  viewMode: 'compact' | 'expanded'
  filterSpeaker: string | null
  searchQuery: string

  // Modal state
  isExportModalOpen: boolean
  isSaveModalOpen: boolean

  // Actions
  setSelectedTranscript: (id: string | null) => void
  toggleChunkSelection: (chunkId: string) => void
  clearSelection: () => void
  setViewMode: (mode: 'compact' | 'expanded') => void
  setFilterSpeaker: (speaker: string | null) => void
  setSearchQuery: (query: string) => void
  openExportModal: () => void
  closeExportModal: () => void
  openSaveModal: () => void
  closeSaveModal: () => void
  reset: () => void
}

export const useTranscriptUIStore = create<TranscriptUIState>((set) => ({
  // Initial state
  selectedTranscriptId: null,
  selectedChunks: new Set(),
  viewMode: 'expanded',
  filterSpeaker: null,
  searchQuery: '',
  isExportModalOpen: false,
  isSaveModalOpen: false,

  // Actions
  setSelectedTranscript: (id) => set({ selectedTranscriptId: id }),

  toggleChunkSelection: (chunkId) => set((state) => {
    const newSet = new Set(state.selectedChunks)
    if (newSet.has(chunkId)) {
      newSet.delete(chunkId)
    } else {
      newSet.add(chunkId)
    }
    return { selectedChunks: newSet }
  }),

  clearSelection: () => set({ selectedChunks: new Set() }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setFilterSpeaker: (speaker) => set({ filterSpeaker: speaker }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  openExportModal: () => set({ isExportModalOpen: true }),
  closeExportModal: () => set({ isExportModalOpen: false }),
  openSaveModal: () => set({ isSaveModalOpen: true }),
  closeSaveModal: () => set({ isSaveModalOpen: false }),

  reset: () => set({
    selectedTranscriptId: null,
    selectedChunks: new Set(),
    viewMode: 'expanded',
    filterSpeaker: null,
    searchQuery: '',
    isExportModalOpen: false,
    isSaveModalOpen: false,
  }),
}))
```

**Usage in Components**:
```typescript
function WhisperTranscript() {
  // Subscribe only to what you need (prevents unnecessary re-renders)
  const selectedTranscriptId = useTranscriptUIStore(state => state.selectedTranscriptId)
  const setSelectedTranscript = useTranscriptUIStore(state => state.setSelectedTranscript)
  const isExportModalOpen = useTranscriptUIStore(state => state.isExportModalOpen)
  const openExportModal = useTranscriptUIStore(state => state.openExportModal)

  return (
    <div>
      <Button onClick={openExportModal}>Export</Button>
      {/* ... */}
    </div>
  )
}
```

**Why Zustand for UI State?**
- ✅ **No persistence needed** - UI state is ephemeral
- ✅ **Fast updates** - Synchronous, no async overhead
- ✅ **Selective re-renders** - Only components using specific state slice re-render
- ✅ **Simple API** - No setup, no providers
- ✅ **DevTools** - Great debugging experience

---

### 2. Storage Manager (Local Data)

**Purpose**: Persistent local-only data (transcripts, audio files, templates)

**This is your OFFLINE-FIRST data**. Always save locally first, sync to API is optional.

**File**: `src/lib/storage/StorageManager.ts`

```typescript
import { EventEmitter } from 'events'

export class StorageManager extends EventEmitter {
  private provider: StorageProvider

  constructor() {
    super()
    this.provider = this.createProvider()
  }

  private createProvider(): StorageProvider {
    if (typeof window !== 'undefined' && window.electron?.isElectron) {
      return new ElectronStorageProvider()
    }
    return new WebStorageProvider()
  }

  // CRUD operations with events
  async set<T>(collection: string, key: string, value: T): Promise<void> {
    try {
      await this.provider.set(collection, key, value)

      // Emit event for reactive updates
      this.emit('storage:update', { collection, key, value })
      this.emit(`storage:update:${collection}`, { key, value })

    } catch (error) {
      console.error(`Storage error (set):`, error)
      throw new StorageError('Failed to save data', { cause: error })
    }
  }

  async get<T>(collection: string, key: string): Promise<T | null> {
    try {
      return await this.provider.get<T>(collection, key)
    } catch (error) {
      console.error(`Storage error (get):`, error)
      throw new StorageError('Failed to retrieve data', { cause: error })
    }
  }

  async list<T>(collection: string): Promise<Array<{ key: string; value: T }>> {
    try {
      return await this.provider.list<T>(collection)
    } catch (error) {
      console.error(`Storage error (list):`, error)
      throw new StorageError('Failed to list data', { cause: error })
    }
  }

  async remove(collection: string, key: string): Promise<void> {
    try {
      await this.provider.remove(collection, key)

      // Emit event
      this.emit('storage:delete', { collection, key })
      this.emit(`storage:delete:${collection}`, { key })

    } catch (error) {
      console.error(`Storage error (remove):`, error)
      throw new StorageError('Failed to delete data', { cause: error })
    }
  }

  // ... more methods (blob operations, etc.)
}

// Singleton instance
export const storageManager = new StorageManager()
```

**Event System**: Allows hooks to react to storage changes from any source

---

### 3. TanStack Query (API/Server State)

**Purpose**: Manage server state when you add API functionality (future)

**Current State**: Your app is **local-only** right now. TanStack Query is already configured for other features (conversations, etc.), but transcripts are local-only.

**Future: Optional Cloud Sync**

When you want to add cloud sync (e.g., sync transcripts across devices):

```typescript
// src/lib/query-hooks/useTranscriptSync.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { storageManager } from '@/lib/storage/StorageManager'
import apiService from '@/lib/api'

export function useTranscriptSync(transcriptId: string) {
  const queryClient = useQueryClient()

  // Fetch from API (if online and synced)
  const { data: cloudTranscript } = useQuery({
    queryKey: ['transcripts', 'cloud', transcriptId],
    queryFn: () => apiService.getTranscript(transcriptId),
    enabled: !!transcriptId && navigator.onLine,
    staleTime: Infinity, // Local is source of truth
  })

  // Push to API (backup/sync)
  const syncMutation = useMutation({
    mutationFn: async (transcript: SavedTranscript) => {
      // First save locally (offline-first)
      await storageManager.set('transcripts', transcript.id, transcript)

      // Then try to sync to API if online
      if (navigator.onLine) {
        return apiService.syncTranscript(transcript)
      }

      return transcript
    },
    onSuccess: (data) => {
      // Invalidate cloud cache
      queryClient.invalidateQueries({ queryKey: ['transcripts', 'cloud'] })
    },
  })

  return {
    cloudTranscript,
    sync: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
    syncError: syncMutation.error,
  }
}
```

**Key Points**:
- Local storage is **always** the source of truth
- API is for **backup/sync** only
- Works offline-first
- Syncs in background when online

---

### 4. Resource-Specific Hooks (The Bridge)

**Purpose**: Combine local storage, Zustand UI state, and optional API sync

These hooks are the **main API** that components use.

#### 4.1 useTranscripts Hook (Complete Implementation)

**File**: `src/hooks/useTranscripts.ts`

```typescript
import { useState, useEffect, useCallback } from 'react'
import { storageManager } from '@/lib/storage/StorageManager'
import type { SavedTranscript } from '@/types'

export function useTranscripts() {
  const [transcripts, setTranscripts] = useState<SavedTranscript[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Load all transcripts from local storage
  const loadTranscripts = useCallback(async () => {
    try {
      setLoading(true)
      const items = await storageManager.list<SavedTranscript>('transcripts')

      // Sort by updatedAt (most recent first)
      const sorted = items
        .map(item => item.value)
        .sort((a, b) => b.metadata.updatedAt - a.metadata.updatedAt)

      setTranscripts(sorted)
      setError(null)
    } catch (err) {
      setError(err as Error)
      console.error('Failed to load transcripts:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load on mount
  useEffect(() => {
    loadTranscripts()
  }, [loadTranscripts])

  // Listen for storage changes (reactive updates)
  useEffect(() => {
    const handleUpdate = () => {
      loadTranscripts()
    }

    storageManager.on('storage:update:transcripts', handleUpdate)
    storageManager.on('storage:delete:transcripts', handleUpdate)

    return () => {
      storageManager.off('storage:update:transcripts', handleUpdate)
      storageManager.off('storage:delete:transcripts', handleUpdate)
    }
  }, [loadTranscripts])

  // Save transcript
  const saveTranscript = useCallback(async (
    transcript: Omit<SavedTranscript, 'id' | 'metadata'>,
    options?: { fileName?: string, audioBlob?: Blob }
  ): Promise<string> => {
    const id = `transcript-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    let audioFileId: string | undefined

    // Save audio blob if provided
    if (options?.audioBlob) {
      audioFileId = `audio-${id}`
      await storageManager.saveBlob('audio-files', audioFileId, options.audioBlob)
    }

    const savedTranscript: SavedTranscript = {
      id,
      ...transcript,
      audioFileId,
      metadata: {
        fileName: options?.fileName || 'untitled',
        duration: transcript.transcript.chunks[transcript.transcript.chunks.length - 1]?.timestamp[1] || 0,
        speakerCount: new Set(transcript.segments.map(s => s.label)).size,
        language: 'en',
        model: 'unknown',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    }

    await storageManager.set('transcripts', id, savedTranscript)

    // loadTranscripts() will be called automatically via event listener

    return id
  }, [])

  // Delete transcript (with audio file)
  const deleteTranscript = useCallback(async (id: string): Promise<void> => {
    const transcript = await storageManager.get<SavedTranscript>('transcripts', id)

    // Delete associated audio file
    if (transcript?.audioFileId) {
      await storageManager.removeBlob('audio-files', transcript.audioFileId)
    }

    await storageManager.remove('transcripts', id)

    // loadTranscripts() will be called automatically via event listener
  }, [])

  // Get single transcript
  const getTranscript = useCallback(async (id: string): Promise<SavedTranscript | null> => {
    return storageManager.get<SavedTranscript>('transcripts', id)
  }, [])

  // Update transcript
  const updateTranscript = useCallback(async (
    id: string,
    updates: Partial<Omit<SavedTranscript, 'id' | 'metadata'>>
  ): Promise<void> => {
    const existing = await getTranscript(id)
    if (!existing) throw new Error('Transcript not found')

    const updated: SavedTranscript = {
      ...existing,
      ...updates,
      metadata: {
        ...existing.metadata,
        updatedAt: Date.now(),
      },
    }

    await storageManager.set('transcripts', id, updated)

    // loadTranscripts() will be called automatically via event listener
  }, [getTranscript])

  return {
    // State
    transcripts,
    loading,
    error,

    // Actions
    saveTranscript,
    deleteTranscript,
    getTranscript,
    updateTranscript,
    refresh: loadTranscripts,
  }
}
```

**Usage in Component**:
```typescript
function WhisperDiarization() {
  const {
    transcripts,
    saveTranscript,
    loading,
    error
  } = useTranscripts()

  const handleSave = async () => {
    if (!result) return

    try {
      const id = await saveTranscript(
        {
          transcript: result.transcript,
          segments: result.segments,
        },
        {
          fileName: audioFileName || 'recording',
          audioBlob: audioBlob,
        }
      )

      toast.success(`Transcript saved! ID: ${id}`)
    } catch (error) {
      toast.error(`Failed to save: ${error.message}`)
    }
  }

  return (
    <>
      <Button onClick={handleSave}>
        Save Transcript
      </Button>

      {/* Saved transcripts list */}
      {transcripts.length > 0 && (
        <div>
          <h3>Saved Transcripts ({transcripts.length})</h3>
          {transcripts.map(t => (
            <div key={t.id}>{t.metadata.fileName}</div>
          ))}
        </div>
      )}
    </>
  )
}
```

---

### 5. Data Flow Examples

#### Example 1: Saving a Transcript (Local-Only)

```
User clicks Save
      ↓
Component calls saveTranscript() from useTranscripts hook
      ↓
Hook generates ID, saves audio blob (if exists)
      ↓
Hook calls storageManager.set('transcripts', id, data)
      ↓
StorageManager saves to Web/Electron provider
      ↓
StorageManager emits 'storage:update:transcripts' event
      ↓
useTranscripts hook listens to event and reloads list
      ↓
Component re-renders with updated list
```

#### Example 2: Opening Export Modal (UI State)

```
User clicks Export button
      ↓
Component calls openExportModal() from useTranscriptUIStore
      ↓
Zustand updates state synchronously
      ↓
All components subscribed to isExportModalOpen re-render
      ↓
Modal appears instantly (no async delay)
```

#### Example 3: Future - Syncing to API (Optional)

```
User saves transcript (local-first)
      ↓
saveTranscript() saves to local storage first
      ↓
Background sync job detects new transcript
      ↓
If online: POST to API /transcripts
      ↓
TanStack Query caches API response
      ↓
Mark transcript as "synced" in metadata
```

---

## API Integration Strategy

### Current State: No API for Transcripts

Your app is **fully offline** for transcripts. This is perfect for privacy and works great.

### Future: Optional API Sync

If you want to add cloud backup/sync later:

**API Endpoints** (future):
```
POST   /api/transcripts          # Create/update transcript
GET    /api/transcripts          # List user's transcripts
GET    /api/transcripts/:id      # Get specific transcript
DELETE /api/transcripts/:id      # Delete transcript
POST   /api/transcripts/:id/sync # Force sync
```

**Sync Strategy**:
1. **Local is always source of truth**
2. API is **backup only**
3. Sync happens in **background**
4. Works **offline-first**

**Conflict Resolution**:
- Use `updatedAt` timestamp
- Last write wins (LWW)
- Option for manual merge UI

**Implementation** (when needed):
```typescript
// src/lib/api-services/transcriptApi.ts
export const transcriptApi = {
  async sync(transcript: SavedTranscript): Promise<SavedTranscript> {
    try {
      const response = await apiClient.post('/transcripts', transcript)
      return response.data
    } catch (error) {
      console.warn('Sync failed, keeping local copy:', error)
      // Don't throw - offline-first means failures are ok
      return transcript
    }
  },

  async list(): Promise<SavedTranscript[]> {
    const response = await apiClient.get('/transcripts')
    return response.data
  },
}
```

---

## Complete File Structure

```
src/
├── lib/
│   ├── storage/
│   │   ├── types.ts                      # TypeScript interfaces
│   │   ├── errors.ts                     # Custom error classes
│   │   ├── StorageManager.ts             # Main storage coordinator (with EventEmitter)
│   │   └── providers/
│   │       ├── StorageProvider.ts        # Base interface
│   │       ├── WebStorageProvider.ts     # IndexedDB implementation
│   │       └── ElectronStorageProvider.ts # File system implementation
│   │
│   ├── api-services/                     # API service modules (future)
│   │   ├── transcriptApi.ts              # Transcript API calls
│   │   └── templateApi.ts                # Template API calls
│   │
│   └── api.ts                            # Existing API client (axios)
│
├── hooks/
│   ├── useTranscripts.ts                 # Transcript CRUD + reactive updates
│   ├── useTemplates.ts                   # Template CRUD
│   ├── useAudioFiles.ts                  # Audio file management
│   └── useSettings.ts                    # App settings
│
├── stores/                                # Zustand stores (UI state only)
│   ├── useTranscriptUIStore.ts           # Transcript UI state
│   ├── useAudioPlayerStore.ts            # Audio player state
│   ├── useModalStore.ts                  # Modal state
│   └── useAppSettingsStore.ts            # UI settings (theme, etc.)
│
├── types/
│   └── index.ts                          # All TypeScript types
│
└── app/
    └── web-transc/
        └── components/
            ├── WhisperDiarization.tsx    # Main component (uses hooks)
            ├── TranscriptListModal.tsx   # List saved transcripts
            └── SaveTranscriptModal.tsx   # Save dialog
```

---

## Implementation Phases (Updated)

### Phase 1: Core Infrastructure ✅
**Files to Create**:
1. `src/lib/storage/types.ts` - TypeScript interfaces
2. `src/lib/storage/errors.ts` - Error types
3. `src/lib/storage/providers/StorageProvider.ts` - Base interface
4. `src/lib/storage/providers/WebStorageProvider.ts` - Web implementation
5. `src/lib/storage/StorageManager.ts` - Unified manager with EventEmitter

**Time Estimate**: 3-4 hours

---

### Phase 2: Electron Integration ⚡
**Files to Modify/Create**:
1. `electron/preload.js` - Add file system APIs
2. `electron/main.js` - Add IPC handlers
3. `src/lib/storage/providers/ElectronStorageProvider.ts` - Electron implementation

**Time Estimate**: 3-4 hours

---

### Phase 3: Zustand Stores 🎯
**Files to Create**:
1. `src/stores/useTranscriptUIStore.ts` - Transcript UI state
2. `src/stores/useAudioPlayerStore.ts` - Audio player state
3. `src/stores/useModalStore.ts` - Modal state

**Time Estimate**: 2 hours

---

### Phase 4: Resource Hooks 🎣
**Files to Create**:
1. `src/hooks/useTranscripts.ts` - With event-based reactivity
2. `src/hooks/useTemplates.ts` - Replace templateStorage.ts

**Time Estimate**: 3-4 hours

---

### Phase 5: UI Integration 🎨
**Files to Modify/Create**:
1. `src/app/web-transc/components/WhisperDiarization.tsx` - Implement save button
2. Create: `TranscriptListModal.tsx` - List saved transcripts
3. Create: `SaveTranscriptModal.tsx` - Save dialog with metadata
4. `src/app/web-transc/components/ExportToLLMModal.tsx` - Use Zustand + useTemplates

**Time Estimate**: 4-5 hours

---

### Phase 6: Testing & Polish 🧪
**Tasks**:
1. Test Web vs Electron modes
2. Test offline functionality
3. Test error scenarios
4. Test large blob storage
5. Add loading states and error boundaries

**Time Estimate**: 3-4 hours

---

### Phase 7 (Future): API Integration ☁️
**When needed** (optional cloud sync):
1. Create API endpoints on backend
2. Implement `src/lib/api-services/transcriptApi.ts`
3. Add background sync worker
4. Add TanStack Query integration for optimistic updates
5. Implement conflict resolution UI

**Time Estimate**: 6-8 hours (future work)

---

## Key Patterns & Best Practices

### 1. Local-First Pattern

```typescript
// ALWAYS save locally first
const saveTranscript = async (data) => {
  // Step 1: Save locally (guaranteed to work)
  const id = await storageManager.set('transcripts', key, data)

  // Step 2: Optionally sync to API (can fail, that's ok)
  try {
    if (navigator.onLine) {
      await transcriptApi.sync(data)
    }
  } catch (error) {
    console.warn('Sync failed, local copy is saved:', error)
    // Don't throw - user's data is safe locally
  }

  return id
}
```

### 2. Selective Subscriptions (Zustand)

```typescript
// ❌ Bad: Subscribes to entire store
const store = useTranscriptUIStore()

// ✅ Good: Subscribe only to what you need
const isOpen = useTranscriptUIStore(state => state.isExportModalOpen)
const openModal = useTranscriptUIStore(state => state.openExportModal)
```

### 3. Event-Driven Reactivity (Storage)

```typescript
// Storage Manager emits events
storageManager.emit('storage:update:transcripts', { key, value })

// Hooks listen to events
useEffect(() => {
  const handler = () => loadTranscripts()
  storageManager.on('storage:update:transcripts', handler)
  return () => storageManager.off('storage:update:transcripts', handler)
}, [])
```

### 4. Error Boundaries

```typescript
function TranscriptFeature() {
  const { transcripts, error, loading } = useTranscripts()

  if (error) {
    return <ErrorFallback error={error} retry={refresh} />
  }

  if (loading) {
    return <Skeleton />
  }

  return <TranscriptList transcripts={transcripts} />
}
```

### 5. Optimistic Updates (Future with API)

```typescript
const { mutate } = useMutation({
  mutationFn: transcriptApi.sync,
  onMutate: async (newTranscript) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey: ['transcripts'] })

    // Snapshot previous value
    const prev = queryClient.getQueryData(['transcripts'])

    // Optimistically update
    queryClient.setQueryData(['transcripts'], (old) => [...old, newTranscript])

    return { prev }
  },
  onError: (err, newTranscript, context) => {
    // Rollback on error
    queryClient.setQueryData(['transcripts'], context.prev)
  },
})
```

---

## Summary

This updated architecture provides:

✅ **Clear separation of concerns**:
- Zustand = UI state (modals, selections, temp data)
- Storage Manager = Persistent data (transcripts, files)
- TanStack Query = Server state (future API sync)

✅ **Offline-first**: Local storage is source of truth

✅ **Reactive updates**: Event-based system keeps UI in sync

✅ **Type-safe**: Full TypeScript support

✅ **Scalable**: Easy to add API sync later

✅ **Best practices**:
- Local-first pattern
- Selective subscriptions
- Error boundaries
- Optimistic updates ready

✅ **Environment adaptive**: Works in Web and Electron

✅ **Testable**: Clear boundaries, easy to mock

---

## Next Steps

1. ✅ Review this architecture
2. → Start Phase 1: Core Infrastructure
3. → Build incrementally through phases
4. → Test thoroughly at each phase
5. → Deploy and iterate

Ready to start implementation? 🚀
