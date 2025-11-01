# oRPC Integration - API Sync Migration

## Summary

Migrated from Next.js API routes to oRPC Node server for transcript
synchronization. All changes follow the **minimal changes** principle.

---

## Changes Made

### **Server Side (server_orpc)**

#### 1. Completed `transcriptsRouter.ts`

**File**: `server_orpc/src/routers/transcriptsRouter.ts`

**Changes:**

- ✅ Added complete input schema matching client `TranscriptSyncDTO`
- ✅ Added output schema matching client `ApiSyncResponse`
- ✅ Implemented `createTranscript` handler with detailed console logging
- ✅ Implemented `getTranscriptsHealth` health check endpoint

**Lines Modified:** ~90 lines

**Handler Console Output:**

```
📥 Received transcript from user: <userId>
📝 Transcript ID: <id>
📄 File Name: <fileName>
⏱️  Duration: <duration> seconds
👥 Speaker Count: <count>
🌍 Language: <language>
🤖 Model: <model>
📝 Full Text Length: <length> characters
🔢 Chunks Count: <count>
🎯 Segments Count: <count>
🎵 Compressed Audio: <size> KB
🎵 Audio Type: <mimeType>
🗣️  Speaker Names: <names>
✅ Transcript processed successfully
🆔 Server Transcript ID: server-<timestamp>-<random>
```

#### 2. Added Router to Index

**File**: `server_orpc/src/routers/index.ts`

**Changes:**

- ✅ Imported `createTranscript` and `getTranscriptsHealth`
- ✅ Added `transcripts` namespace to router

**Lines Modified:** 5 lines

```typescript
transcripts: {
  create: createTranscript,
  health: getTranscriptsHealth,
}
```

---

### **Client Side (nextjs-v1)**

#### 1. Updated ApiSyncService

**File**: `nextjs-v1/src/app/web-transc/services/ApiSyncService.ts`

**Changes:**

- ✅ Imported oRPC client from `@/lib/oRPC_node_server/clients/orpc`
- ✅ Replaced `fetch` calls with `orpcClient.transcripts.create()`
- ✅ Removed `apiEndpoint` and `apiKey` parameters (oRPC handles auth)
- ✅ Simplified `sendTranscriptToApi` function
- ✅ Updated `getApiSettings` to only check `apiEnabled`

**Lines Modified:** ~30 lines

**Before:**

```typescript
const response = await fetch(apiEndpoint, {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify(dto),
});
```

**After:**

```typescript
const response = await orpcClient.transcripts.create({
  ...dto, // All fields mapped
});
```

#### 2. Simplified ApiSettingsModal

**File**: `nextjs-v1/src/app/web-transc/components/ApiSettingsModal.tsx`

**Changes:**

- ✅ Removed `apiEndpoint` and `apiKey` state/inputs
- ✅ Updated test connection to use oRPC health check
- ✅ Simplified UI (removed endpoint/key fields)
- ✅ Updated info banner with oRPC details

**Lines Modified:** ~80 lines

**New UI:**

- ✅ Audio compression toggle
- ✅ API sync enable toggle
- ✅ Test oRPC Connection button
- ✅ Info: "Transcripts are sent to oRPC server (localhost:3010)"

---

## How It Works

### Flow Diagram

```
Client (Browser)
     ↓
Audio Compression
     ↓
IndexedDB Storage
     ↓
Background Sync Service
     ↓
oRPC Client (localhost:3010/rpc)
     ↓
oRPC Server Handler
     ↓
Console Logs + Response
     ↓
Client Updates Sync Status
```

### API Call Structure

**oRPC Call:**

```typescript
orpcClient.transcripts.create({
  id: string,
  fileName: string,
  duration: number,
  speakerCount: number,
  language: string,
  model: string,
  createdAt: number,
  fullText: string,
  chunks: Array<{ text, timestamp }>,
  segments: Array<{ label, start, end }>,
  speakerNames?: Record<string, string>,
  compressedAudio?: string, // base64
  compressedAudioMimeType?: string,
})
```

**Response:**

```typescript
{
  success: true,
  transcriptId: "transcript-...",
  serverTranscriptId: "server-...",
  message: "Transcript received and processed successfully"
}
```

---

## Testing

### 1. Start oRPC Server

```bash
cd server_orpc
bun run dev  # or npm run dev
```

Server should be running on **localhost:3010**

### 2. Start Next.js Dev Server

```bash
cd nextjs-v1
bun dev
```

### 3. Enable API Sync

1. Open your app in browser
2. Add `<ApiSettingsModal />` to any view
3. Click "API Settings"
4. Toggle "Enable API Sync" ON
5. Click "Test oRPC Connection" (should see success)
6. Save settings

### 4. Upload Audio File

1. Upload an audio file for transcription
2. Wait for transcription to complete
3. Check **oRPC server console** for logs:

```
📥 Received transcript from user: <userId>
📝 Transcript ID: transcript-1234...
📄 File Name: recording.mp3
⏱️  Duration: 45.2 seconds
👥 Speaker Count: 2
🌍 Language: en
🤖 Model: whisper-base
📝 Full Text Length: 234 characters
🔢 Chunks Count: 42
🎯 Segments Count: 5
🎵 Compressed Audio: 145.23 KB
✅ Transcript processed successfully
```

### 5. Verify Sync Status

Check browser console:

```
✅ Transcript transcript-1234... synced successfully
```

Check IndexedDB → `transcripts` → Find your transcript:

- `apiSyncStatus`: "synced"
- `apiSyncedAt`: <timestamp>

---

## Configuration

### oRPC Client

**File**: `nextjs-v1/src/lib/oRPC_node_server/clients/orpc.ts`

```typescript
const link = new RPCLink({
  url: "http://localhost:3010/rpc",
  headers: () => ({
    "x-access-token": getToken(), // Auto authentication
  }),
});
```

### App Settings (IndexedDB)

```typescript
{
  apiEnabled: boolean,  // Enable/disable sync
  compressAudio: boolean, // Enable/disable compression
  // apiEndpoint removed - oRPC handles this
  // apiKey removed - oRPC handles auth
}
```

---

## Advantages of oRPC

✅ **Type-Safe**: Full TypeScript types from server to client  
✅ **Auto Auth**: Authentication handled automatically  
✅ **No Manual Endpoints**: No need to configure URLs  
✅ **Better DX**: Autocomplete for all endpoints  
✅ **Validation**: Zod schemas on both ends  
✅ **Error Handling**: Built-in error types

---

## Files Modified

| File                                                           | Type     | Lines Changed |
| -------------------------------------------------------------- | -------- | ------------- |
| `server_orpc/src/routers/transcriptsRouter.ts`                 | Modified | ~90           |
| `server_orpc/src/routers/index.ts`                             | Modified | 5             |
| `nextjs-v1/src/app/web-transc/services/ApiSyncService.ts`      | Modified | ~30           |
| `nextjs-v1/src/app/web-transc/components/ApiSettingsModal.tsx` | Modified | ~80           |

**Total:** ~205 lines modified across 4 files

---

## Old vs New

### Old (Next.js API Route)

```typescript
// Manual fetch
await fetch("http://localhost:3000/api/transcripts", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify(data),
});

// User configures endpoint + key in UI
```

### New (oRPC)

```typescript
// Type-safe oRPC call
await orpcClient.transcripts.create(data);

// Auto authentication
// No endpoint configuration needed
```

---

## Next Steps

1. ✅ **Test the integration** - Upload an audio file
2. ✅ **Verify server logs** - Check oRPC console
3. ✅ **Verify sync status** - Check browser IndexedDB
4. Add database persistence in server (TODO in handler)
5. Add business logic for transcript processing
6. Deploy oRPC server to production

---

## Troubleshooting

### "Failed to connect to oRPC server"

- ✅ Verify oRPC server is running on localhost:3010
- ✅ Check `bun run dev` in server_orpc directory

### "Authentication failed"

- ✅ oRPC client auto-adds token via `getToken()`
- ✅ Check `x-access-token` header in network tab

### "Schema validation error"

- ✅ Ensure client DTO matches server schema
- ✅ Check Zod validation errors in console

---

**✅ Integration Complete!** The system now uses oRPC for type-safe,
authenticated API calls with automatic handling.
