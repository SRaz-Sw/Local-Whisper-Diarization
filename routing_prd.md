# PRD: SPA Routing Architecture for Whisper Diarization

## Document Information
- **Version**: 1.1 (Updated with Critical Improvements)
- **Date**: 2025-10-18
- **Status**: Ready for Implementation
- **Target**: AI Implementation Agent

---

## Executive Summary

Refactor the Whisper Diarization app from a conditional-rendering monolith to a clean, maintainable SPA architecture with proper view management. The solution must work identically in both Next.js (web) and Electron (desktop) environments without build-time conditionals or workarounds.

---

## Problem Statement

### Current Issues

1. **Monolithic Component** (`WhisperDiarization.tsx`, 1447 lines)
   - Multiple UI states managed with nested conditionals
   - Difficult to maintain and extend
   - Poor separation of concerns

2. **Hybrid Routing Complexity**
   - Web uses Next.js dynamic routes (`/transcript/[id]`)
   - Electron uses inline loading with conditionals
   - Requires build script to exclude routes
   - Two different code paths for same functionality

3. **State Management Confusion**
   - UI state mixed with business logic
   - Hard to test individual views
   - Props drilling and ref passing

### Example of Current Problem

```tsx
// Current: Nested conditional rendering (anti-pattern)
{!result && !audio && <UploadView />}
{audio && !result && status === null && <ModelLoadView />}
{audio && !result && status === 'loading' && <LoadingView />}
{audio && !result && status === 'ready' && <TranscriptionView />}
{result && <TranscriptResultView />}
{showSavedTranscripts && <SavedTranscriptsView />}
```

---

## Solution: View-Based SPA Architecture

### Core Principles

1. **Single Responsibility**: Each view handles one concern
2. **Unified Routing**: Same code path for web and Electron
3. **Type Safety**: TypeScript-enforced view names and params
4. **Modularity**: Easy to add/remove/modify views
5. **State Management**: Zustand-based navigation state
6. **Worker Persistence**: Worker survives view transitions

---

## Architecture Design

### 1. View System

#### View Registry

```typescript
// src/app/web-transc/router/views.ts
import { lazy } from 'react';

export type ViewName =
  | 'upload'           // Initial state - upload audio
  | 'transcribe'       // Model loading + transcription
  | 'transcript'       // View completed transcript
  | 'saved'           // Browse saved transcripts
  | 'settings';       // App settings

export const views = {
  upload: lazy(() => import('../views/UploadView')),
  transcribe: lazy(() => import('../views/TranscribeView')),
  transcript: lazy(() => import('../views/TranscriptView')),
  saved: lazy(() => import('../views/SavedView')),
  settings: lazy(() => import('../views/SettingsView')),
} as const;
```

#### View Parameters (Strongly Typed)

```typescript
// src/app/web-transc/router/types.ts
export interface ViewParams {
  upload: void;
  transcribe: void;
  transcript: { id: string };
  saved: void;
  settings: void;
}

export type ViewComponent<T extends ViewName> = React.ComponentType<
  ViewParams[T] extends void ? Record<string, never> : ViewParams[T]
>;

export interface NavigationState {
  currentView: ViewName;
  params: ViewParams[ViewName];
  history: Array<{ view: ViewName; params: any }>;
}
```

### 2. Router Store (Zustand)

```typescript
// src/app/web-transc/store/useRouterStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RouterStore {
  currentView: ViewName;
  params: Record<string, any>;
  history: Array<{ view: ViewName; params: any }>;

  // Actions
  navigate: (view: ViewName, params?: any) => void;
  back: () => void;
  replace: (view: ViewName, params?: any) => void;

  // Utilities
  getFullPath: () => string; // For URL sync
}

export const useRouterStore = create<RouterStore>()(
  persist(
    (set, get) => ({
      currentView: 'upload',
      params: {},
      history: [],

      navigate: (view, params = {}) => {
        const { currentView, params: currentParams, history } = get();

        // Update URL hash (for web shareable links)
        if (typeof window !== 'undefined') {
          const path = params.id ? `${view}/${params.id}` : view;
          window.location.hash = path;
        }

        set({
          currentView: view,
          params,
          history: [...history, { view: currentView, params: currentParams }],
        });
      },

      back: () => {
        const { history } = get();
        if (history.length === 0) return;

        const previous = history[history.length - 1];

        // Update hash
        if (typeof window !== 'undefined') {
          const path = previous.params?.id
            ? `${previous.view}/${previous.params.id}`
            : previous.view;
          window.location.hash = path;
        }

        set({
          currentView: previous.view,
          params: previous.params,
          history: history.slice(0, -1),
        });
      },

      replace: (view, params = {}) => {
        // Update hash
        if (typeof window !== 'undefined') {
          const path = params.id ? `${view}/${params.id}` : view;
          window.location.hash = path;
        }

        set({ currentView: view, params });
      },

      getFullPath: () => {
        const { currentView, params } = get();
        return params.id ? `${currentView}/${params.id}` : currentView;
      },
    }),
    {
      name: 'whisper-router',
      partialize: (state) => ({
        // Persist current view to resume where user left off
        currentView: state.currentView,
        params: state.params,
        // Do NOT persist history (reset on reload)
      }),
    }
  )
);
```

### 3. Worker Service Layer (NEW - CRITICAL)

**Purpose:** Prevent worker recreation during view transitions and centralize worker lifecycle.

```typescript
// src/app/web-transc/services/WhisperWorkerService.ts
type MessageHandler = (e: MessageEvent) => void;

class WhisperWorkerService {
  private worker: Worker | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private errorHandlers: Set<(error: ErrorEvent) => void> = new Set();
  private isInitialized = false;

  /**
   * Initialize worker (called once at app startup)
   */
  initialize(): boolean {
    if (this.isInitialized && this.worker) {
      console.log('✅ Worker already initialized');
      return true;
    }

    try {
      const isDev = process.env.NODE_ENV === 'development';

      if (isDev) {
        this.worker = new Worker(
          new URL('../workers/whisperDiarization.worker.js', import.meta.url),
          { type: 'module' }
        );
      } else {
        this.worker = new Worker('/workers/whisperDiarization.worker.js');
      }

      this.worker.addEventListener('message', this.handleMessage);
      this.worker.addEventListener('error', this.handleError);

      this.isInitialized = true;
      console.log('✅ Worker initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize worker:', error);
      return false;
    }
  }

  /**
   * Subscribe to worker messages
   */
  subscribe(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    // Return unsubscribe function
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Subscribe to worker errors
   */
  onError(handler: (error: ErrorEvent) => void): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  /**
   * Post message to worker
   */
  postMessage(data: any): void {
    if (!this.worker) {
      console.error('❌ Worker not initialized');
      return;
    }
    this.worker.postMessage(data);
  }

  /**
   * Terminate worker (cleanup on unmount)
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.messageHandlers.clear();
      this.errorHandlers.clear();
      console.log('🗑️ Worker terminated');
    }
  }

  /**
   * Recreate worker (for reset scenarios)
   */
  recreate(): boolean {
    this.terminate();
    return this.initialize();
  }

  private handleMessage = (e: MessageEvent) => {
    this.messageHandlers.forEach((handler) => handler(e));
  };

  private handleError = (error: ErrorEvent) => {
    this.errorHandlers.forEach((handler) => handler(error));
  };
}

// Singleton instance
export const whisperWorker = new WhisperWorkerService();
```

#### Custom Hook for Worker Access

```typescript
// src/app/web-transc/hooks/useWhisperWorker.ts
import { useEffect } from 'react';
import { whisperWorker } from '../services/WhisperWorkerService';

export function useWhisperWorker(
  onMessage: (e: MessageEvent) => void,
  onError?: (error: ErrorEvent) => void
) {
  useEffect(() => {
    // Subscribe to messages
    const unsubscribeMessage = whisperWorker.subscribe(onMessage);

    // Subscribe to errors
    const unsubscribeError = onError
      ? whisperWorker.onError(onError)
      : () => {};

    // Cleanup on unmount
    return () => {
      unsubscribeMessage();
      unsubscribeError();
    };
  }, [onMessage, onError]);

  return {
    postMessage: whisperWorker.postMessage.bind(whisperWorker),
    recreate: whisperWorker.recreate.bind(whisperWorker),
  };
}
```

### 4. Main Router Component

```typescript
// src/app/web-transc/router/Router.tsx
import { Suspense, useEffect } from 'react';
import { views } from './views';
import { useRouterStore } from '../store/useRouterStore';
import { ViewLoadingFallback } from '../components/ViewLoadingFallback';
import { whisperWorker } from '../services/WhisperWorkerService';
import { useTranscripts } from '../hooks/useTranscripts';
import { toast } from 'sonner';

export function Router() {
  const { currentView, params, navigate } = useRouterStore();
  const { getWithAudio } = useTranscripts();

  // Initialize worker once on mount
  useEffect(() => {
    whisperWorker.initialize();

    // Cleanup on unmount
    return () => {
      whisperWorker.terminate();
    };
  }, []);

  // Handle deep links and browser back/forward
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) {
        navigate('upload');
        return;
      }

      const [view, id] = hash.split('/');

      // Validate view exists
      if (!(view in views)) {
        console.warn(`Invalid view: ${view}`);
        navigate('upload');
        return;
      }

      // Validate transcript ID if navigating to transcript view
      if (view === 'transcript' && id) {
        getWithAudio(id)
          .then((result) => {
            if (result) {
              navigate(view as ViewName, { id });
            } else {
              toast.error('Transcript not found');
              navigate('upload');
            }
          })
          .catch(() => {
            toast.error('Failed to load transcript');
            navigate('upload');
          });
      } else {
        navigate(view as ViewName, id ? { id } : undefined);
      }
    };

    // Parse initial hash on mount
    handleHashChange();

    // Listen to hash changes (browser back/forward)
    window.addEventListener('hashchange', handleHashChange);

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [navigate, getWithAudio]);

  const ViewComponent = views[currentView];

  return (
    <Suspense fallback={<ViewLoadingFallback viewName={currentView} />}>
      <ViewComponent {...(params as any)} />
    </Suspense>
  );
}
```

### 5. Updated Page Entry

```typescript
// src/app/web-transc/page.tsx
"use client";

import { Router } from './router/Router';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function WebTranscPage() {
  return (
    <ErrorBoundary>
      <Router />
    </ErrorBoundary>
  );
}
```

---

## View Structure

### View Template

Each view follows this structure:

```typescript
// src/app/web-transc/views/[ViewName]View.tsx
import { useRouterStore } from '../store/useRouterStore';
import { useWhisperStore } from '../store/useWhisperStore';
import { useWhisperWorker } from '../hooks/useWhisperWorker';

interface ViewProps {
  // Type-safe props from ViewParams
}

export default function ViewName(props: ViewProps) {
  const navigate = useRouterStore((state) => state.navigate);
  const whisperState = useWhisperStore();

  // Access worker if needed
  const { postMessage } = useWhisperWorker(handleWorkerMessage);

  // View-specific logic

  return (
    <div>
      {/* View UI */}
    </div>
  );
}
```

### View Responsibilities

#### 1. UploadView
- **Purpose**: Initial state, audio file upload
- **Displays**: Upload area, file browser, or audio URL input
- **Navigation**:
  - → `transcribe` (when audio uploaded)
  - → `saved` (show saved transcripts)
- **Audio Player**: Visible, inline position
- **Search**: Not applicable

#### 2. TranscribeView
- **Purpose**: Model loading and transcription process
- **Displays**:
  - Model selection
  - Load model button
  - Transcription progress
  - Streaming transcript
- **Navigation**:
  - → `transcript` (when complete, auto-save & navigate)
  - → `upload` (cancel/reset)
  - **BLOCKED** if transcription is running (show confirmation dialog)
- **Audio Player**: Visible, inline position, locked (can't change file)
- **Search**: Not applicable

#### 3. TranscriptView
- **Purpose**: Display completed transcript with actions
- **Props**: `{ id: string }` (transcript ID)
- **Displays**:
  - Audio player (sticky header)
  - Transcript with speaker diarization
  - Search functionality
  - Action buttons (Save, Export, Edit)
- **Navigation**:
  - → `upload` (back to home)
  - → `saved` (view all transcripts)
- **Audio Player**: Visible, sticky header position, synced with transcript
- **Search**: Active (search within current transcript)

#### 4. SavedView
- **Purpose**: Browse and manage saved transcripts
- **Displays**:
  - List of saved transcripts
  - Search/filter
  - Metadata (date, duration, speakers)
  - Actions (load, delete, edit)
- **Navigation**:
  - → `transcript` with `{ id }` (view transcript)
  - → `upload` (back to home)
- **Audio Player**: Hidden
- **Search**: Active (search across saved transcript names/metadata)

#### 5. SettingsView (Optional)
- **Purpose**: App configuration
- **Displays**: Model preferences, storage settings, etc.
- **Navigation**: → `upload` (back to home)
- **Audio Player**: Hidden
- **Search**: Not applicable

---

## Component Extraction

### Break Down WhisperDiarization.tsx

1. **Keep**: Worker management (moved to service), core business logic
2. **Extract to Views**: UI rendering
3. **Extract to Components**: Reusable UI pieces

```
OLD STRUCTURE:
WhisperDiarization.tsx (1447 lines)
├─ Upload UI
├─ Model loading UI
├─ Transcription UI
├─ Result display UI
├─ Saved transcripts UI
└─ All business logic + worker management

NEW STRUCTURE:
page.tsx (10 lines) → Router
├─ router/
│   ├── Router.tsx (view switcher + deep link handling)
│   ├── views.ts (lazy loaded views)
│   └── types.ts (view params)
├─ views/
│   ├── UploadView.tsx (~200 lines)
│   ├── TranscribeView.tsx (~250 lines)
│   ├── TranscriptView.tsx (~150 lines)
│   └── SavedView.tsx (~120 lines)
├─ components/ (shared)
│   ├── AppLayout.tsx (common layout wrapper)
│   ├── MediaFileUpload.tsx
│   ├── WhisperTranscript.tsx
│   ├── WhisperProgress.tsx
│   ├── ViewLoadingFallback.tsx (Suspense fallback)
│   └── ...
├─ services/
│   ├── WhisperWorkerService.ts (worker lifecycle ~150 lines)
│   └── TranscriptService.ts (optional: wrap storage)
├─ workers/ (KEEP EXISTING)
│   └── whisperDiarization.worker.js
├─ store/
│   ├── useRouterStore.ts (NEW ~120 lines)
│   └── useWhisperStore.ts (EXISTING)
└─ hooks/
    ├── useTranscripts.ts (EXISTING)
    └── useWhisperWorker.ts (NEW ~30 lines)
```

---

## Navigation Flows

### Primary Flows

```
1. NEW TRANSCRIPTION:
   upload → transcribe → transcript (auto-save) → upload

2. VIEW SAVED:
   upload → saved → transcript → saved

3. QUICK ACTIONS:
   Any view → back() → previous view

4. NAVIGATION BLOCKING:
   transcribe (status=running) → ANY view:
     - Show confirmation: "Transcription in progress. Cancel it?"
     - If confirm: terminate worker, reset state, navigate
     - If cancel: stay on transcribe view
```

### Navigation API Examples

```typescript
// Navigate to upload (home)
navigate('upload');

// Start transcription
navigate('transcribe');

// View specific transcript (with validation)
navigate('transcript', { id: 'transcript-123' });

// Browse saved
navigate('saved');

// Go back
back();
```

---

## Auto-Save Strategy

### After Transcription Completes

When TranscribeView receives `status === "complete"` from worker:

1. **Auto-save to IndexedDB** (background operation, no prompt)
2. **Show toast notification**: "Transcript saved!"
3. **Navigate to transcript view** with saved ID
4. **If save fails**:
   - Show error toast
   - Still navigate to transcript view (unsaved state)
   - Show "Save" button in transcript view for retry

### Configuration

```typescript
// Add to useWhisperStore or localStorage
interface UserPreferences {
  autoSaveTranscripts: boolean; // Default: true
}

// In TranscribeView
if (status === 'complete' && userPrefs.autoSaveTranscripts) {
  const id = await saveTranscript({ ... });
  navigate('transcript', { id });
}
```

---

## State Persistence Strategy

### Router State (via `useRouterStore` persist middleware)

**Persist:**
- `currentView` - Resume on last visited view
- `params` - Resume viewing the same transcript (e.g., transcript ID)

**Do NOT persist:**
- `history` - Reset navigation history on page reload (fresh stack)

### Whisper State (existing `useWhisperStore`)

**Keep current behavior:**
- **Persist**: model, device, language preferences
- **Do NOT persist**: transcription results, streaming words, audio

### Edge Case: Reload During Transcription

If user reloads page while `status === "running"`:

1. Worker state is lost (expected browser behavior)
2. On mount, detect if previous state was "running"
3. Show toast: "Transcription was interrupted. Please start again."
4. Reset to upload view
5. Optionally: Check worker backup mechanism (if implemented)

```typescript
// In Router.tsx or UploadView.tsx
useEffect(() => {
  const status = useWhisperStore.getState().model.status;
  if (status === 'running') {
    toast.warning('Previous transcription was interrupted');
    useWhisperStore.getState().reset();
  }
}, []);
```

---

## Media Player Behavior by View

| View         | Media Player Visible | Sticky Position | Audio State | Can Change File |
|--------------|---------------------|-----------------|-------------|-----------------|
| upload       | Yes                 | Inline          | User can load file | Yes |
| transcribe   | Yes                 | Inline          | Playing/paused | No (locked) |
| transcript   | Yes                 | Sticky Header   | Synced with transcript | No |
| saved        | No                  | Hidden          | Paused/cleared | N/A |

### Navigation Behavior

- **FROM transcript TO saved**: Pause audio, hide player
- **FROM saved TO transcript**: Restore audio, show player
- **MediaFileUpload ref**: Managed at Router level or shared via context/store

### Implementation Note

Consider moving `MediaFileUpload` state to Zustand for better cross-view access:

```typescript
// In useWhisperStore
interface AudioPlayerState {
  currentTime: number;
  isPlaying: boolean;
  audioBlob: Blob | null;
  // ... other player state
}
```

---

## Search Functionality

### Scope

**TranscriptView**: Search within current transcript segments
- Search query highlights matching words/segments
- Navigate between results (next/previous)

**SavedView**: Search across all saved transcripts
- Search by conversation name, file name, date
- Filter list dynamically

### State Management

**Decision**: Use **local component state** for search, not global Zustand

**Rationale**:
- Search is view-specific and should reset on navigation
- Prevents global state pollution
- Each view can implement search independently

```typescript
// In TranscriptView
const [searchQuery, setSearchQuery] = useState('');
const [currentResultIndex, setCurrentResultIndex] = useState(0);
const matches = useMemo(() => findMatches(segments, searchQuery), [segments, searchQuery]);

// In SavedView
const [searchQuery, setSearchQuery] = useState('');
const filteredTranscripts = useMemo(() =>
  transcripts.filter(t =>
    t.metadata.conversationName?.includes(searchQuery) ||
    t.metadata.fileName.includes(searchQuery)
  ),
  [transcripts, searchQuery]
);
```

**Remove from global store**: Delete `searchQuery`, `searchResultIndex`, `totalSearchResults` from `useWhisperStore.ui`

---

## Concurrent Transcription Behavior

### Decision: Block Navigation During Transcription

**If user attempts to navigate away from TranscribeView while `status === "running"`:**

1. **Show confirmation dialog**:
   ```
   "Transcription in progress. Do you want to cancel it?"
   [Cancel Transcription] [Continue Transcription]
   ```

2. **If user confirms cancellation**:
   - Terminate worker (or send cancel message)
   - Reset transcription state
   - Navigate to requested view

3. **If user cancels dialog**:
   - Stay on TranscribeView
   - Transcription continues

### Implementation

```typescript
// In useRouterStore.navigate
navigate: (view, params) => {
  const status = useWhisperStore.getState().model.status;
  const currentView = get().currentView;

  // Block navigation if leaving transcribe view during transcription
  if (currentView === 'transcribe' && status === 'running' && view !== 'transcribe') {
    const confirmed = confirm('Transcription in progress. Do you want to cancel it?');

    if (!confirmed) {
      return; // Stay on current view
    }

    // Cancel transcription
    whisperWorker.postMessage({ type: 'cancel' }); // Or recreate worker
    useWhisperStore.getState().reset();
  }

  // Continue with navigation
  // ... existing code
}
```

**Alternative (Advanced)**: Allow background transcription with global progress indicator. **Not recommended** for V1 due to complexity.

---

## URL Hash Sync (Enabled for Web)

Enable shareable links with hash-based routing:

```typescript
// URLs:
// /web-transc#upload
// /web-transc#transcript/abc123
// /web-transc#saved

// Handled in Router.tsx (see section 4 above)
```

### Browser Back Button Support

Implemented via `hashchange` event listener in Router.tsx (see section 4).

### Deep Link Validation

- Validate view name exists in `views` registry
- Validate transcript ID exists in IndexedDB before navigating
- Fallback to `upload` view on errors
- Show toast messages for user feedback

---

## Electron Compatibility

### Hash Routing in Electron

Electron's `BrowserWindow` supports hash-based routing natively:

```javascript
// In Electron main process (main.js)
const { BrowserWindow } = require('electron');

const mainWindow = new BrowserWindow({
  width: 1200,
  height: 800,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
  }
});

mainWindow.loadURL(
  isDev
    ? 'http://localhost:3000/web-transc#transcript/123'
    : `file://${path.join(__dirname, '../out/web-transc.html')}#transcript/123`
);
```

### Testing Checklist

Before finalizing migration, test in Electron:

- [ ] Navigation works (all views accessible)
- [ ] Worker initialization works (check worker path resolution)
- [ ] Deep links work from Electron protocol handlers
- [ ] localStorage/IndexedDB work correctly
- [ ] Media file upload works (file:// protocol)
- [ ] Hash routing updates correctly
- [ ] Browser back/forward works (if Electron has navigation buttons)

### Known Differences

- **No URL bar** in Electron (hash changes invisible to user)
- **Consider**: Add breadcrumb navigation for better UX in Electron
- **Worker path**: Ensure worker loads from correct path in production builds

```typescript
// Electron-specific worker path resolution
const isElectron = typeof navigator !== 'undefined' &&
  navigator.userAgent.toLowerCase().includes('electron');

const workerPath = isElectron
  ? './workers/whisperDiarization.worker.js'  // Electron uses relative paths
  : '/workers/whisperDiarization.worker.js';   // Web uses absolute paths
```

---

## Loading States Between View Transitions

### View-Specific Loading Fallbacks

```typescript
// src/app/web-transc/components/ViewLoadingFallback.tsx
import { ViewName } from '../router/types';

export function ViewLoadingFallback({ viewName }: { viewName: ViewName }) {
  // Show view-specific skeleton for better UX
  if (viewName === 'transcript') {
    return <TranscriptSkeleton />;
  }

  if (viewName === 'saved') {
    return <SavedListSkeleton />;
  }

  // Generic spinner for other views
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

function TranscriptSkeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="h-20 bg-gray-200 rounded" /> {/* Audio player skeleton */}
      <div className="h-10 bg-gray-200 rounded w-1/3" /> {/* Search bar */}
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded" />
        ))}
      </div>
    </div>
  );
}

function SavedListSkeleton() {
  return (
    <div className="p-4 space-y-3 animate-pulse">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-20 bg-gray-200 rounded" />
      ))}
    </div>
  );
}
```

---

## Accessibility (a11y) Requirements

### Keyboard Navigation

- **Tab order**: Should flow logically in each view
- **Escape key**: Close modals, clear search
- **Enter key**: Submit forms, activate primary actions
- **Arrow keys**: Navigate between search results (in TranscriptView)

### Focus Management

When navigating between views:

```typescript
// In each view component
useEffect(() => {
  // Set focus to main heading on mount
  const heading = document.querySelector('h1');
  heading?.setAttribute('tabIndex', '-1');
  heading?.focus();
}, []);
```

### Screen Reader Announcements

```typescript
// Announce view changes
useEffect(() => {
  const announcement = `Navigated to ${currentView} view`;

  // Create live region for announcements
  const liveRegion = document.getElementById('sr-announcements');
  if (liveRegion) {
    liveRegion.textContent = announcement;
  }
}, [currentView]);

// In AppLayout or Router
<div
  id="sr-announcements"
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
/>
```

### ARIA Labels

- Add `role="main"` to Router container
- Add `aria-live="polite"` to search results
- Add `aria-busy="true"` during transcription
- Add `aria-label` to icon buttons (edit, delete, etc.)

---

## Migration Plan

### Phase 1: Setup (No Breaking Changes)

**Estimated Time**: 2-3 hours

**Tasks**:

1. Create router structure
   - `router/Router.tsx`
   - `router/views.ts`
   - `router/types.ts`
   - `store/useRouterStore.ts`

2. Create service layer
   - `services/WhisperWorkerService.ts`
   - `hooks/useWhisperWorker.ts`

3. Create view stubs (empty components with basic layout)
   - `views/UploadView.tsx`
   - `views/TranscribeView.tsx`
   - `views/TranscriptView.tsx`
   - `views/SavedView.tsx`

4. Create loading fallback
   - `components/ViewLoadingFallback.tsx`

5. Wire up Router in `page.tsx` (parallel to old code)
   ```typescript
   const USE_NEW_ROUTER = false; // Feature flag
   return USE_NEW_ROUTER ? <Router /> : <WhisperDiarization />;
   ```

**Rollback**: Simply delete new files. Old code untouched.

**Success Criteria**:
- Project builds without errors
- Old app still works
- New router structure exists but not active

---

### Phase 2: Extract Views (Incremental)

**Estimated Time**: 6-8 hours

**Approach**: Extract one view at a time, test thoroughly, then move to next.

#### 2.1: Extract UploadView

**Tasks**:
1. Move upload UI from WhisperDiarization.tsx (lines ~790-955)
2. Move MediaFileUpload component integration
3. Move "Saved Transcripts" section (lines ~961-1151)
4. Wire up navigation to `transcribe` view

**Test**:
- [ ] File upload works
- [ ] Audio playback works
- [ ] Saved transcripts list renders
- [ ] Double-click to load transcript works
- [ ] Navigation to transcribe view works

#### 2.2: Extract TranscribeView

**Tasks**:
1. Move model loading UI (lines ~888-937)
2. Move language selector (lines ~940-953)
3. Move transcription progress (WhisperProgress component)
4. Move streaming transcript (StreamingTranscript component)
5. Integrate useWhisperWorker hook
6. Add navigation blocking logic (confirm on leave)

**Test**:
- [ ] Model loading works
- [ ] Transcription starts and shows progress
- [ ] Streaming words appear
- [ ] Navigation blocking works during transcription
- [ ] Auto-save on completion works
- [ ] Navigation to transcript view works

#### 2.3: Extract TranscriptView

**Tasks**:
1. Move result display UI (lines ~1154-1346)
2. Move sticky audio player header (lines ~791-875)
3. Move search functionality (lines ~822-872)
4. Reuse WhisperTranscript component
5. Wire up action buttons (Save, Export, Back to Home)

**Test**:
- [ ] Transcript renders correctly
- [ ] Audio player is sticky
- [ ] Audio syncs with transcript clicks
- [ ] Search highlights matches
- [ ] Export to LLM works
- [ ] Save button works
- [ ] Navigation works

#### 2.4: Extract SavedView

**Tasks**:
1. Move saved transcripts list from UploadView
2. Add search/filter functionality
3. Wire up load, edit, delete actions
4. Wire up navigation to transcript view

**Test**:
- [ ] Saved transcripts list renders
- [ ] Search filters list
- [ ] Load transcript navigates to transcript view
- [ ] Edit modals work
- [ ] Delete works

**Rollback per view**:
- Keep feature flag: `USE_NEW_ROUTER = false`
- Comment out problematic view in Router
- Fix issues before proceeding

**Success Criteria**:
- All views extracted
- Full user flow works (upload → transcribe → transcript → saved)
- No regressions in functionality

---

### Phase 3: Extract Service Layer

**Estimated Time**: 3-4 hours

**Tasks**:

1. Move worker initialization to WhisperWorkerService
2. Move worker message handlers to service
3. Update views to use useWhisperWorker hook
4. Test worker survives view transitions

**Test**:
- [ ] Worker initializes once on app start
- [ ] Worker persists across view navigation
- [ ] Multiple views can subscribe to worker messages
- [ ] Worker cleanup on app unmount works

**Optional**: Create TranscriptService to wrap storage operations

**Rollback**: Keep worker management in WhisperDiarization.tsx until service is fully tested

**Success Criteria**:
- Worker managed by service
- No worker recreation during navigation
- All worker-dependent features work

---

### Phase 4: Cleanup

**Estimated Time**: 1-2 hours

**Tasks**:

1. Enable new router permanently
   ```typescript
   // Remove feature flag from page.tsx
   return <Router />;
   ```

2. Delete old WhisperDiarization.tsx

3. Remove search state from useWhisperStore (moved to local state)

4. Update documentation

5. Run final tests in both web and Electron

**Point of No Return**:
- Only delete old code after 2 weeks of new architecture in production
- Keep git history for easy rollback

**Success Criteria**:
- Codebase is clean
- No unused files
- All tests pass
- Documentation updated

---

### Phase 5: Testing & Polish

**Estimated Time**: 2-3 hours

**Tasks**:

1. **Unit Tests**
   - Test useRouterStore (navigate, back, replace)
   - Test WhisperWorkerService (subscribe, postMessage, cleanup)
   - Test each view in isolation

2. **Integration Tests**
   - Test full user flows
   - Test navigation blocking during transcription
   - Test deep links
   - Test browser back/forward

3. **Cross-Platform Tests**
   - Test in web browser (Chrome, Firefox, Safari)
   - Test in Electron
   - Test hash routing in both

4. **Accessibility Tests**
   - Test keyboard navigation
   - Test screen reader announcements
   - Test focus management

**Success Criteria**:
- All tests pass
- No accessibility violations
- Works in web and Electron

---

## Total Timeline Estimate

| Phase | Estimated Time | Dependencies |
|-------|---------------|--------------|
| Setup (Phase 1) | 2-3 hours | None |
| Extract Views (Phase 2) | 6-8 hours | Phase 1 |
| Extract Service (Phase 3) | 3-4 hours | Phase 2 |
| Cleanup (Phase 4) | 1-2 hours | Phase 3 |
| Testing & Polish (Phase 5) | 2-3 hours | All phases |
| **Total** | **14-20 hours** | |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Breaking existing features | Medium | High | Incremental migration, feature flag, parallel code |
| Worker lifecycle bugs | Medium | High | Service layer with thorough testing |
| Performance regression | Low | Medium | Lazy loading, code splitting, benchmarking |
| Type safety issues | Low | Low | Strict TypeScript config, comprehensive types |
| Navigation bugs | Medium | Medium | Comprehensive testing, URL validation |
| Electron compatibility | Low | High | Test in Electron after each phase |
| State persistence issues | Low | Medium | Clear persistence strategy, edge case handling |

---

## Analytics Integration Points (Optional)

If analytics is implemented, add tracking at:

### 1. Navigation Events (in `useRouterStore.navigate`)
```typescript
navigate: (view, params) => {
  // ... existing code

  analytics?.track('view_navigated', {
    from: get().currentView,
    to: view,
    params,
    timestamp: Date.now(),
  });

  // ... continue navigation
}
```

### 2. Transcription Events (in TranscribeView)
```typescript
// On transcription start
analytics?.track('transcription_started', {
  model,
  language,
  audioDuration,
});

// On transcription complete
analytics?.track('transcription_completed', {
  model,
  language,
  duration: generationTime,
  success: true,
});

// On transcription error
analytics?.track('transcription_failed', {
  model,
  error: errorMessage,
});
```

### 3. Storage Events (in useTranscripts hook)
```typescript
// On save
analytics?.track('transcript_saved', {
  transcriptId,
  fileSize,
  hasAudio,
});

// On delete
analytics?.track('transcript_deleted', {
  transcriptId,
});
```

### 4. Error Events (in ErrorBoundary)
```typescript
componentDidCatch(error, errorInfo) {
  analytics?.track('app_error', {
    error: error.message,
    stack: errorInfo.componentStack,
    view: currentView,
  });
}
```

---

## Success Criteria

### Functional Requirements

- ✅ All existing features work (upload, transcribe, view, save)
- ✅ Navigation is smooth and intuitive
- ✅ Works identically in web and Electron
- ✅ No build-time conditionals or workarounds
- ✅ URL hash sync works for shareable links (web)
- ✅ Worker persists across view transitions
- ✅ Deep links validated and handle errors gracefully
- ✅ Auto-save works after transcription

### Non-Functional Requirements

- ✅ Code is modular and maintainable
- ✅ Each view < 250 lines of code
- ✅ Type-safe navigation API
- ✅ Easy to add new views
- ✅ Test coverage > 70%
- ✅ Accessible (keyboard navigation, screen readers)

### Performance

- ✅ Lazy loading reduces initial bundle size
- ✅ View transitions < 100ms
- ✅ No memory leaks from navigation
- ✅ Worker not recreated on navigation

---

## Questions for Implementer

Before starting, answer these:

1. **Should URL hash sync be implemented?**
   - ✅ YES (Enables shareable links in web)

2. **Should browser back button work?**
   - ✅ YES (via `hashchange` listener)

3. **Do we need transition animations between views?**
   - ⏸️ NO for V1 (can add later with Framer Motion)

4. **Should navigation state persist in localStorage?**
   - ✅ YES (Resume where user left off)

5. **Do we need a "loading view" between transitions?**
   - ✅ YES (view-specific skeletons)

6. **Should auto-save be configurable?**
   - ⏸️ NO for V1 (always auto-save, can add preference later)

7. **Should search state be global or local?**
   - ✅ LOCAL (view-specific, reset on navigation)

8. **Should navigation be blocked during transcription?**
   - ✅ YES (show confirmation dialog)

---

## References

- **Current Code**: `src/app/web-transc/components/WhisperDiarization.tsx`
- **Zustand Docs**: https://docs.pmnd.rs/zustand
- **React Lazy**: https://react.dev/reference/react/lazy
- **Next.js Static Export**: https://nextjs.org/docs/app/building-your-application/deploying/static-exports
- **Electron BrowserWindow**: https://www.electronjs.org/docs/latest/api/browser-window

---

## Final File Structure

```
src/app/web-transc/
├── page.tsx                          # Entry point (15 lines)
├── router/
│   ├── Router.tsx                    # View switcher + deep links (~100 lines)
│   ├── views.ts                      # Lazy-loaded view registry (~20 lines)
│   └── types.ts                      # ViewName, ViewParams types (~30 lines)
├── views/
│   ├── UploadView.tsx                # Audio upload + saved list (~200 lines)
│   ├── TranscribeView.tsx            # Model load + transcription (~250 lines)
│   ├── TranscriptView.tsx            # Completed transcript display (~150 lines)
│   └── SavedView.tsx                 # Saved transcripts browser (~120 lines)
├── components/                       # Shared/reusable components
│   ├── AppLayout.tsx                 # Common layout wrapper
│   ├── MediaFileUpload.tsx           # Audio player (EXISTING)
│   ├── WhisperTranscript.tsx         # Transcript renderer (EXISTING)
│   ├── WhisperProgress.tsx           # Progress bar (EXISTING)
│   ├── StreamingTranscript.tsx       # Streaming display (EXISTING)
│   ├── ModelSelector.tsx             # Model picker (EXISTING)
│   ├── ViewLoadingFallback.tsx       # Suspense fallback (NEW)
│   ├── EditConversationModal.tsx     # (EXISTING)
│   ├── EditSpeakersModal.tsx         # (EXISTING)
│   ├── ExportToLLMModal.tsx          # (EXISTING)
│   └── ErrorBoundary.tsx             # (EXISTING)
├── services/
│   ├── WhisperWorkerService.ts       # Worker lifecycle (~150 lines)
│   └── TranscriptService.ts          # Optional: wrap storage (~80 lines)
├── workers/                          # KEEP EXISTING
│   └── whisperDiarization.worker.js
├── store/
│   ├── useRouterStore.ts             # NEW: Navigation state (~120 lines)
│   └── useWhisperStore.ts            # EXISTING: Transcription state
├── hooks/
│   ├── useTranscripts.ts             # EXISTING: Storage operations
│   ├── useWhisperWorker.ts           # NEW: Worker hook (~30 lines)
│   ├── useTemplates.ts               # EXISTING
│   ├── useWebGPU.ts                  # EXISTING
│   └── useTranscriptionWorker.ts     # EXISTING (may be deprecated)
├── config/
│   └── modelConfig.ts                # EXISTING
├── types/
│   └── index.ts                      # EXISTING
└── utils/
    ├── transcriptFormatter.ts        # EXISTING
    └── speakerColors.ts              # EXISTING
```

---

## Conclusion

This architecture provides a clean, maintainable, and unified solution that works seamlessly in both web and Electron environments. The view-based SPA approach eliminates the need for complex build scripts, conditional rendering, and duplicate code paths.

The implementation should be done incrementally to minimize risk, with each phase fully tested before proceeding to the next.

**Key Improvements in V1.1:**
- ✅ Worker service layer (prevents recreation bugs)
- ✅ Deep link validation (graceful error handling)
- ✅ Navigation blocking during transcription (UX clarity)
- ✅ Auto-save strategy (clear flow)
- ✅ State persistence strategy (resume on reload)
- ✅ Media player behavior clarification (per view)
- ✅ Search state management (local, not global)
- ✅ Electron compatibility guide (testing checklist)
- ✅ Loading states (view-specific skeletons)
- ✅ Accessibility requirements (a11y)
- ✅ Migration rollback strategy (de-risking)

---

**Document End**
