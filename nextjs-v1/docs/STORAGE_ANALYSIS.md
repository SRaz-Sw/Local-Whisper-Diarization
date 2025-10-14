# Storage Solutions Analysis

## Current State Overview

This document analyzes all persistent storage implementations in the Local-Whisper-Diarization application, covering both Web and Electron modes.

---

## 1. Storage Technologies Used

### 1.1 IndexedDB (via localforage)
**Location**: `src/lib/storage.ts`

**Purpose**: Primary client-side database for storing JSON data and blobs

**Implementation**:
```typescript
// Configuration
localforage.config({
  name: "nextjs-v1",
  version: 1.0,
  storeName: "nextjs-v1-store",
  description: "Storage for nextjs-v1",
});

// API
- getItem<T>(key: string): Promise<T | null>
- setItem<T>(key: string, value: T): Promise<T>
- removeItem(key: string): Promise<void>
- clear(): Promise<void>
- keys(): Promise<string[]>
```

**Used For**:
- General application data storage
- Large object storage
- Blob storage (audio files, models, etc.)

**Pros**:
- Works in both web and Electron
- Handles blobs efficiently
- Asynchronous API
- Good browser support

**Cons**:
- No current namespace/collection separation
- No typed schema enforcement
- Single flat key-value store

---

### 1.2 localStorage
**Location**: `src/app/web-transc/utils/templateStorage.ts`

**Purpose**: Storing LLM export prompt templates

**Implementation**:
```typescript
const STORAGE_KEY = "llm-export-templates";

// API
- getTemplates(): PromptTemplate[]
- saveTemplate(name, content, id?): PromptTemplate
- deleteTemplate(id): boolean
- getTemplate(id): PromptTemplate | null
```

**Used For**:
- User-created prompt templates
- Small JSON data that doesn't need blob support

**Pros**:
- Synchronous API (simpler for small data)
- Widely supported
- Persistent across sessions

**Cons**:
- **5-10MB size limit**
- **Synchronous (blocks main thread)**
- **Only works in browser** (not ideal for Electron with file system access)
- No blob support

---

### 1.3 React Query Persistence
**Location**: `src/lib/query-services/queryClientPersist.ts`

**Purpose**: Caching API query results

**Implementation**:
```typescript
// Uses localforage as storage adapter
localforage.config({
  name: 'WhatsAppCloneCache',  // Different from main storage!
  storeName: 'queryCache',
});

// Configuration
persistQueryClient({
  queryClient,
  persister: appPersister,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  buster: process.env.NEXT_PUBLIC_APP_VERSION || 'v1',
});
```

**Used For**:
- Caching remote API responses
- Offline-first functionality
- Performance optimization

**Pros**:
- Automatic cache management
- Built-in staleness handling
- Cache busting via version

**Cons**:
- **Separate IndexedDB database** from main storage (fragmentation)
- Only for React Query data

---

### 1.4 Custom Hook: useLocalStorage
**Location**: `src/hooks/useLocalStorage.ts`

**Purpose**: React hook wrapper for storage operations

**Implementation**:
```typescript
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);

  // Async loading from storage
  // State management
  // setValue function

  return { value: storedValue, setValue, loading };
}
```

**Uses**: `src/lib/storage.ts` (IndexedDB via localforage)

**Pros**:
- React-friendly API
- Loading state management
- Type-safe

**Cons**:
- Generic - doesn't handle specific resource types
- No validation or schema enforcement
- Limited error handling

---

### 1.5 File Upload Storage Services
**Location**: `src/lib/storage/` (providers directory)

**Purpose**: Cloud file storage abstraction layer

**Providers**:
- UploadThing (default)
- Cloudinary
- S3 (planned)
- Firebase (planned)
- Mock (testing)

**Configuration**: `src/config/storage.ts`

**Interface**:
```typescript
interface FileStorageService {
  uploadFile(file: File, options?: FileUploadOptions): Promise<FileUploadResponse>
  uploadFiles(files: File[], options?: FileUploadOptions): Promise<FileUploadResponse[]>
  deleteFile(urlOrPath: string): Promise<boolean>
  onProgress(callback: (event: FileUploadProgressEvent) => void): () => void
}
```

**Used For**:
- Cloud file uploads
- External blob storage
- File sharing

**Pros**:
- Provider abstraction
- Progress tracking
- Batch upload support

**Cons**:
- **Requires internet connection**
- **Not suitable for offline-first app**
- **Separate from local storage** (no unified API)

---

## 2. Electron-Specific Storage

### 2.1 Electron API Exposure
**Location**: `electron/preload.js`

**Currently Exposed**:
```javascript
window.electron = {
  getAppPath: () => ipcRenderer.invoke("get-app-path"),
  getVersion: () => ipcRenderer.invoke("get-version"),
  platform: process.platform,
  isElectron: true,
}
```

**File System Access**: ❌ **NOT CURRENTLY EXPOSED**

**Implications**:
- Cannot save files to user's file system
- Cannot create save dialogs
- Cannot access Electron's userData directory for persistent storage

---

### 2.2 Electron Cache Configuration
**Location**: `electron/main.js`

**Model Cache**:
```javascript
const modelCachePath = path.join(
  app.getPath("userData"),
  "ml-models-cache"
);
```

**Purpose**: Storing ML models in Electron's cache

**Used**: Indirectly by transformers.js caching mechanism

---

## 3. Current Data That Needs Persistence

### 3.1 Transcripts (Not Implemented)
**Current State**: ❌ Save button shows alert "coming soon"

**Location**: `WhisperDiarization.tsx:719-743`

**Data Structure**:
```typescript
{
  transcript: {
    text: string,
    chunks: TranscriptChunk[]
  },
  segments: SpeakerSegment[],
  metadata?: {
    duration?: number,
    language?: string,
    model?: string,
    timestamp?: number,
    fileName?: string
  }
}
```

**Storage Needs**:
- JSON data storage (transcript + segments)
- Audio file blob storage (optional)
- Metadata (date, model used, etc.)
- List/query saved transcripts
- Update/delete saved transcripts

---

### 3.2 LLM Prompt Templates (Implemented)
**Current State**: ✅ Working

**Location**: `templateStorage.ts`

**Storage**: localStorage

**Issues**:
- Should use IndexedDB for consistency
- No Electron file system integration

---

### 3.3 Audio Files
**Current State**: ⚠️ Temporary (in-memory only)

**Location**: `WhisperDiarization.tsx` (state: `audio`)

**Storage Needs**:
- Blob storage for audio files
- Association with transcripts
- Efficient retrieval

---

### 3.4 ML Models Cache
**Current State**: ✅ Handled by transformers.js + browser cache

**Storage**: Browser cache API (Web) / Electron cache (Electron)

**No Action Needed**: Works automatically

---

## 4. Issues & Gaps

### 4.1 Fragmentation
- **3 different storage databases**:
  1. `nextjs-v1-store` (main app)
  2. `WhatsAppCloneCache` (React Query)
  3. `llm-export-templates` (localStorage)

### 4.2 No Unified API
- Different APIs for different data types
- No consistent error handling
- No type safety across storage operations

### 4.3 Web vs Electron Inconsistency
- Web: Limited to browser storage
- Electron: Has file system access but not exposed
- No adaptive storage strategy based on environment

### 4.4 No Schema/Validation
- No data versioning
- No migration strategy
- No schema validation

### 4.5 No Resource-Specific Hooks
- Generic `useLocalStorage` hook
- No `useTranscripts`, `useTemplates`, etc.
- Business logic mixed with storage logic

### 4.6 Missing Features
- ❌ Save transcripts
- ❌ Load saved transcripts
- ❌ List/search transcripts
- ❌ Export to file system (Electron)
- ❌ Import from file system (Electron)

---

## 5. Environment Detection

**Current**: No centralized environment detection

**Needed**:
```typescript
const isElectron = typeof window !== 'undefined' && window.electron?.isElectron
const hasFileSystemAccess = isElectron && !!window.electron?.saveFile
```

---

## 6. Recommendations Summary

### High Priority
1. **Create unified storage abstraction** with environment detection
2. **Implement Electron file system APIs** (save/load dialogs)
3. **Build resource-specific hooks** (useTranscripts, useTemplates)
4. **Implement transcript saving/loading**

### Medium Priority
5. Consolidate storage databases (single IndexedDB instance)
6. Migrate templateStorage from localStorage to IndexedDB
7. Add schema versioning and migrations
8. Implement full CRUD operations for transcripts

### Low Priority
9. Add storage quota management
10. Implement storage analytics/usage tracking
11. Add data export/import functionality

---

## 7. Next Steps

See the implementation plan in the next section for detailed architecture and implementation strategy.
