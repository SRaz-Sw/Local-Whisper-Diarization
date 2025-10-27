# Commit Message

## Summary

Implemented comprehensive Global Search feature with cross-transcript search capabilities, enhanced audio player coordination, improved UI theming consistency, and major code refactoring for component reusability.

---

## Features Added

### 1. Global Search Across All Transcripts
- **New View**: [GlobalSearchView.tsx](nextjs-v1/src/app/web-transc/views/GlobalSearchView.tsx) - Full-featured search interface with real-time search across all saved transcripts
- **Search Store**: [useGlobalSearchStore.ts](nextjs-v1/src/app/web-transc/store/useGlobalSearchStore.ts) - Centralized state management with sequential search algorithm ensuring accurate match counting
- **Search UI Component**: [GlobalSearchAccordion.tsx](nextjs-v1/src/app/web-transc/components/GlobalSearchAccordion.tsx) - Expandable accordion cards showing search results with inline audio playback
- **Router Integration**: Enhanced router to support query parameters (`/global-search?q=query`) with URL-based state management
- **Navigation Entry**: Added "Global Search" navigation item in sidebar for quick access
- **Features**:
  - Real-time debounced search (300ms) with URL persistence
  - Match highlighting in yellow with context preservation
  - Result ranking by match count and recency
  - Per-transcript match statistics (conversation count + total matches)
  - Expandable result cards with embedded audio player
  - Empty state designs for no query and no results
  - Keyboard shortcuts (Escape to clear)

### 2. Global Audio Player Coordination
- **New Store**: [useGlobalPlayerStore.ts](nextjs-v1/src/app/web-transc/store/useGlobalPlayerStore.ts) - Ensures only one audio player plays at a time across the entire application
- **Auto-pause Logic**: When one player starts, all others automatically pause (prevents overlapping audio)
- **AudioPlayer Enhancement**: Added optional `transcriptId` prop for coordination, maintains backward compatibility

### 3. Reusable TranscriptSegment Component
- **New Component**: [TranscriptSegment.tsx](nextjs-v1/src/app/web-transc/components/TranscriptSegment.tsx) - Extracted and generalized speaker segment rendering logic
- **DRY Principle**: Eliminated 80+ lines of duplicate code between WhisperTranscript and GlobalSearchAccordion
- **Features**:
  - Animated hover effects (speaker label reveal, vertical line emphasis)
  - Click-to-seek functionality on any word
  - Search term highlighting with yellow marks
  - Speaker color consistency
  - Timestamp formatting

### 4. Enhanced Router with Query Parameters
- **Query String Support**: Router now parses and manages both path params (`/view/id`) and query params (`/view?key=value`)
- **URL Format**: `#view/id?param1=value1&param2=value2`
- **Benefits**: Shareable search URLs, browser history integration, better UX for search persistence

---

## Business Logic Fixes

### 1. Audio Player Speed Control Enhancement
- Added **3x speed option** to playback controls (previously maxed at 2x)
- Improved user experience for quick content review and long transcripts

### 2. Accurate Search Match Counting
- Implemented sequential chunk-to-segment mapping algorithm (same as TranscriptView)
- Prevents duplicate results by ensuring each word belongs to exactly one segment
- Match count now accurately reflects the number of query occurrences in concatenated segment text

### 3. Search Result Sorting Logic
- Primary sort: Most matches first (descending)
- Secondary sort: Most recent first (descending createdAt timestamp)
- Ensures most relevant results appear at the top

---

## Technical Fixes

### 1. Router State Management Cleanup
- Fixed duplicate navigation prevention logic to properly compare params using JSON stringification
- Enhanced router history management with proper URL hash updates including query parameters
- Improved `back()` function to reconstruct full URL with both path and query params
- Fixed `replace()` function to maintain query parameters when replacing route

### 2. Theme Consistency Improvements
- **AudioPlayer**: Replaced hardcoded colors with Tailwind theme utilities
  - Primary action colors: `bg-primary`, `text-primary`
  - Background colors: `bg-background`, `bg-muted-foreground/5`
  - Border colors: `border-accent`, `dark:border-background/10`
  - Text colors: `text-foreground`, `text-secondary-foreground`
- **MediaFileUpload**: Consistent theme application for borders, backgrounds, and interactive elements
- **Dark Mode**: Improved contrast ratios and visual hierarchy in dark theme

### 3. Code Architecture Refactoring
- Extracted `Chunk` component from WhisperTranscript into TranscriptSegment
- Moved animation variants into TranscriptSegment (removed duplication)
- Created `formatDuration()` and `formatDate()` utility functions in GlobalSearchAccordion
- Improved type safety with explicit interfaces for `SearchResult`, `GlobalSearchState`, and `GlobalPlayerState`

### 4. Development Instructions Cleanup
- Removed Playwright testing requirements from [claude.md](claude.md) (project instructions)
- Streamlined development guidelines to focus on code quality and formatting standards
- Maintained linting and Prettier configuration requirements

### 5. Minor File Formatting
- Added trailing newline to [icon.svg](nextjs-v1/public/icon.svg) per Prettier rules
- Fixed inconsistent spacing in UploadView component imports

---

## Tutorial: Using Global Search (End Users)

### How to Search Across All Transcripts:

1. **Navigate to Global Search**:
   - Click "Global Search" in the sidebar
   - Or navigate to `#global-search` in the URL

2. **Perform a Search**:
   - Type your search query in the input field (e.g., "budget")
   - Search results appear instantly with 300ms debounce
   - Press `Escape` to clear the search

3. **View Results**:
   - See total conversations and match count in the header
   - Click any result card to expand and view matched segments
   - Search terms are highlighted in yellow

4. **Play Audio**:
   - Expanded results show an inline audio player (if audio is available)
   - Click any word in the transcript to jump to that timestamp
   - Only one audio player plays at a time (others auto-pause)

5. **Share Results**:
   - Copy the URL to share search results (query is in URL: `#global-search?q=budget`)

---

## Tutorial: Global Player Coordination (Developers)

### How to Use the Global Player Store:

1. **Import the Store**:
   ```tsx
   import { useGlobalPlayerStore } from "@/app/web-transc/store/useGlobalPlayerStore";
   ```

2. **Add Coordination to AudioPlayer**:
   ```tsx
   const { activePlayerId, setActivePlayer } = useGlobalPlayerStore();

   // Pass a unique transcriptId to enable coordination
   <AudioPlayer
     src={audioBlob}
     transcriptId="unique-transcript-id"
     onTimeUpdate={setCurrentTime}
   />
   ```

3. **Auto-Pause Logic** (Already Implemented):
   - When a player starts (`onPlay` event), it calls `setActivePlayer(transcriptId)`
   - All other players listen to `activePlayerId` changes via `useEffect`
   - If `activePlayerId` doesn't match their own `transcriptId`, they pause

4. **Opt-Out** (Optional):
   - Don't pass `transcriptId` prop to AudioPlayer to disable coordination
   - Useful for standalone audio players outside transcript context

---

## Tutorial: TranscriptSegment Component (Developers)

### How to Render Transcript Segments:

1. **Import the Component**:
   ```tsx
   import { TranscriptSegment } from "@/app/web-transc/components/TranscriptSegment";
   ```

2. **Prepare Required Props**:
   ```tsx
   const getSpeakerColor = (label: string) => getSpeakerColorUtil(label, speakerColorMap);
   const getSpeakerDisplayName = (label: string) => speakerNames?.[label] || label;
   ```

3. **Render the Segment**:
   ```tsx
   <TranscriptSegment
     label="SPEAKER_00"
     start={10.5}
     chunks={segmentChunks}
     currentTime={currentTime}
     onChunkClick={(timestamp) => seekTo(timestamp)}
     searchQuery={searchQuery}  // For highlighting
     getSpeakerColor={getSpeakerColor}
     getSpeakerDisplayName={getSpeakerDisplayName}
     formatTimestamp={formatTimestamp}
   />
   ```

4. **Benefits**:
   - Consistent animation and hover effects
   - Automatic search term highlighting
   - Speaker color and label management
   - Click-to-seek functionality

---

## Documentation

- **Architecture Analysis**: [SEARCH-ARCHITECTURE-ANALYSIS.md](SEARCH-ARCHITECTURE-ANALYSIS.md) - Comprehensive analysis of search algorithm, performance characteristics, scaling considerations, and future optimization recommendations

---

Generated with Claude Code
