# 🧪 How to Test API Sync Feature

## Quick Test (2 Minutes)

### Step 1: Start Your Dev Server

```bash
cd nextjs-v1
bun dev
```

### Step 2: Open Test Page

Navigate to: **http://localhost:3000/web-transc/test-api**

### Step 3: Run Test

1. Click **"Configure Local API"** button
2. Click **"Run Full Test"** button
3. Wait ~3 seconds
4. Look for **"Test Passed"** ✅

### Step 4: Verify

Open browser DevTools (F12) and check:

- **Console**: Should show "===== TEST PASSED ====="
- **Network**: Should show POST to `/api/transcripts` with 200 OK

---

## ✅ What Gets Tested

### Full Test (`Run Full Test` button)

1. ✅ Configure API settings (endpoint, key, compression)
2. ✅ Create test transcript with 10-second audio
3. ✅ Compress audio (~70% size reduction)
4. ✅ Save to IndexedDB
5. ✅ Queue for background sync
6. ✅ Send to API endpoint
7. ✅ Verify successful response
8. ✅ Update sync status to "synced"

### Compression Test (`Test Compression` button)

1. ✅ Create 30-second test audio
2. ✅ Compress using Web Audio API
3. ✅ Measure compression ratio
4. ✅ Report results

---

## 📁 Test Files Created

| File                                             | Purpose           |
| ------------------------------------------------ | ----------------- |
| `src/app/api/transcripts/route.ts`               | Mock API endpoint |
| `src/app/web-transc/utils/testApiSync.ts`        | Test utilities    |
| `src/app/web-transc/components/ApiTestPanel.tsx` | Test UI           |
| `src/app/web-transc/test-api/page.tsx`           | Test page         |

---

## 🎯 Alternative Testing Methods

### Method 1: Browser Console (No UI changes needed)

```javascript
// Open console (F12) and run:

// Import test utilities (only needed once per page load)
const { testApiSyncFlow, testAudioCompression } = await import(
  "/src/app/web-transc/utils/testApiSync.ts"
);

// Run full test
await testApiSyncFlow();

// Or test compression only
await testAudioCompression();
```

### Method 2: Add Test Panel to Existing View

```tsx
// In any component (e.g., TranscribeView.tsx):
import { ApiTestPanel } from "../components/ApiTestPanel";

export default function YourView() {
  return (
    <div>
      {/* Add test panel temporarily */}
      <ApiTestPanel />

      {/* Your existing components */}
    </div>
  );
}
```

### Method 3: Use Test Page (Easiest)

Just visit: **http://localhost:3000/web-transc/test-api**

---

## 📊 Expected Output

### Console (Success)

```
🧪 ===== STARTING API SYNC TEST =====

📋 Step 1: Configure API settings
✅ API settings configured

📋 Step 2: Create test transcript with audio
🎵 Test audio created: 320.04 KB
🗜️ Compressing audio...
✅ Compressed audio saved: 96.04 KB (70.0% reduction)
✅ Test transcript created: test-transcript-...

📋 Step 3: Queue transcript for API sync
✅ Transcript queued
📊 Queue size: 1

📋 Step 4: Waiting for sync to complete...
📤 Processing sync for transcript...
📥 Mock API: Received transcript sync request
✅ Mock: Transcript saved successfully!

📋 Step 5: Checking sync status
📊 Sync Status: synced
📊 Error: None

✅ ===== TEST PASSED =====
```

### Network Tab

```
POST http://localhost:3000/api/transcripts
Status: 200 OK
Headers:
  Content-Type: application/json
  Authorization: Bearer test-api-key-12345
Response:
  {
    "success": true,
    "transcriptId": "test-transcript-...",
    "serverTranscriptId": "server-...",
    "stats": {
      "textLength": 89,
      "chunkCount": 13,
      "segmentCount": 2,
      "hasAudio": true,
      "audioSizeKB": "96.04"
    }
  }
```

---

## 🔍 What to Look For

### ✅ Success Indicators

- [ ] Test panel shows green "Test Passed"
- [ ] Console shows "TEST PASSED"
- [ ] Network shows 200 response
- [ ] Compressed audio is ~30% of original
- [ ] Sync status is "synced"
- [ ] No errors in console

### ❌ Failure Indicators

- Red "Test Failed" in panel
- "Failed to fetch" in console
- 404 or 500 error in Network tab
- Sync status stuck on "pending"
- Errors logged to console

---

## 🐛 Common Issues

### "Failed to fetch"

**Problem**: Can't reach API endpoint  
**Solution**: Verify dev server is running on port 3000

### "404 Not Found"

**Problem**: API route doesn't exist  
**Solution**: Verify `src/app/api/transcripts/route.ts` exists

### Sync stuck on "pending"

**Problem**: Background service not processing  
**Solution**: Wait up to 5 seconds, check console for errors

### Compression fails

**Problem**: Browser doesn't support Web Audio API  
**Solution**: Use Chrome, Firefox, or Edge

### Test passes but shows "pending"

**Problem**: Didn't wait long enough  
**Solution**: Background sync takes 1-3 seconds

---

## 📈 Performance Benchmarks

| Metric            | Expected Value       |
| ----------------- | -------------------- |
| Compression Time  | 50-200ms             |
| API Request Time  | 500-1000ms           |
| Total Sync Time   | 1-2 seconds          |
| Compression Ratio | ~30% (70% reduction) |

---

## 🎯 After Testing

Once tests pass:

1. ✅ **Verify tests pass** - Check all success indicators
2. **Add Settings UI** - Place `<ApiSettingsModal />` in your app
3. **Replace Mock API** - Point to your real API endpoint
4. **Test Real Flow** - Upload actual audio file
5. **Monitor Queue** - Watch background sync in action

---

## 📚 More Information

- **Feature Guide**: `docs/API_SYNC_FEATURE.md`
- **Implementation Details**: `docs/API_SYNC_IMPLEMENTATION.md`
- **Quick Start**: `QUICK_START_API_SYNC.md`
- **Full Test Guide**: `TEST_API_SYNC.md`

---

## 🚀 Ready to Test?

1. Run `bun dev`
2. Visit http://localhost:3000/web-transc/test-api
3. Click "Configure Local API"
4. Click "Run Full Test"
5. Check console for "TEST PASSED" ✅

**That's it!** The entire API sync and compression feature is ready to use.
