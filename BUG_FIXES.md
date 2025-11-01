# Bug Fixes - Transcription & Batch Upload

## Fix 1: Premature Navigation on Single File Upload

### Issue

When uploading a single file and clicking "Run Model", the app would immediately redirect to an old transcript page and trigger API sync, while the new transcription was still starting.

### Root Cause

When navigating from UploadView to TranscribeView, any old `result` from a previous transcription remained in the Zustand store. TranscribeView's auto-save effect (lines 115-171) would detect this stale result immediately and:

1. Save the old transcript
2. Redirect to the old transcript page
3. Trigger API sync for the old transcript

Meanwhile, the new transcription would start processing in the background.

### Solution

**File:** `nextjs-v1/src/app/web-transc/views/UploadView.tsx` (line 123)

Added `setResult(null)` before navigating to transcribe view in the `handleClick` function.

```typescript
// Clear any previous result before starting new transcription
setResult(null);

// Always navigate to transcribe view
console.log('🎤 Navigating to transcribe view...');
navigate('transcribe');
```

This ensures any old result is cleared before starting a new transcription, so TranscribeView only auto-saves when the **current** transcription completes.

---

## Fix 2: Batch Queue Stuck on "0/1" When All Files Are Duplicates

### Issue

When uploading a batch of files where ALL are duplicates of existing transcripts, the batch queue would show "0/1" or other inconsistent states and appear stuck in processing mode.

### Root Cause

The duplicate detection correctly filtered out all files, but the `addFiles` function in the batch store would still:

1. Create an empty `batchFiles` array
2. Update state and set `batchStatus` to "processing" even with 0 files
3. This created an inconsistent state with processing status but no actual files

### Solution

**File:** `nextjs-v1/src/app/web-transc/store/useBatchStore.ts` (lines 252-256)

Added a guard to prevent state updates when no files are actually being added:

```typescript
// Guard: Don't update state if no files to add (prevents inconsistent batch status)
if (batchFiles.length === 0) {
	console.log(
		'ℹ️ No files to add (all filtered out), skipping state update'
	);
	return;
}

// Add files to store immediately
set((state) => ({
	files: [...state.files, ...batchFiles],
	batchStatus:
		state.batchStatus === 'idle' ? 'processing' : state.batchStatus,
}));
```

This ensures the batch state remains consistent when all uploaded files are duplicates, preventing the "processing" status with 0 files.

---

## Summary

Both fixes follow the principle of **minimal, defensive changes**:

-   Fix 1: Clear stale state before navigation (1 line)
-   Fix 2: Guard against empty array state updates (3 lines)

These changes prevent edge cases without modifying any other behavior or requiring refactoring.
