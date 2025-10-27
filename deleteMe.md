# Commit Message

## Summary

Add inline edit buttons to audio player for quick access to conversation and speaker name editing with improved visual design.

---

## Features Added

### Inline Metadata Editing from Audio Player
- Added two edit buttons in audio player header:
  - **Edit Conversation Name** button (document icon)
  - **Edit Speaker Names** button (users icon)
- Buttons only appear when callbacks are provided (backward compatible)
- Context-aware: only shown on saved transcripts

### Audio Player Visual Improvements
- Redesigned with card-based layout (rounded borders, shadow)
- Improved header with better spacing and layout
- Enhanced playback speed controls with hover effects
- Refined typography (11px for controls)
- Better color consistency using semantic Tailwind tokens

---

## Business Logic Fixes

### Real-time Metadata Updates
- Conversation name changes now update immediately in UI
- Speaker name changes sync to both localStorage and Whisper store
- Added toast notifications for success/error feedback

---

## Technical Fixes

### Component Integration
- Added optional `onEditConversation` and `onEditSpeakers` props to AudioPlayer
- Implemented modal state management in TranscriptView
- Created `handleSaveConversationName` and `handleSaveSpeakerNames` callbacks
- Fixed layout spacing issues (overflow, truncation, alignment)
- Replaced inconsistent dark mode classes with semantic tokens

---

## How to Use

**For end-users:**

1. Open any saved transcript
2. Find the edit icons in the audio player header (next to file name)
3. Click document icon to edit conversation name
4. Click users icon to edit speaker names
5. Changes save automatically and appear instantly
