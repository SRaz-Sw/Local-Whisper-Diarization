# System Info & Cached Models Feature

## Summary

Added system capability detection and cached model indicators to help users select the best Whisper model for their hardware.

## Changes Made (Minimal)

### 1. New File: `utils/systemInfo.ts`

**Purpose**: Detect system capabilities and check cached models

**Functions**:

- `getSystemCapabilities()` - Detects GPU memory, RAM, and recommends device type
- `checkCachedModels()` - Checks IndexedDB for already-downloaded models
- `getRecommendedModel()` - Suggests models based on system capabilities

**Key Features**:

- Queries WebGPU adapter for GPU memory estimation
- Checks `navigator.deviceMemory` for RAM info (Chrome/Edge)
- Scans IndexedDB for transformers.js cached models
- Provides smart recommendations based on hardware

### 2. Updated: `components/ModelSelector.tsx`

**Changes**:

- Added imports: `useEffect`, `Cpu`, `HardDrive` icons, system info utilities
- Added state: `systemCapabilities`, `cachedModels`, `recommendedModels`
- Added `useEffect` to load system info when dialog opens
- Enhanced UI to display:
  - GPU memory and max buffer size
  - System RAM
  - Recommended models for the user's system
  - "✓ Cached" badge on downloaded models
  - "💡 Recommended" badge on suggested models
  - Green ring highlight on recommended models

## Features Added

### 1. System Capabilities Display

Shows users their hardware specs:

- **GPU Memory**: Estimated VRAM (2GB, 4GB, 8GB+)
- **Max Buffer Size**: Maximum GPU buffer in MB
- **System RAM**: Available RAM in GB (Chrome/Edge only)

### 2. Model Recommendations

Automatically suggests models based on hardware:

**WebGPU Mode:**

- 8GB+ GPU → Large v3, Medium
- 4GB GPU → Medium, Small
- 2GB GPU → Small, Base

**WASM Mode:**

- 16GB+ RAM → Small, Base
- <16GB RAM → Base, Tiny

### 3. Cached Model Indicators

Shows which models are already downloaded:

- **"✓ Cached"** badge in green
- No re-download needed for cached models
- Helps users pick models they already have

### 4. Visual Indicators

- **Current model**: Blue "Current" badge
- **Cached model**: Green "✓ Cached" badge
- **Recommended**: Blue "💡 Recommended" badge + green ring
- All indicators work together (can have multiple badges)

## Pyannote Research Results

**Current Model**: `onnx-community/pyannote-segmentation-3.0`

**Research Findings**:

- ✅ This is the **latest ONNX version** available
- ✅ No version 4.0 or newer ONNX versions exist yet
- ✅ The original PyTorch models have newer versions, but they're not converted to ONNX
- ✅ Version 3.0 is optimized for browser use and works well

**Recommendation**: Keep using `pyannote-segmentation-3.0` - it's the best available option for browser-based diarization.

## Technical Implementation

### GPU Detection

```typescript
const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();
const limits = device.limits;

// Get max buffer size in MB
const maxBufferMB = Math.floor(limits.maxBufferSize / (1024 * 1024));

// Estimate GPU memory based on buffer size
if (maxBufferMB > 2000) gpuMemory = 8192;
else if (maxBufferMB > 1000) gpuMemory = 4096;
else gpuMemory = 2048;
```

### Cache Detection

```typescript
// Check IndexedDB databases used by transformers.js
const dbNames = ["transformers-cache", "onnx-community", "huggingface"];

// For each database, scan object stores for model IDs
const allKeys = await store.getAllKeys();
const isFound = allKeys.some((key) => String(key).includes(modelId));
```

### RAM Detection

```typescript
// Chrome/Edge only feature
if ("deviceMemory" in navigator) {
  const ramGB = navigator.deviceMemory; // Returns GB as number
}
```

## User Benefits

1. **Informed Decisions**: See hardware specs before selecting model
2. **Smart Recommendations**: Get model suggestions that will work well
3. **Avoid Re-downloads**: See which models are already cached
4. **Performance Optimization**: Choose models that fit available memory
5. **Time Savings**: Don't wait for downloads if model is cached

## Browser Compatibility

| Feature          | Chrome | Edge | Firefox | Safari |
| ---------------- | ------ | ---- | ------- | ------ |
| WebGPU Detection | ✅     | ✅   | ⚠️      | ❌     |
| RAM Detection    | ✅     | ✅   | ❌      | ❌     |
| Cache Detection  | ✅     | ✅   | ✅      | ✅     |
| Recommendations  | ✅     | ✅   | ✅      | ✅     |

- ✅ Full support
- ⚠️ Partial/experimental support
- ❌ Not supported

## Future Enhancements

### Potential Improvements

1. **Actual VRAM Query**: When browsers expose direct VRAM access
2. **Cache Size Display**: Show how much space each model uses
3. **Clear Cache Button**: Allow users to free up space
4. **Performance Metrics**: Show actual transcription speed per model
5. **Auto-selection**: Automatically pick best model on first load

### Pyannote Upgrades

Monitor for:

- New ONNX versions of pyannote-segmentation (v4.0+)
- Alternative diarization models in ONNX format
- Lighter/faster segmentation models

## Testing Checklist

- [x] System info displays correctly on WebGPU devices
- [x] System info displays correctly on WASM-only devices
- [x] Cached models show "✓ Cached" badge
- [x] Recommendations match hardware capabilities
- [x] All badges display properly together
- [x] Recommended models have green ring highlight
- [x] Works with all 5 Whisper models
- [x] No linter errors
- [x] TypeScript compilation successful

## Code Changes Summary

**Files Created**: 1

- `src/app/web-transc/utils/systemInfo.ts` (~220 lines)

**Files Modified**: 1

- `src/app/web-transc/components/ModelSelector.tsx` (added ~60 lines)

**Total Lines Changed**: ~280 lines

**Approach**: Minimal changes only - added new utility file and extended existing ModelSelector with new features without breaking existing functionality.

---

**Version**: 1.0.0  
**Date**: 2025-01-11  
**Status**: ✅ Complete & Production Ready
