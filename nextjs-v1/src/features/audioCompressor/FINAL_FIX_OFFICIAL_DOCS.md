# FFmpeg CORS Fix - Following Official Documentation

## ✅ THE ACTUAL SOLUTION (From Official Docs)

Reference:
[FFmpeg.wasm Official Usage Guide](https://ffmpegwasm.netlify.app/docs/getting-started/usage)

### The Core Issues

1. **Wrong Build Type**: Was using ESM core, should use **UMD for Next.js**
   - ❌ ESM: Only for Vite users
   - ✅ UMD: For Next.js and other non-Vite frameworks

2. **Wrong Version**: Was using 0.12.6, should use **0.12.10**

3. **Including workerURL Incorrectly**: Regular `@ffmpeg/core` is
   single-threaded
   - ❌ Including `workerURL` causes worker-related errors
   - ✅ Only include `workerURL` when using `@ffmpeg/core-mt`
     (multi-threaded)

## What The Official Docs Say

### Single-Threaded (What We Need)

```javascript
const baseURL =
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

await ffmpeg.load({
  coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
  wasmURL: await toBlobURL(
    `${baseURL}/ffmpeg-core.wasm`,
    "application/wasm",
  ),
  // NO workerURL - single-threaded doesn't need it!
});
```

### Multi-Threaded (For Future Reference)

If we ever need multi-threading:

```javascript
const baseURL =
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.10/dist/umd";

await ffmpeg.load({
  coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
  wasmURL: await toBlobURL(
    `${baseURL}/ffmpeg-core.wasm`,
    "application/wasm",
  ),
  workerURL: await toBlobURL(
    `${baseURL}/ffmpeg-core.worker.js`,
    "text/javascript",
  ),
});
```

Note: Multi-threaded requires SharedArrayBuffer and special headers
(COOP/COEP).

## Implementation

### Current Setup

**Library Loading** (Worker Context):

```javascript
// Use ESM for library imports (required for dynamic import())
FFmpegModule = await import(
  "https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js"
);
UtilModule = await import(
  "https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js"
);
```

**Core Loading** (FFmpeg.load):

```javascript
// Use UMD for Next.js (as per official docs)
const baseURL =
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

const coreURL = await toBlobURL(
  baseURL + "/ffmpeg-core.js",
  "text/javascript",
);
const wasmURL = await toBlobURL(
  baseURL + "/ffmpeg-core.wasm",
  "application/wasm",
);

// Single-threaded - NO workerURL
await ffmpeg.load({
  coreURL,
  wasmURL,
});
```

### Why This Architecture?

| Component                | Build Type | Reason                                           |
| ------------------------ | ---------- | ------------------------------------------------ |
| `@ffmpeg/ffmpeg` library | ESM        | Required for dynamic `import()` in module worker |
| `@ffmpeg/util` library   | ESM        | Required for dynamic `import()` in module worker |
| `@ffmpeg/core` files     | UMD        | Official recommendation for Next.js              |

## Expected Console Output

### ✅ Success Flow

```
✅ FFmpeg compression worker created
📦 Loading FFmpeg ESM libraries from unpkg...
✅ FFmpeg ESM libraries loaded from unpkg
📦 Fetching FFmpeg core files from jsdelivr (UMD)...
   - Core JS...
   - WASM...
✅ FFmpeg core files fetched as blobs
📦 Loading FFmpeg (single-threaded, no worker)...
✅ FFmpeg loaded successfully (single-threaded)
✅ FFmpeg initialized in worker
[FFmpeg Worker] ... (compression logs)
```

## Testing Instructions

### 1. Hard Refresh Browser

Clear all cached code:

- **Chrome/Edge**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- **Firefox**: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

### 2. Test Compression

1. Open DevTools Console
2. Navigate to transcript with audio
3. Click "Compress Audio"
4. Watch for success flow above

### 3. Verify

Should see:

- ✅ No CORS errors
- ✅ No worker errors
- ✅ Compression progress
- ✅ Compressed audio plays

## Changes Made

### File: `BrowserCompression.ts`

**Changed:**

1. Core files: `@ffmpeg/core@0.12.10/dist/umd` (was `@0.12.6/dist/esm`)
2. Removed `workerURL` from load config (was incorrectly included)
3. Added comment explaining single-threaded vs multi-threaded
4. Updated logs to indicate "single-threaded, no worker"

**Kept:**

1. ESM library imports (correct for module worker)
2. CDN fallback strategy (jsdelivr → unpkg)
3. toBlobURL for all resources (prevents CORS)

## Why Previous Attempts Failed

### Attempt 1: importScripts

❌ importScripts with CDN URLs blocked by CORS

### Attempt 2: ESM Everything + workerURL

❌ Including workerURL when core doesn't have/need worker ❌ Using ESM core
when Next.js needs UMD

### Attempt 3: UMD Everything + workerURL

❌ Can't use UMD with dynamic import() ❌ Still including unnecessary
workerURL

### ✅ Current: ESM Library + UMD Core + No workerURL

This matches the official documentation exactly!

## Key Insights

### 1. Two Separate Concerns

- **Library loading**: How you import FFmpeg/Util classes (ESM for dynamic
  import)
- **Core loading**: What FFmpeg.load() fetches (UMD for Next.js)

### 2. Single vs Multi-Threaded

- **Single-threaded** (`@ffmpeg/core`): No worker, no workerURL
- **Multi-threaded** (`@ffmpeg/core-mt`): Has worker, needs workerURL +
  special headers

### 3. Build Type Recommendation

From official docs:

> "If you are a vite user, use esm in baseURL instead of umd"

Meaning: Everyone else (including Next.js) should use UMD for core files.

## Future: Multi-Threading (Optional)

If we need faster compression:

1. **Change core package**:

   ```javascript
   const baseURL =
     "https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.10/dist/umd";
   ```

2. **Add workerURL**:

   ```javascript
   const workerURL = await toBlobURL(
     baseURL + "/ffmpeg-core.worker.js",
     "text/javascript",
   );

   await ffmpeg.load({
     coreURL,
     wasmURL,
     workerURL, // Now required for MT
   });
   ```

3. **Add required headers** (in `next.config.ts`):
   ```javascript
   {
     source: "/",
     headers: [
       { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
       { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
     ],
   }
   ```

## References

- [FFmpeg.wasm Official Documentation](https://ffmpegwasm.netlify.app/docs/getting-started/usage)
- [Single-Threaded Example](https://ffmpegwasm.netlify.app/docs/getting-started/usage#transcode-webm-to-mp4-video)
- [Multi-Threaded Example](https://ffmpegwasm.netlify.app/docs/getting-started/usage#transcode-webm-to-mp4-video-multi-thread)

## Summary

The fix was simple once we followed the official documentation:

1. ✅ Use UMD core for Next.js (not ESM)
2. ✅ Use version 0.12.10 (not 0.12.6)
3. ✅ Don't include workerURL for single-threaded core

This should now work exactly as shown in the official examples!
