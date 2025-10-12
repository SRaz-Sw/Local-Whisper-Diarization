# 📦 Model Caching in Electron

## Overview

Models downloaded in the Electron app are **permanently cached** and don't need to be re-downloaded. This enables 100% offline operation after the first setup.

## How Model Caching Works

### Storage Mechanism

Transformers.js uses **IndexedDB** for model caching:

```
User launches app (first time)
         ↓
Click "Load model"
         ↓
Models download from HuggingFace (~80-200MB)
         ↓
Models stored in IndexedDB
         ↓
Models ready to use
         ↓
User closes app
         ↓
User launches app (next time)
         ↓
Models load from IndexedDB (3-8 seconds) ✅
         ↓
NO INTERNET REQUIRED ✅
```

### Cache Location

Models are stored in Electron's user data directory:

#### macOS

```bash
~/Library/Application Support/whisper-diarization/
```

Full path example:

```
~/Library/Application Support/whisper-diarization/IndexedDB/
```

#### Windows

```bash
%APPDATA%\whisper-diarization\
```

Full path example:

```
C:\Users\YourName\AppData\Roaming\whisper-diarization\IndexedDB\
```

#### Linux

```bash
~/.config/whisper-diarization/
```

Full path example:

```
~/.config/whisper-diarization/IndexedDB/
```

## Verifying Model Cache

### Check if Models Are Cached

**Method 1: Check Storage Size**

macOS:

```bash
du -sh ~/Library/Application\ Support/whisper-diarization/
```

Expected output: `~200MB` (with models cached)

Windows:

```powershell
Get-ChildItem "C:\Users\$env:USERNAME\AppData\Roaming\whisper-diarization" -Recurse | Measure-Object -Property Length -Sum
```

Linux:

```bash
du -sh ~/.config/whisper-diarization/
```

**Method 2: In the App**

1. Launch app
2. Watch load time:
   - **First time**: 30-60 seconds (downloading)
   - **With cache**: 3-8 seconds (loading from disk) ✅

**Method 3: Test Offline**

1. Load models with internet
2. Close app
3. Disconnect internet
4. Launch app
5. Try to transcribe ✅ Should work!

## Model Cache Details

### What Gets Cached

1. **Whisper Model** (~77-196MB)
   - ONNX model files
   - Tokenizer
   - Config files

2. **Pyannote Model** (~6MB)
   - Segmentation model
   - Config files

### Cache Persistence

- ✅ **Survives app restart**
- ✅ **Survives system restart**
- ✅ **Survives app updates** (usually)
- ✅ **Works offline completely**

### Development vs Production

#### Development Mode

```bash
bun run electron:start
```

- Cache location: Same as production
- Cache persists between dev sessions
- Download once, use forever ✅

#### Production Mode

```bash
bun run electron:build
# Then install and run the built app
```

- Cache location: User data directory
- Independent from dev mode cache
- Each installation has its own cache

## Managing Model Cache

### View Cache Size

Add this IPC handler to `electron/main.js`:

```javascript
const fs = require("fs");
const path = require("path");

// Get cache size
ipcMain.handle("get-cache-size", async () => {
  const userDataPath = app.getPath("userData");
  const indexedDBPath = path.join(userDataPath, "IndexedDB");

  try {
    const stats = fs.statSync(indexedDBPath);
    return {
      path: indexedDBPath,
      size: stats.size,
      sizeFormatted: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
    };
  } catch (error) {
    return { error: error.message };
  }
});
```

### Clear Cache

**Method 1: From App (Add to UI)**

```javascript
// In preload.js
contextBridge.exposeInMainWorld("electron", {
  clearCache: () => ipcRenderer.invoke("clear-cache"),
});

// In main.js
ipcMain.handle("clear-cache", async () => {
  await mainWindow.webContents.session.clearCache();
  await mainWindow.webContents.session.clearStorageData({
    storages: ["indexeddb", "caches"],
  });
  return { success: true };
});
```

**Method 2: Manual Deletion**

macOS:

```bash
rm -rf ~/Library/Application\ Support/whisper-diarization/IndexedDB/
```

Windows:

```powershell
Remove-Item -Path "$env:APPDATA\whisper-diarization\IndexedDB" -Recurse -Force
```

Linux:

```bash
rm -rf ~/.config/whisper-diarization/IndexedDB/
```

**Method 3: Uninstall App**

Most installers include an option to remove user data.

## Cache Performance

### Load Times

| Scenario         | Time   | Internet Required |
| ---------------- | ------ | ----------------- |
| First download   | 30-60s | ✅ Yes            |
| Cached (SSD)     | 3-5s   | ❌ No             |
| Cached (HDD)     | 5-8s   | ❌ No             |
| Production build | 3-8s   | ❌ No             |

### Storage Space

| Model                 | Size          | Cached Size   |
| --------------------- | ------------- | ------------- |
| Whisper Base (WebGPU) | 77 MB         | ~77 MB        |
| Whisper Base (WASM)   | 196 MB        | ~196 MB       |
| Pyannote              | 6 MB          | ~6 MB         |
| **Total**             | **83-202 MB** | **83-202 MB** |

## Testing Cache Functionality

### Test Script

```bash
#!/bin/bash
# Test model caching

echo "🧪 Testing Model Cache..."

# 1. Clear cache
echo "1. Clearing cache..."
rm -rf ~/Library/Application\ Support/whisper-diarization/IndexedDB/

# 2. Launch app
echo "2. Launch app and download models..."
echo "   ⏰ Expected: 30-60 seconds"
read -p "   Press enter when models are loaded..."

# 3. Close app
echo "3. Close the app..."
read -p "   Press enter when app is closed..."

# 4. Check cache size
echo "4. Checking cache size..."
CACHE_SIZE=$(du -sh ~/Library/Application\ Support/whisper-diarization/ | cut -f1)
echo "   📦 Cache size: $CACHE_SIZE"

# 5. Relaunch offline
echo "5. Disconnect internet and relaunch app..."
echo "   ⏰ Expected: 3-8 seconds"
read -p "   Press enter when models are loaded..."

# 6. Test transcription
echo "6. Upload and transcribe a file..."
echo "   ✅ Should work offline!"
```

## Troubleshooting

### Models Re-Download Every Time

**Possible Causes:**

1. Cache is being cleared on app close
2. User data directory is write-protected
3. IndexedDB quota exceeded

**Solutions:**

1. **Check permissions:**

```bash
# macOS
ls -la ~/Library/Application\ Support/
# Should show whisper-diarization directory
```

2. **Check quota:**

```javascript
// In DevTools Console
navigator.storage.estimate().then((estimate) => {
  console.log(`Used: ${estimate.usage / 1024 / 1024} MB`);
  console.log(`Quota: ${estimate.quota / 1024 / 1024} MB`);
});
```

3. **Check IndexedDB:**

```javascript
// In DevTools Console
indexedDB.databases().then((dbs) => {
  console.log("Databases:", dbs);
});
```

### Cache Not Working Offline

1. **Check internet is truly off:**

```bash
ping huggingface.co
# Should fail if offline
```

2. **Check DevTools Network tab:**
   - No requests to HuggingFace CDN
   - Models load from cache

3. **Check console for errors:**
   - Look for "Failed to fetch" errors
   - Verify no CORS errors

### Cache Taking Too Much Space

Models use 83-202MB. If you need to free space:

1. Use smaller Whisper model (edit worker file)
2. Clear cache when not in use
3. Add cache management UI

## Best Practices

### For Users

1. ✅ **Download once** - First launch requires internet
2. ✅ **Use offline** - After first download, no internet needed
3. ✅ **Keep app installed** - Uninstalling may clear cache
4. ✅ **Update carefully** - Updates usually preserve cache

### For Developers

1. ✅ **Don't clear cache automatically**
2. ✅ **Add cache status UI** - Show if models are cached
3. ✅ **Add cache size UI** - Show storage usage
4. ✅ **Add manual clear option** - Let users clear if needed
5. ✅ **Handle offline gracefully** - Show clear error messages

## Adding Cache UI (Optional)

You can add a cache status indicator to your app:

```typescript
// In your component
const [cacheStatus, setCacheStatus] = useState<{
  isCached: boolean;
  size: string;
}>({ isCached: false, size: '0 MB' });

useEffect(() => {
  // Check if models are cached
  if (window.electron) {
    window.electron.getCacheSize().then(info => {
      setCacheStatus({
        isCached: info.size > 50 * 1024 * 1024, // > 50MB means cached
        size: info.sizeFormatted
      });
    });
  }
}, []);

// In your UI
{cacheStatus.isCached && (
  <div className="cache-status">
    ✅ Models cached ({cacheStatus.size}) - Offline mode available
  </div>
)}
```

## Summary

### ✅ Key Points

1. **Models are cached automatically** in IndexedDB
2. **No re-download needed** after first load
3. **100% offline** after initial setup
4. **Stored in user data directory** (persistent)
5. **Survives app restarts** and system reboots
6. **~83-202MB disk space** required

### 🎯 User Experience

**First Launch:**

```
Launch app → Download models (60s) → Use app
```

**Every Other Launch:**

```
Launch app → Load from cache (5s) → Use app ✅
```

**Offline:**

```
Launch app → Load from cache (5s) → Use app ✅
```

---

**Questions?** Check the Electron documentation or DevTools Console for cache debugging!
