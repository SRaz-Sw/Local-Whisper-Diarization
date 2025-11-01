# Testing API Sync Feature

## 🧪 Test Suite Created

I've created a complete testing suite for the API sync and audio
compression features:

1. **Mock API Endpoint** - Validates and processes sync requests
2. **Test Utilities** - Helper functions for testing
3. **Test UI Panel** - Visual interface for running tests

---

## 📁 Files Created

### 1. Mock API Endpoint

**File**: `src/app/api/transcripts/route.ts`

A fully functional Next.js API route that:

- ✅ Receives transcript sync POST requests
- ✅ Validates all required fields and data structures
- ✅ Checks authorization header (Bearer token)
- ✅ Logs detailed information about each request
- ✅ Simulates database save with 500ms latency
- ✅ Returns proper success/error responses
- ✅ Handles CORS preflight (OPTIONS)

**Endpoint**: `http://localhost:3000/api/transcripts`

### 2. Test Utilities

**File**: `src/app/web-transc/utils/testApiSync.ts`

Comprehensive test functions:

- `testApiSyncFlow()` - Tests complete sync workflow
- `testAudioCompression()` - Tests compression only
- `createTestTranscript()` - Creates test data with audio
- `configureTestApiSettings()` - Sets up API configuration
- Helper functions for queue management

**Browser Console Access**:

```javascript
// Available in browser console after loading the page
testApiSync.testFullFlow(); // Run complete test
testApiSync.testCompression(); // Test compression only
testApiSync.queueSize(); // Check queue size
testApiSync.clearQueue(); // Clear sync queue
```

### 3. Test UI Panel (Optional)

**File**: `src/app/web-transc/components/ApiTestPanel.tsx`

Visual testing interface with:

- Full flow test button
- Compression test button
- Configuration helpers
- Queue management
- Real-time status indicators
- Test results display

---

## 🚀 How to Run Tests

### Method 1: Browser Console (Easiest)

1. **Start your dev server**:

```bash
cd nextjs-v1
bun dev
```

2. **Open your app** in browser: `http://localhost:3000`

3. **Open browser console** (F12 or Cmd+Option+I)

4. **Import test utilities**:

```javascript
// First, import the test module
import("/app/web-transc/utils/testApiSync.ts").then((module) => {
  window.testApiSync = module;
});
```

5. **Run tests**:

```javascript
// Test complete flow
await testApiSync.testFullFlow();

// Or test compression only
await testApiSync.testCompression();
```

### Method 2: Using Test UI Panel

1. **Add the test panel to any view**:

```tsx
// In src/app/web-transc/views/TranscribeView.tsx or any component
import { ApiTestPanel } from "../components/ApiTestPanel";

export default function TranscribeView() {
  return (
    <div>
      {/* Add test panel anywhere */}
      <ApiTestPanel />

      {/* Your existing components */}
    </div>
  );
}
```

2. **Click "Configure Local API"** button

3. **Click "Run Full Test"** button

4. **Check console for detailed logs**

### Method 3: Direct Function Call (Quick Test)

1. **Create a test file** (temporary):

```typescript
// src/app/web-transc/test-runner.ts
import { testApiSyncFlow } from "./utils/testApiSync";

export async function runTest() {
  await testApiSyncFlow();
}
```

2. **Import and run** from anywhere:

```typescript
import { runTest } from "@/app/web-transc/test-runner";
await runTest();
```

---

## 📊 What the Tests Do

### Full API Sync Test (`testApiSyncFlow`)

```
Step 1: Configure API Settings
  ✓ Enable API sync
  ✓ Set endpoint to localhost:3000/api/transcripts
  ✓ Set test API key
  ✓ Enable compression

Step 2: Create Test Transcript
  ✓ Generate 10-second test audio (sine wave)
  ✓ Save original audio to IndexedDB
  ✓ Compress audio (expect ~70% reduction)
  ✓ Create transcript with chunks and segments
  ✓ Set sync status to 'pending'

Step 3: Queue for Sync
  ✓ Add to background sync queue
  ✓ Verify queue size increases

Step 4: Wait for Background Processing
  ✓ Wait 3 seconds for sync to complete
  ✓ Background service processes queue

Step 5: Verify Results
  ✓ Check sync status changed to 'synced'
  ✓ Verify syncedAt timestamp is set
  ✓ Confirm no errors
```

### Compression Test (`testAudioCompression`)

```
✓ Create 30-second test audio
✓ Compress using Web Audio API
✓ Measure compression ratio
✓ Report size reduction (expect ~70%)
✓ Measure compression time
```

---

## 🔍 Expected Test Output

### Console Output (Success)

```
🧪 ===== STARTING API SYNC TEST =====

📋 Step 1: Configure API settings
⚙️ Configuring test API settings...
✅ API settings configured:
  Endpoint: http://localhost:3000/api/transcripts
  API Key: Set
  Compression: Enabled

📋 Step 2: Create test transcript with audio
🧪 Creating test transcript...
🎵 Test audio created: 320.04 KB
💾 Original audio saved
🗜️ Compressing audio...
✅ Compressed audio saved: 96.04 KB (70.0% reduction)
✅ Test transcript created: test-transcript-1234567890-abc123

📋 Step 3: Queue transcript for API sync
✅ Transcript queued
📊 Queue size: 1

📋 Step 4: Waiting for sync to complete...
📤 Processing sync for transcript test-transcript-1234567890-abc123
🔄 Sending transcript to API...
📥 Mock API: Received transcript sync request
📝 Transcript ID: test-transcript-1234567890-abc123
📄 File Name: test-audio.wav
⏱️  Duration: 6.5 seconds
👥 Speaker Count: 2
🌍 Language: en
🎵 Compressed Audio: 96.04 KB (base64)
💾 Mock: Saving transcript to database...
✅ Mock: Transcript saved successfully!
✅ Background sync completed

📋 Step 5: Checking sync status
📊 Sync Status: synced
📊 Synced At: 1234567890123
📊 Error: None

✅ ===== TEST PASSED =====
Transcript successfully synced to API!
```

### Network Tab (Success)

```
POST http://localhost:3000/api/transcripts
Status: 200 OK
Request Headers:
  Content-Type: application/json
  Authorization: Bearer test-api-key-12345
Request Body:
  {
    "id": "test-transcript-...",
    "fileName": "test-audio.wav",
    "fullText": "Hello, this is a test...",
    "compressedAudio": "UklGR..." // base64
    // ... other fields
  }
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

## ✅ Test Checklist

After running tests, verify:

- [ ] Console shows "TEST PASSED"
- [ ] Network tab shows 200 OK response from `/api/transcripts`
- [ ] Request includes compressed audio (base64)
- [ ] Response includes `success: true`
- [ ] Sync status changed from `pending` to `synced`
- [ ] Compressed audio is ~30% of original size
- [ ] No errors in console
- [ ] Queue size returns to 0 after processing

---

## 🐛 Troubleshooting

### Test fails with "Failed to fetch"

**Cause**: Dev server not running or wrong port  
**Fix**: Ensure `bun dev` is running on port 3000

### Compression test fails

**Cause**: Browser doesn't support Web Audio API  
**Fix**: Use Chrome, Firefox, or Edge (not IE)

### Sync status stuck on "pending"

**Cause**: Background service not processing  
**Fix**: Wait longer (up to 5 seconds) or check console for errors

### API endpoint returns 404

**Cause**: API route not found  
**Fix**: Verify file exists at `src/app/api/transcripts/route.ts`

### TypeError in console

**Cause**: Missing import or type issue  
**Fix**: Check that all files are created and imports are correct

---

## 🎯 Quick Test Commands

Copy-paste these into your browser console:

```javascript
// Quick full test
testApiSync.testFullFlow();

// Quick compression test
testApiSync.testCompression();

// Check queue
console.log("Queue size:", testApiSync.queueSize());

// Clear queue if stuck
testApiSync.clearQueue();

// Create test transcript manually
const id = await testApiSync.createTranscript(true);
console.log("Created:", id);
```

---

## 📈 Performance Expectations

- **Compression Time**: ~50-200ms for 10-second audio
- **API Request Time**: ~500-1000ms (includes 500ms mock delay)
- **Total Sync Time**: ~1-2 seconds from queue to completion
- **Compression Ratio**: ~70% size reduction (30% of original)

---

## 🔒 Security Note

The mock API accepts any API key for testing. In production:

- Validate API keys against your auth system
- Use HTTPS only
- Rate limit requests
- Sanitize input data
- Log failed auth attempts

---

## 📚 Next Steps

After successful testing:

1. ✅ Verify tests pass
2. Add `ApiSettingsModal` to your UI
3. Replace mock endpoint with real API
4. Deploy and test in production
5. Monitor sync success rates
6. Adjust retry logic if needed

---

**Need Help?** Check the console for detailed logs or review the
implementation docs in `docs/API_SYNC_FEATURE.md`.
