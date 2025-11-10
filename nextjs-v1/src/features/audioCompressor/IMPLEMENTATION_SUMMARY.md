# Audio Compression Implementation Summary

## Session Overview

This document summarizes the work done on implementing audio compression
for the Local Whisper Diarization application.

## Initial Goal

Add client-side audio compression with the `isConvertingToMono` parameter
to compress audio files before uploading to external APIs, reducing
bandwidth and costs.

## Implementation Approach

We attempted to implement browser-based audio compression using:

- **Web Audio API** for audio decoding and processing (resampling, mono
  conversion)
- **MediaRecorder API** for encoding to Opus/WebM format at 24kbps

Target: Achieve 95-98% file size reduction (from WAV/uncompressed to Opus)

## Technical Architecture Created

### File Structure

```
nextjs-v1/src/features/audioCompressor/
├── types/index.ts                    # TypeScript type definitions
├── services/
│   └── AudioCompressionService.ts    # Main compression service
├── utils/
│   ├── audioFormatDetector.ts        # Browser capability detection
│   ├── audioBufferProcessor.ts       # Audio processing (resample, mono conversion)
│   └── mediaRecorderEncoder.ts       # MediaRecorder-based encoding
└── __tests__/                        # Comprehensive test suite (105+ tests)
```

### Types Defined

```typescript
export interface CompressionOptions {
  sampleRate?: number;
  bitrate?: number;
  isConvertingToMono?: boolean;
  preferredFormat?: SupportedAudioFormat;
}

export interface CompressionConfig {
  sampleRate: number;
  bitDepth: number;
  channels: number;
  quality: number;
  isConvertingToMono?: boolean;
  bitrate?: number;
  mimeType?: string;
}
```

## Issues Encountered

### Critical Problem: UI Blocking

**Issue**: MediaRecorder API encodes audio in **real-time only**

- For a 149-second audio file, encoding takes 149+ seconds minimum
- This completely freezes the browser UI during compression
- Cannot be sped up or run in parallel

**Root Cause**:

```javascript
// This setTimeout waits for the ENTIRE audio duration
setTimeout(() => {
  mediaRecorder.stop();
}, audioBuffer.duration * 1000); // Blocks for full duration!
```

### Technical Limitations

1. **MediaRecorder is real-time only**: Cannot compress faster than
   playback speed
2. **OfflineAudioContext doesn't support MediaRecorder**: The
   `createMediaStreamDestination()` method doesn't exist on
   OfflineAudioContext
3. **Main thread blocking**: All audio processing blocks the UI thread

## Test Suite Created

- **91 total tests** across 4 test files
- **80 passing, 11 failing** (mostly timeout-related)
- Fixed multiple issues:
  - OfflineAudioContext undefined errors
  - MediaRecorder mock setup problems
  - Sample rate handling in mocks
  - Bitrate calculation for small files

### Test Files

- `__tests__/unit/audioFormatDetector.test.ts` - Format detection &
  capability checks
- `__tests__/unit/audioBufferProcessor.test.ts` - Audio processing
  utilities
- `__tests__/unit/mediaRecorderEncoder.test.ts` - Encoding functionality
- `__tests__/integration/AudioCompressionService.test.ts` - End-to-end
  workflows

## Current Status

### Compression is DISABLED

The compression function currently returns the original blob immediately:

```typescript
export async function compressAudio(
  audioBlob: Blob,
  options: CompressionOptions = {},
): Promise<Blob> {
  // Browser-based compression is disabled because it blocks the UI for long files
  // Just return the original blob immediately
  return audioBlob;

  // TODO: Implement server-side compression or use a Web Worker approach
}
```

### Why It's Disabled

- **149-second audio file** → **149+ seconds of UI freeze**
- Unacceptable user experience
- Browser MediaRecorder API is fundamentally not suitable for batch
  compression

## Alternative Solutions (Recommended)

### Option 1: Server-Side Compression (RECOMMENDED)

- Compress audio on the server before uploading to external API
- Use FFmpeg or similar tools
- No UI blocking
- Can leverage multiple CPU cores for faster compression

### Option 2: Web Worker + FFmpeg.wasm

- Use FFmpeg compiled to WebAssembly
- Run in Web Worker to avoid blocking main thread
- More complex setup but achieves true background compression
- Libraries: `@ffmpeg/ffmpeg`

### Option 3: Chunked Compression

- Split large audio files into smaller chunks
- Compress each chunk separately with time gaps
- Allow UI to remain responsive between chunks
- More complex but might work for very long files

### Option 4: Skip Compression, Optimize Upload

- Upload original files as-is
- Use streaming/chunked upload for better UX
- Rely on server-side optimization
- Simplest solution if bandwidth isn't critical

## Code Changes Made

### Files Created

- `src/features/audioCompressor/types/index.ts` - Type definitions
- All utility files in `utils/` directory
- Comprehensive test suite in `__tests__/`

### Files Modified

- `src/features/audioCompressor/services/AudioCompressionService.ts` - Main
  service (disabled)
- `src/app/web-transc/hooks/useTranscripts.ts` - Removed compression logs
- `__tests__/setup.ts` - Added AudioContext and MediaRecorder mocks
- `__tests__/helpers/testUtils.ts` - Test utilities with mocks

### Import Path Fixes

Fixed import paths from `../../types` to `../types` in:

- `audioFormatDetector.ts`
- `audioBufferProcessor.ts`
- `mediaRecorderEncoder.ts`
- `AudioCompressionService.ts`

## Key Learnings

1. **MediaRecorder API is NOT for batch processing** - It's designed for
   real-time recording only
2. **Browser audio compression blocks the main thread** - No built-in way
   to make it async
3. **OfflineAudioContext vs AudioContext** - OfflineAudioContext is for
   offline rendering but lacks MediaRecorder support
4. **Test mocks must be set at module level** - Global setup files must
   initialize mocks before any imports

## Next Steps Required

**To implement working compression**, you must choose one of these paths:

1. **Backend Integration**: Add compression endpoint to your API
2. **FFmpeg.wasm**: Implement Web Worker-based compression
3. **External Service**: Use a third-party compression API
4. **Hybrid**: Compress small files in browser, route large files to server

## Performance Notes

### Target Compression Ratios (if implemented)

- **Opus @ 24kbps**: ~95-98% reduction
- **Sample rate reduction**: 44.1kHz → 16kHz (saves ~64%)
- **Mono conversion**: Stereo → Mono (saves ~50%)

### Actual Current Performance

- **No compression**: Original file returned immediately
- **UI blocking**: None (compression disabled)
- **File size**: No reduction

## Dependencies Added

None - all implementation uses native Web APIs

## Configuration

Default compression config (unused while disabled):

```typescript
const DEFAULT_COMPRESSION_CONFIG: CompressionConfig = {
  sampleRate: 16000, // 16kHz for speech
  bitDepth: 16,
  channels: 1, // Mono
  quality: 0.7,
  bitrate: 24, // 24 kbps
  mimeType: "audio/webm;codecs=opus",
};
```

## Conclusion

Browser-based audio compression using MediaRecorder API is **not viable**
for this use case due to real-time encoding limitations that block the UI.
A server-side or Web Worker-based solution is required for production use.

The infrastructure is in place (types, utilities, tests), but the core
encoding mechanism needs to be replaced with a non-blocking approach.
