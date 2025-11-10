# Audio Compressor Fix Plan - Technical Analysis

> **📊 For detailed comparison of FFmpeg.wasm vs MediaRecorder vs LameJS,
> see
> [COMPRESSION_APPROACHES_COMPARISON.md](./COMPRESSION_APPROACHES_COMPARISON.md)**

## Quick Decision Guide

**Best long-term solution for Browser + Electron:**

✅ **Hybrid Approach**: FFmpeg.wasm (browser) + Native FFmpeg (Electron)

**Why:**

- **5-10x faster** than MediaRecorder (30s vs 300s for 5min audio)
- **Works in both** browser and Electron environments
- **Universal format support** (mp3, wav, m4a, webm, mp4, etc.)
- **Future-proof** (can add video compression, filters, etc.)
- **Industry standard** (FFmpeg powers YouTube, Netflix, etc.)

**Trade-off accepted:**

- 31MB bundle for browser (lazy loaded, cached after first use)

---

## Current State Analysis

### What's Currently Implemented

The audio compression feature is **fully implemented but disabled** due to
critical UI-blocking issues. Here's what exists:

#### Architecture

```
audioCompressor/
├── services/AudioCompressionService.ts    # Main service (disabled)
├── utils/
│   ├── audioFormatDetector.ts            # Browser capability detection
│   ├── audioBufferProcessor.ts           # Audio processing (resample, mono)
│   └── mediaRecorderEncoder.ts           # MediaRecorder-based encoding
├── types/index.ts                         # Type definitions
└── __tests__/                             # 91 tests (80 passing)
```

#### Current Flow

1. **Transcription completes** → audio file available as `Blob`
2. **Compression trigger** → `compressAudio()` called in:
   - `useTranscripts.ts` (single file mode)
   - `BatchQueueManager.ts` (batch mode)
3. **Storage** → Both original and compressed blobs saved to IndexedDB
4. **API Sync** → Compressed audio sent to external API

#### Implementation Details

- **Approach**: Web Audio API + MediaRecorder
- **Target**: Opus @ 24kbps, 16kHz, mono (~95-98% reduction)
- **Storage**: IndexedDB via localforage
- **Integration**: Already wired in both single and batch workflows

### Why It's Currently Disabled

**Critical Problem**: MediaRecorder API encodes audio **in real-time only**

```typescript
// From mediaRecorderEncoder.ts line 82-88
setTimeout(() => {
  if (mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
}, audioBuffer.duration * 1000); // 🚨 BLOCKS FOR FULL DURATION
```

**Impact**:

- 149-second audio → 149+ seconds of UI freeze
- Cannot compress faster than playback speed
- Completely blocks main thread
- Unacceptable UX for any file > 30 seconds

**Root Cause**: MediaRecorder is designed for **real-time recording**, not
batch processing. It plays back the audio in real-time through an
AudioContext to encode it.

### Current Integration Points

#### 1. Single File Mode (`useTranscripts.ts:133`)

```typescript
if (shouldCompress) {
  try {
    const compressedBlob = await compressAudio(data.audioBlob);
    compressedAudioFileId = `audio-compressed-${id}`;
    await blobStorage.save(compressedAudioFileId, compressedBlob);
  } catch (error) {
    console.error("⚠️ Audio compression failed:", error);
  }
}
```

#### 2. Batch Mode (`BatchQueueManager.ts:529`)

```typescript
const compressedBlob = await compressAudio(file.file);
compressedAudioFileId = `audio-compressed-${id}`;
await blobStorage.save(compressedAudioFileId, compressedBlob);
```

#### 3. API Sync (`ApiSyncService.ts:52-66`)

```typescript
if (includeAudio && transcript.compressedAudioFileId) {
  const audioBlob = await blobStorage.get(
    transcript.compressedAudioFileId,
  );
  if (audioBlob) {
    const base64Audio = await blobToBase64(audioBlob);
    dto.compressedAudio = base64Audio;
    dto.compressedAudioMimeType = audioBlob.type;
  }
}
```

---

## Requirements Analysis

### Functional Requirements

1. ✅ Compress audio/video after transcription
2. ✅ Support single file and batch processing
3. ✅ Non-blocking - shouldn't freeze UI
4. ✅ Toast notifications for completion
5. ✅ Upload compressed audio to external API
6. ✅ Handle multiple concurrent files

### Technical Constraints

1. **Environment**: Browser (Chrome/Firefox/Safari) + Electron
2. **Storage**: IndexedDB (already storing audio blobs)
3. **Input Formats**: ANY (users upload .mp3, .wav, .m4a, .webm, .mp4,
   etc.)
4. **Output Format**: Compressed audio suitable for API upload
5. **Workflow**: Compression happens AFTER transcription completes

### Performance Goals

- **Speed**: As fast as possible (ideally faster than real-time)
- **Compression Ratio**: ~90-95% reduction (speech-optimized)
- **Concurrency**: Handle multiple files simultaneously
- **Background**: Truly non-blocking, runs independently

---

## Solution Evaluation

### Option 1: FFmpeg.wasm in Web Worker ⭐ **RECOMMENDED**

**How it works**:

- Use `@ffmpeg/ffmpeg` (WebAssembly port of FFmpeg)
- Run in dedicated Web Worker
- Compress audio completely off main thread
- Can compress **faster than real-time** on modern hardware

**Pros**: ✅ **Truly non-blocking** - runs in separate thread  
✅ **Fast** - can compress 10min audio in ~10-30 seconds  
✅ **Handles ANY input format** - FFmpeg supports everything  
✅ **Better compression** - more control over codecs (Opus, AAC, MP3)  
✅ **Concurrent processing** - multiple workers for batch files  
✅ **Progress tracking** - FFmpeg reports encoding progress  
✅ **Works in browser AND Electron**  
✅ **Battle-tested** - FFmpeg is industry standard

**Cons**: ⚠️ **Larger bundle** - ~31MB initial download (cached after first
use)  
⚠️ **Startup overhead** - ~1-2 seconds to initialize FFmpeg.wasm  
⚠️ **Memory usage** - needs ~2x file size in RAM during processing

**Implementation**:

```typescript
// New structure
audioCompressor/
├── workers/
│   └── ffmpegWorker.ts              # Web Worker with FFmpeg.wasm
├── services/
│   └── FfmpegCompressionService.ts  # Main service
└── queue/
    └── CompressionQueue.ts          # Manages concurrent compression jobs
```

**Key Code Pattern**:

```typescript
// In worker
import { FFmpeg } from "@ffmpeg/ffmpeg";

const ffmpeg = new FFmpeg();
await ffmpeg.load();

// Compress audio
await ffmpeg.writeFile("input.webm", audioBlob);
await ffmpeg.exec([
  "-i",
  "input.webm",
  "-c:a",
  "libopus",
  "-b:a",
  "24k",
  "-ac",
  "1",
  "-ar",
  "16000",
  "output.opus",
]);
const output = await ffmpeg.readFile("output.opus");
```

**Why this is best for your use case**:

1. **Non-blocking**: Perfect for your "background compression" requirement
2. **Fast**: Can compress multiple files concurrently
3. **Universal format support**: Handles all input formats users might
   upload
4. **Proven**: Used by major apps (Kapwing, Clipchamp, etc.)
5. **Future-proof**: Can add video compression, trimming, etc. later

---

### Option 2: Server-Side Compression

**How it works**:

- Upload original file to your backend
- Server compresses using native FFmpeg
- Return compressed file or upload directly to API

**Pros**: ✅ **Fastest compression** - native FFmpeg on powerful server  
✅ **No browser limitations** - full FFmpeg feature set  
✅ **Smaller client bundle** - no compression code in browser  
✅ **Consistent results** - same output across all clients

**Cons**: ❌ **Requires server infrastructure** - hosting costs  
❌ **Upload overhead** - must upload full original file first  
❌ **Network dependency** - won't work offline  
❌ **Latency** - upload + processing + download time  
❌ **Privacy concerns** - audio leaves user's device

**Why NOT for your use case**:

- Your app works **offline** (huge selling point!)
- Users transcribe **locally** for privacy
- Adding server dependency defeats the purpose
- Would need to upload ~100MB files before compression

---

### Option 3: Hybrid Approach (Small = Browser, Large = Server)

**How it works**:

- Files < 10MB: Compress in browser with FFmpeg.wasm
- Files > 10MB: Upload to server for compression

**Pros**: ✅ **Best of both worlds** - fast for small files, scalable for
large  
✅ **Reduced server load** - most files handled client-side

**Cons**: ❌ **Complex** - two different code paths  
❌ **Still requires server** - infrastructure costs  
❌ **Inconsistent UX** - different behavior based on file size

**Why NOT for your use case**:

- Adds unnecessary complexity
- Still breaks offline functionality for large files
- FFmpeg.wasm alone should handle your use case

---

### Option 4: Upload Original + Server Compression (Post-Upload)

**How it works**:

- Upload original audio to API
- API compresses server-side if needed
- Client avoids compression entirely

**Pros**: ✅ **Simplest client code** - no compression logic  
✅ **Fastest client experience** - no waiting

**Cons**: ❌ **Wastes bandwidth** - uploading full original files  
❌ **API dependency** - requires API to handle compression  
❌ **Costly** - bandwidth for large files  
❌ **Slow uploads** - users wait for large file uploads

**Why NOT for your use case**:

- You specifically want to compress BEFORE upload
- Bandwidth optimization is a goal
- Bad UX for users with slow internet

---

### Option 5: Use MediaRecorder with Chunked Processing

**How it works**:

- Split audio into small chunks (5-10 seconds)
- Compress each chunk with MediaRecorder
- Add delays between chunks to keep UI responsive
- Concatenate compressed chunks

**Pros**: ✅ **No new dependencies** - uses existing code  
✅ **Browser-native** - lightweight

**Cons**: ❌ **Still slow** - compression still real-time per chunk  
❌ **Complex concatenation** - joining opus/webm chunks is tricky  
❌ **Quality issues** - chunk boundaries may cause artifacts  
❌ **Still blocks UI** - just in smaller intervals

**Why NOT for your use case**:

- Doesn't solve fundamental speed problem
- Still takes ~same total time as MediaRecorder
- Added complexity for marginal improvement

---

## Final Recommendation: FFmpeg.wasm in Web Worker

### Why This is the Best Choice

| Criteria             | FFmpeg.wasm         | Server-Side        | MediaRecorder         |
| -------------------- | ------------------- | ------------------ | --------------------- |
| **Speed**            | ⭐⭐⭐⭐ Fast       | ⭐⭐⭐⭐⭐ Fastest | ⭐ Real-time only     |
| **Non-blocking**     | ✅ Web Worker       | ✅ Network async   | ❌ Blocks main thread |
| **Offline**          | ✅ Yes              | ❌ No              | ✅ Yes                |
| **Input formats**    | ✅ All formats      | ✅ All formats     | ⚠️ Limited            |
| **Concurrency**      | ✅ Multiple workers | ⚠️ Server limits   | ❌ Serial only        |
| **Bundle size**      | ⚠️ +31MB            | ✅ None            | ✅ None               |
| **Setup complexity** | ⭐⭐ Medium         | ⭐⭐⭐⭐ Complex   | ⭐ Simple             |
| **Cost**             | ✅ Free             | ❌ Server costs    | ✅ Free               |
| **Privacy**          | ✅ Local            | ⚠️ Server uploads  | ✅ Local              |

### Implementation Plan

#### Phase 1: Core FFmpeg.wasm Integration

1. Install dependencies: `@ffmpeg/ffmpeg`, `@ffmpeg/util`
2. Create `FfmpegWorker` - Web Worker wrapper
3. Implement basic compress function
4. Add progress tracking
5. Test with single file

#### Phase 2: Queue Management

1. Create `CompressionQueue` service
2. Handle multiple concurrent compressions
3. Add retry logic for failures
4. Implement toast notifications
5. Test with batch files

#### Phase 3: Integration & Polish

1. Replace existing `compressAudio()` calls
2. Add compression settings UI (bitrate, format)
3. Add pause/cancel functionality
4. Optimize worker reuse (keep alive)
5. Add telemetry (compression time, ratios)

#### Phase 4: Advanced Features

1. Smart bitrate selection (based on file length)
2. Preview compressed audio before upload
3. Comparison tool (original vs compressed)
4. Background compression queue persistence

### Performance Expectations

**Single File (5min audio)**:

- Original: ~50MB WAV
- Compressed: ~2-3MB Opus
- Time: ~5-15 seconds
- UI: Fully responsive throughout

**Batch Processing (10 files)**:

- 2-3 workers running concurrently
- Each file compressed independently
- Toast notifications for each completion
- No UI blocking

### Bundle Size Impact

**Current**: ~8MB (with transformers.js, etc.)  
**After FFmpeg.wasm**: ~39MB total  
**Mitigation**:

- FFmpeg.wasm is loaded on-demand (only when compressing)
- Cached after first use
- Most users compress once, reuse forever

---

## Migration Path

### Step 1: Parallel Implementation

- Keep existing disabled code
- Implement new FFmpeg.wasm service alongside
- Use feature flag to toggle

### Step 2: Testing

- Test with various formats (mp3, wav, m4a, webm, mp4)
- Test single file and batch modes
- Verify compression ratios
- Check memory usage

### Step 3: Gradual Rollout

- Enable for single file mode first
- Monitor performance and errors
- Enable for batch mode
- Full deployment

### Step 4: Cleanup

- Remove old MediaRecorder code
- Archive existing tests (for reference)
- Document new architecture

---

## Code Examples

### New Worker Structure

```typescript
// workers/ffmpegWorker.ts
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;

async function initFFmpeg() {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();

  // Load FFmpeg.wasm
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
  await ffmpeg.load({
    coreURL: await toBlobURL(
      `${baseURL}/ffmpeg-core.js`,
      "text/javascript",
    ),
    wasmURL: await toBlobURL(
      `${baseURL}/ffmpeg-core.wasm`,
      "application/wasm",
    ),
  });

  return ffmpeg;
}

self.addEventListener("message", async (e) => {
  const { type, payload } = e.data;

  if (type === "compress") {
    try {
      const { audioBlob, options } = payload;
      const ffmpeg = await initFFmpeg();

      // Write input file
      await ffmpeg.writeFile(
        "input",
        new Uint8Array(await audioBlob.arrayBuffer()),
      );

      // Set up progress tracking
      ffmpeg.on("progress", ({ progress }) => {
        self.postMessage({ type: "progress", progress: progress * 100 });
      });

      // Compress audio
      await ffmpeg.exec([
        "-i",
        "input",
        "-c:a",
        "libopus",
        "-b:a",
        `${options.bitrate || 24}k`,
        "-ac",
        options.mono ? "1" : "2",
        "-ar",
        `${options.sampleRate || 16000}`,
        "output.opus",
      ]);

      // Read output
      const data = await ffmpeg.readFile("output.opus");
      const outputBlob = new Blob([data], { type: "audio/opus" });

      // Clean up
      await ffmpeg.deleteFile("input");
      await ffmpeg.deleteFile("output.opus");

      self.postMessage({
        type: "complete",
        blob: outputBlob,
        compressionRatio: outputBlob.size / audioBlob.size,
      });
    } catch (error) {
      self.postMessage({
        type: "error",
        error: error.message,
      });
    }
  }
});
```

### New Service

```typescript
// services/FfmpegCompressionService.ts
import type { CompressionOptions } from "../types";

let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL("../workers/ffmpegWorker.ts", import.meta.url),
    );
  }
  return worker;
}

export async function compressAudio(
  audioBlob: Blob,
  options: CompressionOptions = {},
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const worker = getWorker();

    const handleMessage = (e: MessageEvent) => {
      const { type, blob, progress, error } = e.data;

      if (type === "progress") {
        console.log(`Compression progress: ${progress.toFixed(1)}%`);
      } else if (type === "complete") {
        worker.removeEventListener("message", handleMessage);
        resolve(blob);
      } else if (type === "error") {
        worker.removeEventListener("message", handleMessage);
        reject(new Error(error));
      }
    };

    worker.addEventListener("message", handleMessage);

    worker.postMessage({
      type: "compress",
      payload: { audioBlob, options },
    });
  });
}
```

### Integration (No Changes Needed!)

The existing integration points in `useTranscripts.ts` and
`BatchQueueManager.ts` can stay exactly the same - just import the new
service:

```typescript
// Just change the import
import { compressAudio } from "@/features/audioCompressor";

// Usage stays the same!
const compressedBlob = await compressAudio(audioBlob);
```

---

## Risks & Mitigations

### Risk 1: Bundle Size

**Mitigation**: Lazy load FFmpeg.wasm only when needed, cache aggressively

### Risk 2: Browser Compatibility

**Mitigation**: Fallback to server compression or skip compression if
unsupported

### Risk 3: Memory Usage

**Mitigation**: Compress files sequentially if concurrent causes issues,
add memory monitoring

### Risk 4: Learning Curve

**Mitigation**: Extensive documentation, code examples, gradual rollout

---

## Success Metrics

- ✅ Compression completes without UI blocking
- ✅ Compression time < 30% of audio duration
- ✅ File size reduction > 90%
- ✅ Supports all common audio/video formats
- ✅ Can compress 3+ files concurrently
- ✅ User sees progress and completion toasts
- ✅ Zero production errors for 1 week

---

## Conclusion

**Recommended Solution**: FFmpeg.wasm in Web Worker

**Rationale**:

- Solves the UI blocking problem completely
- Maintains offline-first architecture
- Supports all input formats
- Fast enough for great UX
- Enables future features (video, trimming, etc.)
- Industry-proven technology

**Next Steps**:

1. Approve this approach
2. Install FFmpeg.wasm dependencies
3. Implement Phase 1 (core integration)
4. Test with sample files
5. Iterate and refine

The current architecture is solid - we just need to replace the compression
engine from MediaRecorder to FFmpeg.wasm. Everything else (storage, API
sync, queue management) stays the same. 🚀
