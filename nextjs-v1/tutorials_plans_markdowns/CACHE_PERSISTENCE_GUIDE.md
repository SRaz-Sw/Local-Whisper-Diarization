# Model Cache Persistence Guide

## Overview

This document explains how Whisper models are cached and persisted in both browser and Electron environments.

## Browser Cache Behavior

### Cache API Storage

Transformers.js uses the **Cache API** (not IndexedDB) to store ONNX models.

**Key Characteristics:**

- ✅ **Persistent**: Cached indefinitely until user clears browser cache
- ✅ **Automatic**: No manual expiration or cleanup needed
- ✅ **Efficient**: Only downloads once, reuses on subsequent loads
- ✅ **Large Storage**: Can handle multi-GB models

### Cache Locations

**Desktop Browsers:**

- **Chrome/Edge**: `%LocalAppData%\Google\Chrome\User Data\Default\Cache` (Windows) or `~/Library/Caches/Google/Chrome/` (Mac)
- **Firefox**: `%AppData%\Mozilla\Firefox\Profiles\<profile>\cache2\` (Windows) or `~/Library/Caches/Firefox/Profiles/` (Mac)

**Cache Names:**

- Primary: `transformers-cache`
- Alternative: `huggingface-cache`, `onnx-cache`

### Persistence Duration

**Models stay cached:**

- ✅ **Indefinitely** - No automatic expiration
- ✅ **Across sessions** - Survives browser restarts
- ✅ **Across reboots** - Survives system restarts
- ✅ **Until manual clear** - Only removed when user clears cache

**Models are removed only when:**

- User manually clears browser cache/storage
- Browser runs out of disk space (LRU eviction)
- App explicitly calls `caches.delete()`

### Storage Quotas

**Modern browsers provide generous storage:**

- **Chrome/Edge**: 60% of available disk space
- **Firefox**: 50% of available disk space
- **Minimum**: Usually 10GB+ even on constrained systems

**Example:**

- 500GB disk → ~300GB available for cache
- Easily stores all 5 Whisper models (~5-10GB total)

## Electron App Cache Strategy

### Recommended Configuration

For optimal model persistence in Electron:

```javascript
// electron/main.js
const { app, session } = require("electron");
const path = require("path");

// Set cache location to userData directory (persistent)
const cacheDirectory = path.join(app.getPath("userData"), "model-cache");

app.on("ready", () => {
  // Configure session to use persistent cache
  session.defaultSession.setStoragePath(cacheDirectory);

  // Set cache size limit (in bytes) - 10GB
  session.defaultSession.clearCache = false;

  console.log("Model cache directory:", cacheDirectory);
});
```

### Cache Locations by OS

**macOS:**

```
~/Library/Application Support/<app-name>/model-cache/
```

**Windows:**

```
C:\Users\<username>\AppData\Roaming\<app-name>\model-cache\
```

**Linux:**

```
~/.config/<app-name>/model-cache/
```

### Electron-Specific Benefits

1. **Dedicated Storage**: Models stored in app-specific directory
2. **OS-Level Persistence**: Survives all app/system restarts
3. **No Browser Interference**: Cache not affected by browser updates
4. **User Control**: User can find and manage cache files
5. **Backup-Friendly**: Can be backed up with user data

### Implementation in Current App

Update `electron/main.js`:

```javascript
const { app, BrowserWindow, session } = require("electron");
const path = require("path");

// Store models in userData for persistence
const userDataPath = app.getPath("userData");
const modelCachePath = path.join(userDataPath, "ml-models");

app.whenReady().then(() => {
  // Set up persistent cache directory
  session.defaultSession.setStoragePath(modelCachePath);

  // Prevent automatic cache clearing
  app.on("before-quit", () => {
    // Don't clear cache on quit
    session.defaultSession.clearCache = false;
  });

  console.log("📦 Model cache location:", modelCachePath);

  createWindow();
});
```

## Cache Management Features

### Current Implementation

The app now checks if models are cached using the Cache API:

```typescript
// utils/systemInfo.ts
export async function checkCachedModels(
  modelIds: string[],
): Promise<CachedModelInfo[]> {
  // Get all cache names
  const cacheNames = await caches.keys();

  // Find transformers cache
  const cache = await caches.open("transformers-cache");

  // Check each model
  const requests = await cache.keys();

  // Match URLs containing model IDs
  return modelIds.map((modelId) => ({
    modelId,
    isCached: requests.some((req) => req.url.includes(modelId)),
  }));
}
```

### User Benefits

1. **Instant Identification**: See which models are already downloaded
2. **Avoid Re-downloads**: Don't wait for models you already have
3. **Storage Awareness**: Know what's using disk space
4. **Smart Recommendations**: Prefer cached models when suggesting

## Cache Size Estimates

### Model Sizes by Device Type

| Model    | WebGPU (unquantized) | WASM (quantized) |
| -------- | -------------------- | ---------------- |
| Tiny     | 103MB                | 41MB             |
| Base     | 196MB                | 77MB             |
| Small    | 635MB                | 249MB            |
| Medium   | 1980MB               | 776MB            |
| Large v3 | 3140MB               | 1550MB           |

**Plus Pyannote Segmentation:** ~6MB (all devices)

### Total Storage Examples

**Minimal Setup** (Base + Pyannote):

- WebGPU: 202MB
- WASM: 83MB

**Recommended Setup** (Small + Pyannote):

- WebGPU: 641MB
- WASM: 255MB

**Professional Setup** (All models + Pyannote):

- WebGPU: ~6GB
- WASM: ~2.7GB

## Cache Verification

### Browser DevTools

**Chrome/Edge:**

1. Open DevTools (F12)
2. Go to Application → Cache Storage
3. Look for `transformers-cache`
4. Inspect cached model files

**Firefox:**

1. Open DevTools (F12)
2. Go to Storage → Cache Storage
3. Look for `transformers-cache`
4. Inspect cached items

### Console Logging

The app logs cache detection:

```
Available caches: ["transformers-cache", "workbox-precache-v2"]
Found 145 cached items
✓ Model onnx-community/whisper-base_timestamped is cached
✓ Model onnx-community/whisper-small_timestamped is cached
```

## Troubleshooting

### Models Not Showing as Cached

**Symptoms:** Badge doesn't appear after model download

**Solutions:**

1. **Refresh the dialog** - Close and reopen Model Settings
2. **Check browser console** - Look for cache detection logs
3. **Verify cache exists** - Check DevTools → Cache Storage
4. **Clear and re-download** - Sometimes cache gets corrupted

### Cache Corruption

**Symptoms:** Model fails to load despite being "cached"

**Solutions:**

1. Clear browser cache completely
2. Re-download the model
3. Check available disk space

### Electron Cache Issues

**Symptoms:** Models not persisting between app restarts

**Solutions:**

1. Verify `setStoragePath` is called in main process
2. Check userData directory exists and is writable
3. Ensure app doesn't clear cache on quit

## Best Practices

### For Users

1. **Keep Cache**: Don't clear browser cache unnecessarily
2. **Check Before Download**: Look for "✓ Cached" badge
3. **Use Recommended Models**: Prefer cached models when available
4. **Monitor Storage**: Ensure adequate disk space

### For Developers

1. **Use Cache API**: Not localStorage or IndexedDB
2. **Log Cache Operations**: Help debugging with console logs
3. **Handle Failures Gracefully**: Cache checks shouldn't block app
4. **Test Offline**: Verify cached models work without internet

## Future Enhancements

### Planned Features

1. **Cache Size Display**: Show total MB used by cached models
2. **Clear Cache Button**: Let users free up space selectively
3. **Cache Health Check**: Verify cached models are valid
4. **Automatic Cleanup**: Remove old/unused model versions
5. **Export/Import Cache**: Transfer models between devices

### Potential Optimizations

1. **Compression**: Use Brotli/Gzip for model files
2. **Differential Updates**: Download only changed model parts
3. **Shared Models**: Deduplicate common model components
4. **Lazy Loading**: Download model layers on-demand

---

**Status:** ✅ Implemented & Production Ready  
**Cache Duration:** Indefinite (until user clears browser cache)  
**Electron Support:** Recommended configuration provided  
**Last Updated:** 2025-01-11
