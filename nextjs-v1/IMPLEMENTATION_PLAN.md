# Implementation Plan: Accurate Timestamp-Based Progress Tracking

## Current State Analysis

### What We Added (To Be Reverted)
From git diff, we added these incorrect changes:
1. ❌ `currentChunkIndex` variable tracking (line 145)
2. ❌ `lastProgressUpdate` and `PROGRESS_UPDATE_INTERVAL` (lines 148-149)
3. ❌ `CHUNK_DURATION` constant (line 150)
4. ❌ Initial progress message (lines 158-163)
5. ❌ Time-based progress estimation in `callback_function` (lines 207-244)
6. ❌ Setting `currentChunkIndex` in `on_chunk_start` (line 232)
7. ❌ Debug console logs (lines 198-203)
8. ✅ Changed parallel to sequential execution (lines 293-310) - **KEEP THIS**
9. ✅ Moved "Identifying speakers..." message (lines 300-303) - **KEEP THIS**

### What We Changed in UI
- Modified `StreamingTranscript.tsx` to show progress bar
- This is GOOD - we'll keep this but improve it

## The Core Problem

**We treated `chunkIndex` as an integer counter (0, 1, 2...) when it's actually an AUDIO TIMESTAMP!**

Example:
```javascript
// ❌ What we thought:
on_chunk_end: (chunkIndex) => {
    // If chunkIndex = 2, we assumed: 2 * 30 = 60 seconds
    processedSeconds = (chunkIndex + 1) * 30;
}

// ✅ What it actually is:
on_chunk_end: (endTimestamp) => {
    // endTimestamp = 60.234 (actual position in audio)
    processedSeconds = endTimestamp;
}
```

## New Approach: Use Real Timestamps

### Key Insight from Reference Project
The WhisperTextStreamer callbacks receive ACTUAL TIMESTAMPS from the audio:
- `on_chunk_start(x)` → `x` = timestamp where chunk starts in audio
- `on_chunk_end(x)` → `x` = timestamp where chunk ends in audio

### Why This Works
1. ✅ WhisperTextStreamer tracks position in audio internally
2. ✅ Passes real timestamps to callbacks
3. ✅ No need for estimation or calculation
4. ✅ 100% accurate progress

## Implementation Steps

### Step 1: Revert Bad Changes in Worker
**File:** `nextjs-v1/src/app/web-transc/workers/whisperDiarization.worker.js`

**Revert:**
```javascript
// REMOVE these lines:
let currentChunkIndex = 0;
let lastProgressUpdate = Date.now();
const PROGRESS_UPDATE_INTERVAL = 2000;
const CHUNK_DURATION = 30;

// REMOVE initial progress message (lines 158-163)

// REMOVE all console logs in callback_function (lines 198-203)

// REMOVE time-based estimation logic (lines 207-244)

// REMOVE currentChunkIndex update in on_chunk_start (line 232)
```

**Keep:**
- Sequential execution (not parallel)
- "Identifying speakers..." timing
- Basic chunk callbacks

### Step 2: Implement Timestamp-Based Progress
**File:** `nextjs-v1/src/app/web-transc/workers/whisperDiarization.worker.js`

**Add SIMPLE timestamp tracking:**
```javascript
async function run({ audio, language, resumeFromBackup = false }) {
  const totalSeconds = audio.length / 16000;
  let processedSeconds = 0;

  // Send initial progress immediately
  self.postMessage({
    status: "processing_progress",
    processedSeconds: 0,
    totalSeconds,
    estimatedTimeRemaining: null,
  });

  const streamer = new WhisperTextStreamer(transcriber.tokenizer, {
    skip_prompt: true,
    time_precision: 0.02,

    callback_function: (text) => {
      // Just send text, no progress calculation
      self.postMessage({
        status: "transcribing",
        data: { text, timestamp: Date.now() },
      });
    },

    on_chunk_start: (startTimestamp) => {
      // startTimestamp = actual position in audio (e.g., 0.0, 30.2, 60.5...)
      console.log("🔥 WORKER: Chunk started at audio position:", startTimestamp);

      // Send progress update with real audio position
      self.postMessage({
        status: "processing_progress",
        processedSeconds: startTimestamp,
        totalSeconds,
        estimatedTimeRemaining: null,
      });
    },

    on_chunk_end: (endTimestamp) => {
      // endTimestamp = actual position in audio (e.g., 30.0, 60.2, 90.5...)
      console.log("🔥 WORKER: Chunk ended at audio position:", endTimestamp);

      processedSeconds = endTimestamp;

      // Calculate ETA based on actual progress
      const elapsedMs = Date.now() - processingStartTime;
      const processingRate = processedSeconds / (elapsedMs / 1000);
      const remainingSeconds = totalSeconds - processedSeconds;
      const estimatedTimeRemaining = processingRate > 0
        ? remainingSeconds / processingRate
        : null;

      // Send accurate progress update
      self.postMessage({
        status: "processing_progress",
        processedSeconds,
        totalSeconds,
        estimatedTimeRemaining,
      });
    },

    on_finalize: () => {
      console.log("🔥 WORKER: Transcription finalized");
    },
  });

  // ... rest of transcription code
}
```

### Step 3: Verify UI Still Works
**File:** `nextjs-v1/src/app/web-transc/components/StreamingTranscript.tsx`

**No changes needed!** The UI already:
- Reads `processedSeconds` from Zustand store ✅
- Reads `totalSeconds` from Zustand store ✅
- Calculates percentage ✅
- Shows progress bar ✅

The store will now receive ACCURATE timestamps instead of estimates.

### Step 4: Test Verification

**Expected Behavior:**
1. ✅ Progress bar appears immediately (shows 0s / XXXs)
2. ✅ When first chunk starts, shows real audio position (e.g., 0.5s)
3. ✅ When first chunk ends, jumps to accurate position (e.g., 30.2s)
4. ✅ Progress reflects ACTUAL audio position, not elapsed time
5. ✅ Progress bar updates when chunks complete (~every 30s)
6. ✅ ETA calculation is accurate

**Test Cases:**
- Short audio (30s): Should show accurate 0% → 100%
- Long audio (5 min): Should show accurate progress at each chunk
- Variable speed processing: Progress reflects audio position, not time elapsed

## File Changes Summary

### Files to Modify:
1. **`whisperDiarization.worker.js`** - Revert bad changes + implement timestamp-based progress
   - Remove: Time-based estimation, currentChunkIndex, throttling
   - Add: Use timestamps directly from callbacks
   - Keep: Sequential execution, correct message timing

2. **`StreamingTranscript.tsx`** - NO CHANGES
   - Already correct - reads from store

3. **`useWhisperStore.ts`** - NO CHANGES
   - Already correct - stores processedSeconds/totalSeconds

4. **`WhisperDiarization.tsx`** - NO CHANGES
   - Already correct - handles processing_progress messages

## Why This is Better

### Before (Current - WRONG):
```javascript
// Estimated progress based on time elapsed
const elapsedInCurrentChunk = (now - processingStartTime) / 1000 - (currentChunkIndex * 30);
const estimatedProgress = (currentChunkIndex * 30) + elapsedInCurrentChunk;
// ❌ Inaccurate - assumes constant processing speed
// ❌ Can show 80% when actually at 40%
```

### After (New - CORRECT):
```javascript
// Actual progress from WhisperTextStreamer
on_chunk_end: (endTimestamp) => {
    processedSeconds = endTimestamp;  // Real audio position!
    // ✅ Accurate - WhisperTextStreamer knows exact position
    // ✅ Always reflects true progress
}
```

## Implementation Order

1. ✅ Create this plan document
2. ⏳ Revert bad changes in worker (Step 1)
3. ⏳ Implement timestamp-based progress (Step 2)
4. ⏳ Test with audio file (Step 4)
5. ⏳ Verify UI updates correctly (Step 3)

## Success Criteria

- [ ] Progress bar shows accurate audio position
- [ ] No time-based estimation code remaining
- [ ] Progress updates on chunk boundaries (~30s intervals)
- [ ] ETA calculation is accurate
- [ ] UI renders smoothly
- [ ] Console logs show real timestamps (e.g., 30.234, not 30)

## Rollback Plan

If this doesn't work:
1. Revert worker changes: `git checkout nextjs-v1/src/app/web-transc/workers/whisperDiarization.worker.js`
2. Fall back to Approach D from PROGRESS_BAR_ANALYSIS.md (chunk-only + activity indicators)
