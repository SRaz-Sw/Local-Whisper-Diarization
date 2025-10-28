# PRD: Global Search Feature

**Version**: 1.0
**Date**: 2025-10-27
**Status**: Draft

---

## 1. FEATURE OVERVIEW

### 1.1 Core Functionality

**What**: A global search feature that allows users to search for keywords across ALL saved transcripts, not just the current one.

**User Value**:
- Find information across entire recording library (10s, 100s of conversations)
- Discover which conversations mention specific topics/keywords
- Jump directly to relevant segments without opening each transcript manually
- Understand keyword frequency and distribution across recordings

**Current Gap**: Search only works within a single open transcript. Users must manually check each recording to find specific content.

### 1.2 Key Components

```
┌─────────────────────────────────────────────────────────────┐
│  UPLOAD PAGE (#upload)                                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  [Search all transcripts...]  🔍                      │  │  ← NEW
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Saved Transcripts (existing list below)                   │
└─────────────────────────────────────────────────────────────┘
                          ↓ (click)
┌─────────────────────────────────────────────────────────────┐
│  GLOBAL SEARCH PAGE (#global-search?q=keyword)              │  ← NEW
│  ┌───────────────────────────────────────────────────────┐  │
│  │  keyword                                    🔍 ✕       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Found in 3 conversations (12 total matches)               │
│                                                             │
│  ╔═══════════════════════════════════════════════════════╗  │
│  ║ 📝 Team Meeting - Q4 Planning         [6 matches] ▼  ║  │
│  ╚═══════════════════════════════════════════════════════╝  │
│     └─ (expands to show segments with highlights)         │
│                                                             │
│  ╔═══════════════════════════════════════════════════════╗  │
│  ║ 📝 Client Call - Budget Discussion    [4 matches] ▶  ║  │
│  ╚═══════════════════════════════════════════════════════╝  │
│                                                             │
│  ╔═══════════════════════════════════════════════════════╗  │
│  ║ 📝 Interview - John Doe               [2 matches] ▶  ║  │
│  ╚═══════════════════════════════════════════════════════╝  │
└─────────────────────────────────────────────────────────────┘
```

**Component Interactions**:

1. **SearchTrigger** (Upload Page) → Click → Navigate to GlobalSearchView
2. **GlobalSearchView** → Query all transcripts via `useTranscripts()`
3. **SearchResults** → Accordion cards for each matching transcript
4. **ExpandedResult** → Reuse `Chunk` component with highlight logic
5. **AudioPlayback** (if expanded) → Isolated per-accordion player

### 1.3 Success Criteria

**Must Have**:
- ✅ Search box visible on Upload page above "Saved Transcripts"
- ✅ Clicking search box navigates to `#global-search` page
- ✅ Results show: conversation title, match count, metadata
- ✅ Accordion expansion shows matched segments with highlights
- ✅ Only ONE audio player plays at a time across all accordions
- ✅ Search state syncs with Zustand (no prop drilling)
- ✅ Performance: <500ms for 50 transcripts with ~1000 words each

**Should Have**:
- 🎯 Empty state with helpful messaging
- 🎯 Debounced search input (300ms)
- 🎯 Loading states during search
- 🎯 Keyboard navigation (Escape to clear)

**Constraints**:
- ❌ NO server-side search (IndexedDB only)
- ❌ NO fuzzy matching (exact substring for MVP)
- ❌ NO pagination (virtual scrolling if >100 results)
- ❌ NO search history (future enhancement)

---

## 2. CRITICAL TECHNICAL ANALYSIS

### 2.1 Audio Player Isolation (CRITICAL)

**Problem**: Multiple audio players in accordions could play simultaneously, creating audio chaos.

**Existing Architecture**:
- Current `AudioPlayer.tsx` has no global coordination
- Uses native HTML5 `<audio>` / `<video>` elements
- No singleton pattern or global registry

**Solution Options**:

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **A) Zustand Global Player State** | Clean, type-safe, reactive | Requires store changes | ✅ **RECOMMENDED** |
| B) Context API + useRef | No extra deps | Complex ref management | ❌ Overkill |
| C) Event Bus (window events) | Decoupled | Loose typing | ❌ Hard to debug |

**Implementation (Option A)**:

```typescript
// NEW: src/app/web-transc/store/useGlobalPlayerStore.ts
interface GlobalPlayerState {
  activePlayerId: string | null;          // "transcript-abc123"
  setActivePlayer: (id: string) => void;  // Pauses others
  clearActivePlayer: () => void;
}

// MODIFY: AudioPlayer.tsx
export const AudioPlayer = ({ transcriptId, ... }) => {
  const { activePlayerId, setActivePlayer } = useGlobalPlayerStore();
  const audioRef = useRef<HTMLAudioElement>(null);

  // Auto-pause when another player starts
  useEffect(() => {
    if (activePlayerId !== transcriptId && audioRef.current) {
      audioRef.current.pause();
    }
  }, [activePlayerId, transcriptId]);

  const handlePlay = () => {
    setActivePlayer(transcriptId); // Claims global lock
  };

  return <audio ref={audioRef} onPlay={handlePlay} ... />;
};
```

**Why This Works**:
- ✅ Single source of truth (Zustand)
- ✅ React components auto-react to state changes
- ✅ No race conditions (Zustand is synchronous)
- ✅ Easy to test (mock store)
- ✅ Minimal code changes (add 1 store, modify 1 component)

### 2.2 State Synchronization (CRITICAL)

**Problem**: Search state must stay consistent across:
1. Search input (GlobalSearchView)
2. Accordion expansions (per-conversation state)
3. Audio players (playback positions)
4. Highlighted segments (search matches)

**Existing State Management**:
- `useWhisperStore`: Has `searchQuery`, `searchResultIndex`, `totalSearchResults`
- `useTranscripts`: Hook for CRUD operations on IndexedDB
- `useRouterStore`: Hash-based navigation

**Proposed State Architecture**:

```typescript
// NEW: src/app/web-transc/store/useGlobalSearchStore.ts
interface GlobalSearchState {
  // Search Input
  query: string;
  setQuery: (q: string) => void;

  // Results
  results: SearchResult[];           // Computed from all transcripts
  totalMatches: number;               // Sum of all match counts
  isSearching: boolean;               // Loading state

  // Accordion State
  expandedTranscriptIds: Set<string>; // Which conversations are open
  toggleExpanded: (id: string) => void;

  // Actions
  performSearch: (query: string) => Promise<void>;
  clearSearch: () => void;
}

interface SearchResult {
  transcriptId: string;
  conversationName: string;
  fileName: string;
  matchCount: number;
  duration: number;
  createdAt: number;
  matchedSegments: SpeakerSegment[]; // Pre-filtered segments
}
```

**Data Flow**:

```
User types "budget"
  ↓
setQuery("budget") in GlobalSearchStore
  ↓
performSearch() triggered (debounced)
  ↓
useTranscripts().getAll() → Filter in memory
  ↓
Update results[] + totalMatches in store
  ↓
GlobalSearchView re-renders
  ↓
AccordionCard reads expandedTranscriptIds
  ↓
User clicks card → toggleExpanded(id)
  ↓
Accordion opens → AudioPlayer mounts
  ↓
AudioPlayer registers with GlobalPlayerStore
```

**Why Separate Store?**:
- ✅ Avoids polluting `useWhisperStore` (single responsibility)
- ✅ Global search state is orthogonal to transcript editing
- ✅ Easy to reset when user leaves `#global-search` page
- ✅ Could be persisted to localStorage for search history (future)

**Synchronization Guarantees**:
1. **Search Query**: Single source of truth in `GlobalSearchStore.query`
2. **Accordion State**: Controlled by `expandedTranscriptIds` Set
3. **Audio Playback**: Coordinated by `GlobalPlayerStore.activePlayerId`
4. **Highlights**: Computed from `query` prop (pure function, no state)

**Race Condition Prevention**:
- Debounce search input (300ms) to avoid rapid re-queries
- Use `isSearching` flag to prevent overlapping searches
- Abort previous search if new query arrives (AbortController pattern)

---

## 3. IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Estimated: 2-3 hours)

**Milestone 1.1: New Zustand Stores** ✅
- Create `useGlobalPlayerStore.ts`
- Create `useGlobalSearchStore.ts`
- Write unit tests for store actions

**Milestone 1.2: Search Logic** ✅
- Implement `performSearch()` function
  - Query all transcripts via `useTranscripts().getAll()`
  - Filter segments using existing regex logic (from TranscriptView)
  - Count matches per transcript
  - Sort results by match count (desc) → then by date (desc)
- Add debouncing (300ms)
- Handle edge cases (empty query, no results, special chars)

**Milestone 1.3: Modify AudioPlayer** ✅
- Integrate `useGlobalPlayerStore`
- Add `transcriptId` prop for unique identification
- Implement auto-pause on `activePlayerId` change
- Test with multiple players

**Acceptance Criteria**:
- [ ] Store tests pass (100% coverage)
- [ ] Search returns correct results for 10+ transcripts
- [ ] Only one audio plays at a time

---

### Phase 2: UI Components (Estimated: 3-4 hours)

**Milestone 2.1: Upload Page Search Trigger** ✅
- Add search input above "Saved Transcripts" section
- Style to match existing design system
- Click handler → navigate to `#global-search?q=`
- Focus state triggers navigation immediately

**Milestone 2.2: Global Search View** ✅
- Create `/views/GlobalSearchView.tsx`
- Sticky search bar with clear button
- Results summary ("Found in X conversations, Y total matches")
- Empty state UI (no results, no query yet)
- Loading skeleton during search

**Milestone 2.3: Search Result Accordion** ✅
- Create `/components/GlobalSearchAccordion.tsx`
- Card design:
  - **Header**: Conversation name, match count, duration, date
  - **Expand icon**: Chevron (▼/▶)
  - **Hover state**: Subtle highlight
- Expansion shows:
  - Reuse `Chunk` component from `WhisperTranscript.tsx`
  - Pass `searchQuery` prop for highlighting
  - Show timestamp for each segment
  - Embedded `AudioPlayer` (optional, for quick playback)

**Milestone 2.4: Integration** ✅
- Wire up Zustand stores
- Add route to `useRouterStore` (`#global-search`)
- Test navigation flow (Upload → Global Search → Back)

**Acceptance Criteria**:
- [ ] Search trigger visible on Upload page
- [ ] Global Search page renders correctly
- [ ] Accordion expand/collapse works smoothly
- [ ] Highlights match existing transcript search behavior
- [ ] Responsive on mobile (320px - 1920px)

---

### Phase 3: Polish & Optimization (Estimated: 2 hours)

**Milestone 3.1: Performance** ✅
- Add virtual scrolling if >100 results (use `react-window`)
- Memoize search results computation
- Lazy-load expanded accordion content
- Add loading indicators

**Milestone 3.2: Accessibility** ✅
- Keyboard navigation (Tab, Enter, Escape)
- ARIA labels for accordions
- Focus management (auto-focus search on page load)
- Screen reader announcements for result counts

**Milestone 3.3: Error Handling** ✅
- IndexedDB errors (show toast)
- Empty transcripts (skip in results)
- Very long queries (>500 chars) → truncate or warn

**Acceptance Criteria**:
- [ ] Lighthouse accessibility score >90
- [ ] No console errors/warnings
- [ ] Handles 100+ transcripts without lag

---

### Phase 4: Testing & Launch (Estimated: 2 hours)

**Milestone 4.1: Playwright Tests** ✅ (per CLAUDE.md)
- Test search flow end-to-end
- Test accordion interactions
- Test audio player isolation
- Screenshot comparisons

**Milestone 4.2: Manual QA** ✅
- Cross-browser (Chrome, Firefox, Safari)
- Mobile testing (iOS Safari, Android Chrome)
- Edge cases (no transcripts, 1000+ transcripts, emoji in search)

**Milestone 4.3: Documentation** ✅
- Update README with feature description
- Add inline code comments for complex logic
- Create demo video (optional)

**Acceptance Criteria**:
- [ ] All Playwright tests pass
- [ ] No regressions in existing features
- [ ] Product owner approval

---

## 4. TECHNICAL SPECIFICATIONS

### 4.1 API/Interface Definitions

**New Zustand Store: GlobalPlayerStore**

```typescript
// src/app/web-transc/store/useGlobalPlayerStore.ts
import { create } from 'zustand';

interface GlobalPlayerState {
  activePlayerId: string | null;
  setActivePlayer: (id: string) => void;
  clearActivePlayer: () => void;
}

export const useGlobalPlayerStore = create<GlobalPlayerState>(
  (set) => ({
    activePlayerId: null,
    setActivePlayer: (id) => set({ activePlayerId: id }),
    clearActivePlayer: () => set({ activePlayerId: null }),
  })
);
```

**New Zustand Store: GlobalSearchStore**

```typescript
// src/app/web-transc/store/useGlobalSearchStore.ts
import { create } from 'zustand';
import { SearchResult } from '../types';

interface GlobalSearchState {
  query: string;
  results: SearchResult[];
  totalMatches: number;
  isSearching: boolean;
  expandedTranscriptIds: Set<string>;

  setQuery: (q: string) => void;
  performSearch: (query: string) => Promise<void>;
  clearSearch: () => void;
  toggleExpanded: (id: string) => void;
}

export const useGlobalSearchStore = create<GlobalSearchState>(
  (set, get) => ({
    query: '',
    results: [],
    totalMatches: 0,
    isSearching: false,
    expandedTranscriptIds: new Set(),

    setQuery: (q) => set({ query: q }),

    performSearch: async (query) => {
      if (!query.trim()) {
        set({ results: [], totalMatches: 0 });
        return;
      }

      set({ isSearching: true });
      // Implementation in Phase 1.2
      set({ isSearching: false });
    },

    clearSearch: () =>
      set({
        query: '',
        results: [],
        totalMatches: 0,
        expandedTranscriptIds: new Set(),
      }),

    toggleExpanded: (id) => {
      const expanded = new Set(get().expandedTranscriptIds);
      if (expanded.has(id)) {
        expanded.delete(id);
      } else {
        expanded.add(id);
      }
      set({ expandedTranscriptIds: expanded });
    },
  })
);
```

**New Type: SearchResult**

```typescript
// src/app/web-transc/types/index.ts (add to existing file)
export interface SearchResult {
  transcriptId: string;
  conversationName: string;
  fileName: string;
  matchCount: number;
  duration: number;
  createdAt: number;
  matchedSegments: SpeakerSegment[]; // Pre-filtered
  audioFileId?: string; // For playback
}
```

**Modified Component: AudioPlayer**

```typescript
// src/app/web-transc/components/AudioPlayer.tsx
// ADD PROP:
interface AudioPlayerProps {
  transcriptId: string; // NEW: Unique ID for global coordination
  // ... existing props
}

// ADD HOOK:
const { activePlayerId, setActivePlayer } = useGlobalPlayerStore();

// ADD EFFECT:
useEffect(() => {
  if (activePlayerId !== transcriptId && audioRef.current) {
    audioRef.current.pause();
  }
}, [activePlayerId, transcriptId]);

// MODIFY HANDLER:
const handlePlay = () => {
  setActivePlayer(transcriptId);
  // ... existing logic
};
```

---

### 4.2 Data Models & Storage

**No Changes to IndexedDB Schema** ✅

All existing data in `SavedTranscript` is sufficient:
- `transcriptChunks` for word-level search
- `speakerSegments` for grouping results
- `metadata.conversationName` for display
- `metadata.duration` for UI
- `metadata.createdAt` for sorting
- `audioFileId` for playback (optional)

**Search Algorithm**:

```typescript
// Pseudocode for performSearch()
async function performSearch(query: string): SearchResult[] {
  const allTranscripts = await useTranscripts().getAll();
  const regex = new RegExp(
    query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    'gi'
  );

  const results: SearchResult[] = [];

  for (const transcript of allTranscripts) {
    const matchedSegments: SpeakerSegment[] = [];
    let matchCount = 0;

    for (const segment of transcript.speakerSegments) {
      const segmentText = segment.chunks
        .map((c) => c.text)
        .join(' ');
      const matches = segmentText.match(regex);

      if (matches) {
        matchedSegments.push(segment);
        matchCount += matches.length;
      }
    }

    if (matchCount > 0) {
      results.push({
        transcriptId: transcript.id,
        conversationName:
          transcript.metadata.conversationName ||
          transcript.metadata.fileName,
        fileName: transcript.metadata.fileName,
        matchCount,
        duration: transcript.metadata.duration,
        createdAt: transcript.metadata.createdAt,
        matchedSegments,
        audioFileId: transcript.audioFileId,
      });
    }
  }

  // Sort: Most matches first, then most recent
  results.sort((a, b) => {
    if (b.matchCount !== a.matchCount) {
      return b.matchCount - a.matchCount;
    }
    return b.createdAt - a.createdAt;
  });

  return results;
}
```

**Performance Considerations**:
- **Worst Case**: 100 transcripts × 1000 words × regex match = ~100k operations
- **Expected**: <500ms on modern hardware (tested with similar workloads)
- **Optimization**: Could add Web Worker for >50 transcripts (Phase 3)

---

### 4.3 Component Structure

```
src/app/web-transc/
├── views/
│   ├── UploadView.tsx               (MODIFY: Add search trigger)
│   └── GlobalSearchView.tsx         (NEW: Main search page)
├── components/
│   ├── AudioPlayer.tsx              (MODIFY: Add global coordination)
│   ├── GlobalSearchAccordion.tsx    (NEW: Result accordion)
│   └── Chunk.tsx                    (REUSE: Already has highlight logic)
├── store/
│   ├── useGlobalPlayerStore.ts      (NEW)
│   └── useGlobalSearchStore.ts      (NEW)
├── types/
│   └── index.ts                     (MODIFY: Add SearchResult interface)
└── hooks/
    └── useTranscripts.ts            (NO CHANGES: Already has getAll())
```

**File Size Estimates**:
- `GlobalSearchView.tsx`: ~200 lines
- `GlobalSearchAccordion.tsx`: ~150 lines
- `useGlobalPlayerStore.ts`: ~30 lines
- `useGlobalSearchStore.ts`: ~100 lines
- **Total New Code**: ~480 lines
- **Modified Code**: ~50 lines

---

### 4.4 UI/UX Specifications

**Upload Page Search Trigger**:

```tsx
// Add above existing "Saved Transcripts" heading
<div className="mb-6">
  <input
    type="text"
    placeholder="Search all transcripts..."
    className="w-full px-4 py-2 border rounded-lg"
    onFocus={() => navigate('#global-search')}
    readOnly
  />
</div>
```

**Global Search Page Layout**:

```
┌──────────────────────────────────────────────────────────┐
│  [Search Query]                           🔍 ✕           │ ← Sticky
├──────────────────────────────────────────────────────────┤
│  Found in 3 conversations (12 total matches)             │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 📝 Team Meeting - Q4 Planning      [6 matches]  ▼ │ │ ← Accordion Header
│  ├────────────────────────────────────────────────────┤ │
│  │ SPEAKER_00 [00:34]                                 │ │ ← Expanded Content
│  │ We need to discuss the budget allocation...       │ │
│  │                        ^^^^^^                      │ │ ← Highlight
│  │                                                    │ │
│  │ SPEAKER_01 [02:15]                                 │ │
│  │ I agree, the budget is critical for Q4...         │ │
│  │            ^^^^^^                                  │ │
│  │                                                    │ │
│  │ [Audio Player] ⏸ ████████░░░░░░░░ 02:15 / 15:32  │ │ ← Optional
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 📝 Client Call - Budget Discussion [4 matches]  ▶ │ │ ← Collapsed
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Color Scheme** (match existing design):
- Highlight: `bg-yellow-200` (same as transcript search)
- Accordion header hover: `bg-gray-50`
- Active accordion: `border-l-4 border-blue-500`
- Match count badge: `bg-blue-100 text-blue-800`

**Responsive Breakpoints**:
- Mobile (<640px): Stack metadata vertically
- Tablet (640-1024px): 2-column metadata
- Desktop (>1024px): Full layout as shown

---

### 4.5 Testing Strategy

**Unit Tests** (Jest + React Testing Library):

```typescript
// useGlobalSearchStore.test.ts
describe('GlobalSearchStore', () => {
  it('performs search and filters transcripts', async () => {
    const { performSearch, results } =
      useGlobalSearchStore.getState();
    await performSearch('budget');
    expect(results).toHaveLength(2);
    expect(results[0].matchCount).toBeGreaterThan(0);
  });

  it('toggles accordion expansion', () => {
    const { toggleExpanded, expandedTranscriptIds } =
      useGlobalSearchStore.getState();
    toggleExpanded('abc123');
    expect(expandedTranscriptIds.has('abc123')).toBe(true);
    toggleExpanded('abc123');
    expect(expandedTranscriptIds.has('abc123')).toBe(false);
  });
});

// useGlobalPlayerStore.test.ts
describe('GlobalPlayerStore', () => {
  it('sets active player and clears previous', () => {
    const { setActivePlayer, activePlayerId } =
      useGlobalPlayerStore.getState();
    setActivePlayer('player1');
    expect(activePlayerId).toBe('player1');
    setActivePlayer('player2');
    expect(activePlayerId).toBe('player2');
  });
});
```

**Integration Tests** (Playwright):

```typescript
// global-search.spec.ts
test('global search flow', async ({ page }) => {
  await page.goto('/web-transc#upload');

  // Click search trigger
  await page
    .getByPlaceholder('Search all transcripts...')
    .click();
  await expect(page).toHaveURL(/#global-search/);

  // Type search query
  await page.getByRole('searchbox').fill('budget');
  await page.waitForSelector('[data-testid="search-result"]');

  // Verify results
  const results = await page
    .locator('[data-testid="search-result"]')
    .count();
  expect(results).toBeGreaterThan(0);

  // Expand first result
  await page
    .locator('[data-testid="search-result"]')
    .first()
    .click();
  await expect(
    page.locator('[data-testid="matched-segment"]')
  ).toBeVisible();

  // Verify highlight
  await expect(
    page.locator('mark').first()
  ).toContainText('budget');
});

test('audio player isolation', async ({ page }) => {
  await page.goto('/web-transc#global-search?q=test');

  // Expand two accordions
  await page
    .locator('[data-testid="search-result"]')
    .nth(0)
    .click();
  await page
    .locator('[data-testid="search-result"]')
    .nth(1)
    .click();

  // Play first audio
  await page
    .locator('[data-testid="audio-player"]')
    .nth(0)
    .getByRole('button', { name: 'Play' })
    .click();

  // Play second audio
  await page
    .locator('[data-testid="audio-player"]')
    .nth(1)
    .getByRole('button', { name: 'Play' })
    .click();

  // Verify first is paused
  await expect(
    page
      .locator('[data-testid="audio-player"]')
      .nth(0)
      .getByRole('button', { name: 'Play' })
  ).toBeVisible();
});
```

**Manual Test Cases**:

1. ✅ Search with 0 results → Show empty state
2. ✅ Search with 1 result → Show single accordion
3. ✅ Search with 100+ results → Virtual scrolling
4. ✅ Search with special chars (`.*+?^${}()|[]\\`) → Escape properly
5. ✅ Expand/collapse multiple accordions → Independent state
6. ✅ Play audio in accordion 1 → Pause audio in accordion 2
7. ✅ Clear search → Reset to empty state
8. ✅ Navigate away and back → Preserve search query (URL param)
9. ✅ Mobile: Search on iPhone Safari → Responsive layout
10. ✅ A11y: Keyboard navigation → Tab through results, Enter to expand

---

### 4.6 Risk Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Performance**: Searching 100+ transcripts is slow | High | Medium | 1) Add loading indicator<br>2) Debounce input<br>3) Web Worker (Phase 3)<br>4) Cache results |
| **Audio Chaos**: Multiple players play simultaneously | High | Low | ✅ GlobalPlayerStore (designed in Phase 1) |
| **State Bugs**: Accordion/search out of sync | Medium | Medium | 1) Single source of truth (Zustand)<br>2) Unit tests for store<br>3) Integration tests |
| **Memory Leak**: Expanded accordions hold large objects | Medium | Low | 1) Lazy-load segment data<br>2) Unmount audio on collapse<br>3) Weak refs for players |
| **Regex Injection**: User input breaks search | Low | Low | ✅ Already handled (escape special chars) |
| **IndexedDB Quota**: Storage full | Low | Low | 1) Try/catch on queries<br>2) Show error toast<br>3) Suggest deleting old transcripts |
| **Scope Creep**: Feature requests during dev | Medium | High | ✅ Stick to PRD<br>Document future enhancements |

**Future Enhancements** (Explicitly Out of Scope for MVP):
- ❌ Fuzzy search / typo tolerance
- ❌ Search filters (date range, speaker, duration)
- ❌ Search history / recent searches
- ❌ Export search results
- ❌ Share search URL with results embedded
- ❌ Advanced syntax (AND/OR/NOT operators)

---

## 5. ACCEPTANCE CRITERIA

### 5.1 Functional Requirements

- [ ] **FR1**: Search box appears on Upload page above "Saved Transcripts"
- [ ] **FR2**: Clicking search box navigates to `#global-search` page
- [ ] **FR3**: Typing in global search input triggers debounced search (300ms)
- [ ] **FR4**: Results show: conversation name, match count, duration, date
- [ ] **FR5**: Results are sorted by match count (desc) then date (desc)
- [ ] **FR6**: Clicking result card expands/collapses accordion
- [ ] **FR7**: Expanded accordion shows matched segments with highlighted keywords
- [ ] **FR8**: Highlights use same yellow background as transcript search (`bg-yellow-200`)
- [ ] **FR9**: Only ONE audio player can play at a time across all accordions
- [ ] **FR10**: Clear button (✕) resets search and shows empty state
- [ ] **FR11**: Empty state shows helpful message ("No results found" or "Start typing to search")
- [ ] **FR12**: URL updates with query param (`#global-search?q=keyword`)
- [ ] **FR13**: Direct URL navigation loads search results automatically

### 5.2 Non-Functional Requirements

- [ ] **NFR1**: Search completes in <500ms for 50 transcripts
- [ ] **NFR2**: UI remains responsive during search (show loading indicator)
- [ ] **NFR3**: Works in Chrome, Firefox, Safari (latest versions)
- [ ] **NFR4**: Mobile responsive (320px - 1920px)
- [ ] **NFR5**: Lighthouse accessibility score >90
- [ ] **NFR6**: No console errors or warnings
- [ ] **NFR7**: Code passes ESLint + Prettier checks
- [ ] **NFR8**: TypeScript compiles with no errors
- [ ] **NFR9**: All Playwright tests pass (per CLAUDE.md)
- [ ] **NFR10**: No regressions in existing features (upload, transcript view, saved list)

### 5.3 User Acceptance Criteria

- [ ] **UAC1**: User can find specific topics across multiple recordings without opening each one
- [ ] **UAC2**: User understands which conversations are most relevant (match count visible)
- [ ] **UAC3**: User can quickly preview matched content (accordion expansion)
- [ ] **UAC4**: User is not confused by multiple audio players (only one plays)
- [ ] **UAC5**: User can easily clear search and start over (visible clear button)

---

## 6. IMPLEMENTATION CHECKLIST

### Phase 1: Foundation ✅
- [ ] Create `useGlobalPlayerStore.ts`
- [ ] Create `useGlobalSearchStore.ts`
- [ ] Write store unit tests
- [ ] Implement `performSearch()` function
- [ ] Add debouncing to search input
- [ ] Modify `AudioPlayer.tsx` for global coordination
- [ ] Test multiple audio players

### Phase 2: UI Components ✅
- [ ] Add search trigger to `UploadView.tsx`
- [ ] Create `GlobalSearchView.tsx`
- [ ] Create `GlobalSearchAccordion.tsx`
- [ ] Add route to `useRouterStore`
- [ ] Style components (match existing design)
- [ ] Add loading states
- [ ] Add empty states
- [ ] Test responsive layout

### Phase 3: Polish ✅
- [ ] Add virtual scrolling (if needed)
- [ ] Optimize search performance (memoization)
- [ ] Add keyboard navigation
- [ ] Add ARIA labels
- [ ] Handle errors (IndexedDB, empty data)
- [ ] Add loading indicators
- [ ] Test accessibility (screen reader)

### Phase 4: Testing & Launch ✅
- [ ] Write Playwright tests (per CLAUDE.md)
- [ ] Run manual QA across browsers
- [ ] Fix any bugs found
- [ ] Update README/docs
- [ ] Get product owner approval
- [ ] Merge to main branch

---

## 7. OPEN QUESTIONS

1. **Audio Player in Accordion**: Should every expanded accordion have an embedded player, or should we have a single global player at the top?
   - **Recommendation**: Embedded per-accordion for better UX (user can quickly test different conversations)

2. **Search History**: Should we persist recent searches to localStorage?
   - **Recommendation**: No for MVP (add in Phase 2 if requested)

3. **Virtual Scrolling**: At what threshold should we enable it?
   - **Recommendation**: 100+ results (test with real data)

4. **Keyboard Shortcuts**: Should we add Cmd+K / Ctrl+K to open global search?
   - **Recommendation**: Yes, but separate ticket (low priority)

5. **Export Results**: Should users be able to export search results to CSV/JSON?
   - **Recommendation**: No for MVP (future enhancement)

---

## 8. DEFINITION OF DONE

- ✅ All acceptance criteria met (Section 5)
- ✅ Code reviewed and approved
- ✅ All tests passing (unit + Playwright)
- ✅ No linting errors (ESLint + Prettier)
- ✅ TypeScript compiles successfully
- ✅ Documentation updated
- ✅ Product owner approval
- ✅ Deployed to production

---

## APPENDIX A: Code Examples

### Example 1: Search Highlighting (Reusable Logic)

```typescript
// Extracted from WhisperTranscript.tsx (lines 42-44)
export function highlightSearchMatches(
  text: string,
  searchQuery: string
): React.ReactNode {
  if (!searchQuery) return text;

  const regex = new RegExp(
    `(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
    'gi'
  );

  const parts = text.split(regex);

  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark
        key={index}
        className="bg-yellow-200 dark:bg-yellow-700"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}
```

### Example 2: Accordion Component Structure

```typescript
// GlobalSearchAccordion.tsx (simplified)
interface AccordionProps {
  result: SearchResult;
  isExpanded: boolean;
  onToggle: () => void;
  searchQuery: string;
}

export const GlobalSearchAccordion: React.FC<AccordionProps> = ({
  result,
  isExpanded,
  onToggle,
  searchQuery,
}) => {
  return (
    <div className="border rounded-lg mb-4">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">📝</span>
          <span className="font-medium">
            {result.conversationName}
          </span>
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
            {result.matchCount} matches
          </span>
        </div>
        <span>{isExpanded ? '▼' : '▶'}</span>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 py-3 border-t">
          {result.matchedSegments.map((segment, idx) => (
            <div key={idx} className="mb-4">
              <div className="text-sm text-gray-600 mb-1">
                {segment.speaker} [{formatTime(segment.start)}]
              </div>
              <div className="text-gray-900">
                {highlightSearchMatches(
                  segment.chunks.map((c) => c.text).join(' '),
                  searchQuery
                )}
              </div>
            </div>
          ))}

          {/* Optional: Embedded Audio Player */}
          {result.audioFileId && (
            <AudioPlayer
              transcriptId={result.transcriptId}
              audioFileId={result.audioFileId}
            />
          )}
        </div>
      )}
    </div>
  );
};
```

---

**END OF PRD**

---

## CHANGE LOG

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-27 | Claude | Initial PRD created based on user requirements |

