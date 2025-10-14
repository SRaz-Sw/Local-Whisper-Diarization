# Streamlined Storage Architecture Plan

## Overview

This document outlines the plan to create a unified, environment-aware storage system that works seamlessly in both Web and Electron modes.

---

## Architecture Design

### Core Principles

1. **Single Source of Truth**: One API for all storage operations
2. **Environment Adaptive**: Automatically use best storage method for environment
3. **Type Safe**: Full TypeScript support with generics
4. **Resource Oriented**: Dedicated hooks for each data type (transcripts, templates, etc.)
5. **Separation of Concerns**: Storage logic separate from UI logic

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   React Components                       │
│              (WhisperDiarization, etc.)                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Resource-Specific Hooks                     │
│   • useTranscripts()  • useTemplates()                  │
│   • useAudioFiles()   • useSettings()                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           Unified Storage Manager                        │
│              (useStorage hook)                           │
│   • CRUD operations  • Type safety                      │
│   • Error handling   • Caching                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            Storage Provider Layer                        │
│           (Environment Detection)                        │
└─────────────┬───────────────────────────┬───────────────┘
              │                           │
      ┌───────▼────────┐         ┌───────▼────────┐
      │  Web Provider  │         │ Electron Provider│
      │   (IndexedDB)  │         │ (File System +   │
      │                │         │   IndexedDB)     │
      └────────────────┘         └─────────────────┘
```

---

## Layer Details

### 1. Storage Provider Interface

**File**: `src/lib/storage/providers/StorageProvider.ts`

```typescript
export interface StorageProvider {
  // Basic CRUD
  get<T>(collection: string, key: string): Promise<T | null>
  set<T>(collection: string, key: string, value: T): Promise<void>
  remove(collection: string, key: string): Promise<void>
  clear(collection: string): Promise<void>

  // Query operations
  list<T>(collection: string): Promise<Array<{ key: string; value: T }>>
  query<T>(collection: string, filter: (value: T) => boolean): Promise<Array<{ key: string; value: T }>>

  // Blob operations
  saveBlob(collection: string, key: string, blob: Blob): Promise<string>
  getBlob(collection: string, key: string): Promise<Blob | null>
  removeBlob(collection: string, key: string): Promise<void>

  // Metadata
  keys(collection: string): Promise<string[]>
  exists(collection: string, key: string): Promise<boolean>
  size(collection: string): Promise<number>
}
```

**Collections**: Namespace for different data types
- `transcripts`
- `templates`
- `audio-files`
- `settings`
- `cache`

---

### 2. Web Provider Implementation

**File**: `src/lib/storage/providers/WebStorageProvider.ts`

**Technology**: IndexedDB via localforage (with collection support)

```typescript
export class WebStorageProvider implements StorageProvider {
  private stores: Map<string, LocalForage>

  constructor() {
    // Initialize separate stores for each collection
    this.stores = new Map()
  }

  private getStore(collection: string): LocalForage {
    if (!this.stores.has(collection)) {
      const store = localforage.createInstance({
        name: 'whisper-diarization',
        storeName: collection,
      })
      this.stores.set(collection, store)
    }
    return this.stores.get(collection)!
  }

  async get<T>(collection: string, key: string): Promise<T | null> {
    const store = this.getStore(collection)
    return store.getItem<T>(key)
  }

  async set<T>(collection: string, key: string, value: T): Promise<void> {
    const store = this.getStore(collection)
    await store.setItem(key, value)
  }

  // ... rest of implementation
}
```

**Benefits**:
- Works in all browsers
- Handles blobs efficiently
- Good performance
- Persistent across sessions

---

### 3. Electron Provider Implementation

**File**: `src/lib/storage/providers/ElectronStorageProvider.ts`

**Technology**: File System + IndexedDB hybrid

**Strategy**:
- **JSON data**: File system (user's documents folder or app data)
- **Blobs (audio)**: File system with references
- **Cache/temp data**: IndexedDB

```typescript
export class ElectronStorageProvider implements StorageProvider {
  private webProvider: WebStorageProvider // Fallback for cache
  private basePath: string // e.g., ~/Documents/WhisperTranscripts

  constructor() {
    this.webProvider = new WebStorageProvider()
    this.basePath = this.getBasePath()
  }

  private getBasePath(): string {
    // Use Electron API to get documents path
    if (window.electron?.getDocumentsPath) {
      return window.electron.getDocumentsPath()
    }
    // Fallback to app data
    return window.electron?.getAppPath() || ''
  }

  async get<T>(collection: string, key: string): Promise<T | null> {
    if (this.shouldUseFileSystem(collection)) {
      // Read from file system
      const filePath = this.getFilePath(collection, key)
      return window.electron?.readFile(filePath)
    }
    // Use IndexedDB for cache
    return this.webProvider.get(collection, key)
  }

  async set<T>(collection: string, key: string, value: T): Promise<void> {
    if (this.shouldUseFileSystem(collection)) {
      const filePath = this.getFilePath(collection, key)
      await window.electron?.writeFile(filePath, value)
    } else {
      await this.webProvider.set(collection, key, value)
    }
  }

  private shouldUseFileSystem(collection: string): boolean {
    return ['transcripts', 'audio-files'].includes(collection)
  }

  // ... rest of implementation
}
```

**Benefits**:
- User can access files directly
- No size limits (uses file system)
- Easy backup/sharing
- Familiar file-based workflow

**Required Electron APIs** (need to add to preload.js):
```javascript
window.electron = {
  // ... existing APIs

  // File system APIs
  readFile: (path) => ipcRenderer.invoke('fs:read', path),
  writeFile: (path, data) => ipcRenderer.invoke('fs:write', path, data),
  deleteFile: (path) => ipcRenderer.invoke('fs:delete', path),
  listFiles: (path) => ipcRenderer.invoke('fs:list', path),

  // Dialogs
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:save', options),
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:open', options),

  // Paths
  getDocumentsPath: () => ipcRenderer.invoke('path:documents'),
}
```

---

### 4. Unified Storage Manager

**File**: `src/lib/storage/StorageManager.ts`

```typescript
export class StorageManager {
  private provider: StorageProvider

  constructor() {
    this.provider = this.createProvider()
  }

  private createProvider(): StorageProvider {
    if (typeof window !== 'undefined' && window.electron?.isElectron) {
      return new ElectronStorageProvider()
    }
    return new WebStorageProvider()
  }

  // Typed CRUD operations
  async get<T>(collection: string, key: string): Promise<T | null> {
    try {
      return await this.provider.get<T>(collection, key)
    } catch (error) {
      console.error(`Storage error (get):`, error)
      throw new StorageError('Failed to retrieve data', { cause: error })
    }
  }

  async set<T>(collection: string, key: string, value: T): Promise<void> {
    try {
      await this.provider.set(collection, key, value)
    } catch (error) {
      console.error(`Storage error (set):`, error)
      throw new StorageError('Failed to save data', { cause: error })
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

  // ... more methods
}

// Singleton instance
export const storageManager = new StorageManager()
```

---

### 5. Resource-Specific Hooks

#### 5.1 useTranscripts Hook

**File**: `src/hooks/useTranscripts.ts`

```typescript
export interface SavedTranscript {
  id: string
  transcript: {
    text: string
    chunks: TranscriptChunk[]
  }
  segments: SpeakerSegment[]
  metadata: {
    fileName: string
    duration: number
    speakerCount: number
    language: string
    model: string
    createdAt: number
    updatedAt: number
  }
  audioFileId?: string // Reference to audio blob
}

export function useTranscripts() {
  const [transcripts, setTranscripts] = useState<SavedTranscript[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Load all transcripts
  useEffect(() => {
    loadTranscripts()
  }, [])

  const loadTranscripts = async () => {
    try {
      setLoading(true)
      const items = await storageManager.list<SavedTranscript>('transcripts')
      setTranscripts(items.map(item => item.value))
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  const saveTranscript = async (
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
        language: 'en', // TODO: get from transcription
        model: 'unknown', // TODO: get from transcription
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    }

    await storageManager.set('transcripts', id, savedTranscript)
    await loadTranscripts()

    return id
  }

  const deleteTranscript = async (id: string): Promise<void> => {
    const transcript = await storageManager.get<SavedTranscript>('transcripts', id)

    // Delete associated audio file
    if (transcript?.audioFileId) {
      await storageManager.removeBlob('audio-files', transcript.audioFileId)
    }

    await storageManager.remove('transcripts', id)
    await loadTranscripts()
  }

  const getTranscript = async (id: string): Promise<SavedTranscript | null> => {
    return storageManager.get<SavedTranscript>('transcripts', id)
  }

  const updateTranscript = async (
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
    await loadTranscripts()
  }

  return {
    transcripts,
    loading,
    error,
    saveTranscript,
    deleteTranscript,
    getTranscript,
    updateTranscript,
    refresh: loadTranscripts,
  }
}
```

**Usage**:
```typescript
function WhisperDiarization() {
  const {
    transcripts,
    saveTranscript,
    deleteTranscript,
    loading
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
          fileName: mediaFileName || 'recording',
          audioBlob: audioBlob, // if available
        }
      )

      alert(`Transcript saved successfully! ID: ${id}`)
    } catch (error) {
      alert(`Failed to save: ${error.message}`)
    }
  }

  return (
    <Button onClick={handleSave}>Save Transcript</Button>
  )
}
```

---

#### 5.2 useTemplates Hook

**File**: `src/hooks/useTemplates.ts`

**Purpose**: Replace `templateStorage.ts` with hook-based approach

```typescript
export function useTemplates() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [loading, setLoading] = useState(true)

  // ... similar pattern to useTranscripts

  const saveTemplate = async (name: string, content: string): Promise<PromptTemplate> => {
    const template: PromptTemplate = {
      id: `template-${Date.now()}`,
      name,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    await storageManager.set('templates', template.id, template)
    await loadTemplates()

    return template
  }

  return {
    templates,
    loading,
    saveTemplate,
    deleteTemplate,
    updateTemplate,
  }
}
```

---

## Implementation Phases

### Phase 1: Core Infrastructure ✅
**Files to Create**:
1. `src/lib/storage/types.ts` - TypeScript interfaces
2. `src/lib/storage/providers/StorageProvider.ts` - Base interface
3. `src/lib/storage/providers/WebStorageProvider.ts` - Web implementation
4. `src/lib/storage/StorageManager.ts` - Unified manager
5. `src/lib/storage/errors.ts` - Error types

**Time Estimate**: 2-3 hours

---

### Phase 2: Electron Integration ⚡
**Files to Modify/Create**:
1. `electron/preload.js` - Add file system APIs
2. `electron/main.js` - Add IPC handlers
3. `src/lib/storage/providers/ElectronStorageProvider.ts` - Electron implementation

**Time Estimate**: 3-4 hours

---

### Phase 3: Resource Hooks 🎣
**Files to Create**:
1. `src/hooks/useTranscripts.ts`
2. `src/hooks/useTemplates.ts`

**Files to Modify**:
1. `src/app/web-transc/utils/templateStorage.ts` - Deprecate in favor of hook

**Time Estimate**: 2-3 hours

---

### Phase 4: UI Integration 🎨
**Files to Modify**:
1. `src/app/web-transc/components/WhisperDiarization.tsx` - Implement save button
2. `src/app/web-transc/components/ExportToLLMModal.tsx` - Use useTemplates hook
3. Create new component: `TranscriptListModal.tsx` - List saved transcripts

**Time Estimate**: 3-4 hours

---

### Phase 5: Migration & Testing 🧪
**Tasks**:
1. Migrate existing localStorage templates to IndexedDB
2. Write unit tests for storage providers
3. Test Web vs Electron modes
4. Test error scenarios
5. Test large blob storage

**Time Estimate**: 2-3 hours

---

## Data Migration Strategy

### Migrating Templates from localStorage to IndexedDB

```typescript
// src/lib/storage/migrations/migrateTemplates.ts
export async function migrateTemplatesFromLocalStorage(): Promise<void> {
  const STORAGE_KEY = "llm-export-templates"

  try {
    const oldData = localStorage.getItem(STORAGE_KEY)
    if (!oldData) return // Nothing to migrate

    const templates = JSON.parse(oldData) as PromptTemplate[]

    // Save each template to new storage
    for (const template of templates) {
      await storageManager.set('templates', template.id, template)
    }

    // Remove old data
    localStorage.removeItem(STORAGE_KEY)

    console.log(`Migrated ${templates.length} templates to IndexedDB`)
  } catch (error) {
    console.error('Template migration failed:', error)
    // Don't throw - migration is best-effort
  }
}
```

**Run on app initialization**:
```typescript
// In main App component
useEffect(() => {
  migrateTemplatesFromLocalStorage()
}, [])
```

---

## Error Handling

### Custom Error Types

```typescript
export class StorageError extends Error {
  constructor(message: string, public options?: { cause?: unknown }) {
    super(message)
    this.name = 'StorageError'
  }
}

export class QuotaExceededError extends StorageError {
  constructor(message: string = 'Storage quota exceeded') {
    super(message)
    this.name = 'QuotaExceededError'
  }
}

export class NotFoundError extends StorageError {
  constructor(key: string) {
    super(`Item not found: ${key}`)
    this.name = 'NotFoundError'
  }
}
```

### Usage in Hooks

```typescript
const saveTranscript = async (...) => {
  try {
    // ... save logic
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      // Handle quota issues
      alert('Storage full! Please delete old transcripts.')
    } else {
      // Generic error
      alert('Failed to save transcript')
    }
    throw error
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// __tests__/storage/WebStorageProvider.test.ts
describe('WebStorageProvider', () => {
  let provider: WebStorageProvider

  beforeEach(() => {
    provider = new WebStorageProvider()
  })

  afterEach(async () => {
    await provider.clear('test-collection')
  })

  it('should save and retrieve data', async () => {
    await provider.set('test-collection', 'key1', { foo: 'bar' })
    const result = await provider.get('test-collection', 'key1')
    expect(result).toEqual({ foo: 'bar' })
  })

  it('should handle blobs', async () => {
    const blob = new Blob(['test'], { type: 'text/plain' })
    await provider.saveBlob('test-collection', 'blob1', blob)
    const retrieved = await provider.getBlob('test-collection', 'blob1')
    expect(retrieved).toBeInstanceOf(Blob)
  })
})
```

---

## Performance Considerations

### 1. Lazy Loading
- Load transcript list metadata only (not full content)
- Load full transcript on demand

### 2. Pagination
```typescript
async listTranscripts(
  options: { limit?: number; offset?: number } = {}
): Promise<SavedTranscript[]> {
  const all = await storageManager.list<SavedTranscript>('transcripts')
  const { limit = 20, offset = 0 } = options
  return all.slice(offset, offset + limit)
}
```

### 3. Caching
- Cache loaded transcripts in memory
- Invalidate on updates

### 4. Indexing (Future Enhancement)
- Use IndexedDB indexes for fast queries
- Index by date, speaker count, duration, etc.

---

## Security Considerations

### Web Mode
- Data stored locally (no server transmission)
- Browser's same-origin policy protects data

### Electron Mode
- File permissions handled by OS
- Store in user's documents folder (user has control)
- No sensitive data encryption needed (local transcripts)

---

## Future Enhancements

1. **Cloud Sync** (optional)
   - Sync transcripts across devices
   - Use existing file upload providers

2. **Export/Import**
   - Export transcripts as ZIP
   - Import from exported ZIP

3. **Search**
   - Full-text search within transcripts
   - Filter by speaker, date, duration

4. **Sharing**
   - Generate shareable links
   - Export to common formats (SRT, VTT, TXT)

5. **Backup**
   - Automatic backups in Electron mode
   - Restore from backup

---

## Summary

This architecture provides:
- ✅ Unified API for all storage operations
- ✅ Environment-adaptive (Web/Electron)
- ✅ Type-safe with TypeScript
- ✅ Resource-oriented hooks
- ✅ Separation of concerns
- ✅ Easy to test and extend
- ✅ Migration path for existing data
- ✅ Error handling
- ✅ Performance optimized

Next: Begin implementation starting with Phase 1.
