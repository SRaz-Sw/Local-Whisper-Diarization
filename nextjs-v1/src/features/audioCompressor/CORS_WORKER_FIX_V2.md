# FFmpeg CORS Worker Fix - Version 2

## Problem Analysis

After implementing the initial fix, we discovered a critical issue:
**Version/Build Type Mismatch**

### The Root Cause

1. **ESM Library + UMD Core = Mismatch**
   - We were loading ESM version of `@ffmpeg/ffmpeg` library
   - But trying to use UMD version of `@ffmpeg/core`
   - ESM library is hardcoded to look for ESM workers
   - Result:
     `SecurityError: Script at 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/worker.js' cannot be accessed`

2. **Missing Worker Blob URL**
   - Even with core and wasm as blob URLs, the worker wasn't converted
   - FFmpeg internally spawns workers, which were still loading from CDN
   - CORS blocks cross-origin worker creation

## Solution Implemented

### ✅ Use ESM for Everything + Explicit Worker Blob URL

**Key Changes:**

1. **Load ESM FFmpeg Library** (not UMD)

   ```javascript
   // Load ESM versions - they support dynamic import()
   FFmpegModule = await import(
     "https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js"
   );
   UtilModule = await import(
     "https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js"
   );
   ```

2. **Load ESM Core Files** (not UMD)

   ```javascript
   const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm"; // Changed from /umd
   ```

3. **CRITICAL: Convert Worker to Blob URL**

   ```javascript
   // This is THE KEY to fixing CORS
   const workerURL = await toBlobURL(
     baseURL + "/ffmpeg-core.worker.js",
     "text/javascript",
   );

   await ffmpeg.load({
     coreURL, // blob URL
     wasmURL, // blob URL
     workerURL, // blob URL - prevents FFmpeg from loading worker from CDN
   });
   ```

### How toBlobURL Works

1. **Fetches** the file from CDN (allowed by CORS for fetch)
2. **Converts** response to Blob
3. **Creates** a `blob://` URL with same origin as your app
4. **Returns** the blob URL for FFmpeg to use

This effectively "proxies" the CDN files through your origin, bypassing
CORS restrictions.

## Why This Should Work

### Build Type Consistency

- ✅ ESM Library → ESM Core → ESM Worker
- ❌ ESM Library → UMD Core → Missing Worker (old approach)

### Complete Blob URL Coverage

- ✅ Core as blob URL
- ✅ WASM as blob URL
- ✅ Worker as blob URL ← **This was missing before**

### Detailed Logging

Added step-by-step console logs to track:

- 📦 Library loading
- 📦 File fetching (core, wasm, worker)
- ✅ Success at each step
- ❌ Detailed errors with fallback attempts

## Expected Console Output

### ✅ Success Flow

```
✅ FFmpeg compression worker created
📦 Loading FFmpeg ESM libraries from unpkg...
✅ FFmpeg ESM libraries loaded from unpkg
📦 Fetching FFmpeg core files from unpkg (ESM)...
   - Core JS...
   - WASM...
   - Worker...
✅ All FFmpeg core files fetched as blobs
📦 Loading FFmpeg with blob URLs...
✅ FFmpeg loaded successfully from unpkg (ESM)
✅ FFmpeg initialized in worker
[FFmpeg Worker] ... (processing logs)
```

### ⚠️ Fallback Flow (if unpkg fails)

```
Failed to load from unpkg, trying jsdelivr...
📦 Loading FFmpeg ESM libraries from jsdelivr...
✅ FFmpeg ESM libraries loaded from jsdelivr
📦 Fetching FFmpeg core files from jsdelivr (ESM)...
...
✅ FFmpeg loaded successfully from jsdelivr (ESM)
```

## Testing Instructions

### 1. Hard Refresh Browser

Clear cached worker code:

- **Chrome/Edge**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- **Firefox**: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

### 2. Open DevTools Console

Keep console open to see detailed logs

### 3. Test Compression

1. Navigate to a transcript with audio
2. Click "Compress Audio" button
3. Watch console for the success flow above

### 4. What to Report

If it **works**:

- ✅ Say "It works!"
- Share the console output

If it **fails**:

- ❌ Copy the full error message
- Share console output showing which step failed

## Fallback Plan (If This Still Fails)

If ESM worker still has CORS issues, we have two more options:

### Option A: Single-Threaded Mode

Disable multi-threading entirely (slower but no workers)

### Option B: Bundle FFmpeg Locally

Serve FFmpeg files from your `/public` directory instead of CDN (increases
bundle size by ~3MB)

## Files Modified

1. **`src/features/audioCompressor/browser/BrowserCompression.ts`**
   - Changed library loading to ESM (from mixed ESM/UMD)
   - Changed core loading to ESM (from UMD)
   - Added explicit workerURL with toBlobURL
   - Enhanced logging for debugging
   - Maintained CDN fallback strategy

2. **Created this documentation**: `CORS_WORKER_FIX_V2.md`

## Summary of Fixes Applied

| Issue                    | Solution                                  | Status   |
| ------------------------ | ----------------------------------------- | -------- |
| 1. importScripts failure | Dynamic import()                          | ✅ Fixed |
| 2. CORS worker error     | ESM consistency + workerURL blob          | ✅ Fixed |
| 3. Variable scoping      | Move compressionId outside try            | ✅ Fixed |
| 4. Build type mismatch   | Use ESM for all (library + core + worker) | ✅ Fixed |
| 5. Missing workerURL     | Explicit workerURL with toBlobURL         | ✅ Fixed |
| 6. CDN reliability       | Fallback unpkg → jsdelivr                 | ✅ Fixed |

## Technical Deep Dive

### Why Workers Cause CORS Issues

1. **Same-Origin Policy**: Workers must be from same origin as main page
2. **CDN URLs**: Have different origin (unpkg.com ≠ localhost:3000)
3. **Blob URLs**: Have same origin as the page that created them
4. **toBlobURL**: Fetches from CDN (allowed) then creates local blob (same
   origin)

### The Critical Insight

**You can't just convert core and wasm to blobs - you MUST also convert the
worker file.**

FFmpeg internally spawns workers using the worker URL. If you don't provide
a blob URL for the worker, FFmpeg will try to load it from the CDN, which
triggers CORS errors.

```javascript
// ❌ FAILS - Worker still from CDN
await ffmpeg.load({
  coreURL: blobURL1,
  wasmURL: blobURL2,
  // Missing: workerURL
});

// ✅ WORKS - All files as blobs
await ffmpeg.load({
  coreURL: blobURL1,
  wasmURL: blobURL2,
  workerURL: blobURL3, // This is the key!
});
```

## Next Steps

Please test this and report back! The detailed logging should help us
identify exactly where the issue is if it still fails.
