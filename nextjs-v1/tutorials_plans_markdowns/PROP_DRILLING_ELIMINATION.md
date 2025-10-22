# Prop Drilling Elimination Plan

## Executive Summary

After migrating state to Zustand, we still have significant prop drilling where parent components pass state down to children. This plan eliminates prop drilling by having child components read directly from Zustand store.

---

## Current State Analysis

### Components with Prop Drilling

#### 1. **WhisperTranscript** (MAJOR)
**Current Props:**
```typescript
<WhisperTranscript
  transcript={result.transcript}        // from Zustand
  segments={result.segments}            // from Zustand
  currentTime={currentTime}             // local state (OK to keep)
  setCurrentTime={(time) => {           // needs refactor
    setCurrentTime(time);
    mediaInputRef.current?.setMediaTime(time);
  }}
/>
```

**State Source:**
- `result` → `useWhisperStore((state) => state.transcription.result)`
- `currentTime` → Local state (used for media player sync)

**Action Required:** REFACTOR to read `result` from Zustand, keep `currentTime` as prop

---

#### 2. **StreamingTranscript** (MODERATE)
**Current Props:**
```typescript
<StreamingTranscript
  words={streamingWords}  // from Zustand
  isActive={status === "running"}  // from Zustand
/>
```

**State Source:**
- `streamingWords` → `useWhisperStore((state) => state.transcription.streamingWords)`
- `status` → `useWhisperStore((state) => state.model.status)`

**Action Required:** REFACTOR to read directly from Zustand

---

#### 3. **WhisperLanguageSelector** (MINOR)
**Current Props:**
```typescript
<WhisperLanguageSelector
  language={language}      // from Zustand
  setLanguage={setLanguage}  // from Zustand
  className="w-[120px]"
/>
```

**State Source:**
- `language` → `useWhisperStore((state) => state.audio.language)`
- `setLanguage` → `useWhisperStore((state) => state.setLanguage)`

**Action Required:** REFACTOR to read/write directly from Zustand

---

#### 4. **ModelSelector** (MINOR)
**Current Props:**
```typescript
<ModelSelector
  currentModel={model}     // from Zustand
  device={device}          // from Zustand
  disabled={status === "running"}  // from Zustand
  onModelChange={handleModelChange}  // callback
/>
```

**State Source:**
- `model` → `useWhisperStore((state) => state.model.model)`
- `device` → `useWhisperStore((state) => state.model.device)`
- `status` → `useWhisperStore((state) => state.model.status)`

**Action Required:** REFACTOR to read from Zustand, keep `onModelChange` callback

---

#### 5. **WhisperProgress** (KEEP AS-IS)
**Current Props:**
```typescript
<WhisperProgress
  text={/* computed */}
  percentage={/* computed */}
  total={total}
  estimatedTimeRemaining={estimatedTimeRemaining}
/>
```

**Decision:** ✅ KEEP AS-IS
- This is a pure presentational component
- Props are computed/derived values, not direct state
- No benefit from connecting to Zustand

---

### Components WITHOUT Prop Drilling (Already Good)

- **MediaFileUpload** - Uses callbacks only (correct pattern)
- **IntroSection** - Pure presentational component
- **ThemeToggle** - Self-contained
- **ExportToLLMModal** - Self-contained

---

## Execution Plan

### Phase 1: StreamingTranscript (Easiest, Low Risk)
**Estimated Time:** 15 minutes

1. Update `StreamingTranscript.tsx`:
   - Remove props interface
   - Import `useWhisperStore`
   - Read `streamingWords` and `status` from store
   - Remove props from component signature

2. Update `WhisperDiarization.tsx`:
   - Remove `words` and `isActive` props from `<StreamingTranscript />`

3. Test: Verify streaming transcription still works

---

### Phase 2: WhisperLanguageSelector (Easy, Low Risk)
**Estimated Time:** 15 minutes

1. Update `WhisperLanguageSelector.tsx`:
   - Remove `language` and `setLanguage` from props
   - Import `useWhisperStore`
   - Read/write language directly from store
   - Keep `className` prop (styling)

2. Update type in `types/index.ts`:
   - Update `WhisperLanguageSelectorProps` interface

3. Update `WhisperDiarization.tsx`:
   - Remove `language` and `setLanguage` props from `<WhisperLanguageSelector />`

4. Test: Verify language selector works

---

### Phase 3: ModelSelector (Moderate, Some Risk)
**Estimated Time:** 20 minutes

1. Update `ModelSelector.tsx`:
   - Keep `onModelChange` callback (important for validation logic)
   - Keep `disabled` prop (optional: could derive from store)
   - Remove `currentModel` and `device` props
   - Read `model` and `device` from Zustand

2. Update `WhisperDiarization.tsx`:
   - Remove `currentModel` and `device` props from `<ModelSelector />`
   - Keep `onModelChange` and `disabled` props

3. Test: Verify model selection and switching works

---

### Phase 4: WhisperTranscript (Complex, Higher Risk)
**Estimated Time:** 30 minutes

**Challenge:** `currentTime` needs bidirectional sync with media player

**Strategy:** Hybrid approach
- Read `result` from Zustand (eliminate prop drilling)
- Keep `currentTime` and `setCurrentTime` as props (media player sync)

1. Update `WhisperTranscript.tsx`:
   - Import `useWhisperStore`
   - Read `result` from store instead of props
   - Keep `currentTime` and `setCurrentTime` as props
   - Update `WhisperTranscriptProps` interface

2. Update `types/index.ts`:
   - Update `WhisperTranscriptProps` to remove `transcript` and `segments`

3. Update `WhisperDiarization.tsx`:
   - Remove `transcript` and `segments` props
   - Keep `currentTime` and `setCurrentTime` props

4. Test thoroughly:
   - Transcript display
   - Chunk highlighting during playback
   - Click-to-seek functionality
   - Segment navigation

---

## Benefits After Completion

### Code Quality
- **Reduced LOC**: ~50 lines of prop passing removed
- **Better Encapsulation**: Components own their data needs
- **Easier Refactoring**: Change store without touching parent

### Performance
- **Fewer Re-renders**: Components subscribe to exact state they need
- **Better Memoization**: No prop identity changes

### Maintainability
- **Single Source of Truth**: State lives in one place
- **Easier Testing**: Mock store instead of passing props
- **Clearer Dependencies**: `useWhisperStore` calls show exactly what's needed

---

## Risk Assessment

### Low Risk
- **StreamingTranscript**: Simple read-only component
- **WhisperLanguageSelector**: Small component, easy to test

### Moderate Risk
- **ModelSelector**: Has validation logic in parent
- **WhisperTranscript**: Complex component with many interactions

### Mitigation
1. Test each phase thoroughly before moving to next
2. Keep git commits separate per phase for easy rollback
3. Monitor console for errors during dev server hot reload
4. Test full transcription flow after each phase

---

## Testing Checklist

After each phase, verify:

- [ ] Component renders without errors
- [ ] State updates propagate correctly
- [ ] User interactions work (clicks, selections)
- [ ] No console errors or warnings
- [ ] TypeScript compiles without errors

After all phases:

- [ ] Full transcription flow works
- [ ] Model switching works
- [ ] Language selection works
- [ ] Streaming transcription displays
- [ ] Final transcript displays with segments
- [ ] Click-to-seek works
- [ ] Save/Load transcript works
- [ ] No prop drilling remains in codebase

---

## Rollback Plan

If issues arise:
1. Each phase is in separate commit
2. `git revert <commit-hash>` to undo specific phase
3. Or `git reset --hard` to last known good state

---

## Estimated Total Time

- Phase 1: 15 min
- Phase 2: 15 min
- Phase 3: 20 min
- Phase 4: 30 min
- Testing: 20 min

**Total: ~100 minutes (1.5-2 hours)**
