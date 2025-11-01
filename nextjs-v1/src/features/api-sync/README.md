# API Sync Feature

Automated transcript synchronization to external APIs with audio
compression and background queueing.

## 📁 Folder Structure

```
src/features/api-sync/
├── README.md                    # This file
├── index.ts                     # Public API exports
├── components/                  # React components
│   └── ApiSettingsModal.tsx    # Settings UI for API sync
├── services/                    # Core business logic
│   ├── ApiSyncService.ts       # Sync service & background queue
│   └── AudioCompressionService.ts # Audio compression utilities
├── types/                       # TypeScript type definitions
│   └── index.ts                # Centralized types
├── hooks/                       # React hooks (future)
├── utils/                       # Utility functions (future)
└── tests/                       # Unit & integration tests (future)
```

## 🚀 Features

### 1. **API Synchronization**

- Automatically syncs transcripts to external API endpoints
- Background queue with retry logic
- Non-blocking operations
- Status tracking (pending, syncing, synced, error, disabled)

### 2. **Audio Compression**

- Compresses audio to WAV format with lower sample rate
- Reduces file size by ~70% (typically)
- Mono channel (16kHz, 16-bit)
- Skips already-compressed formats (MP3, AAC, OGG, etc.)

### 3. **Settings Management**

- Toggle API sync on/off
- Toggle audio compression on/off
- Connection testing
- Visual indicators for active sync

## 📖 Usage

### Basic Import

```typescript
import {
  ApiSettingsModal,
  backgroundSyncService,
  compressAudio,
} from "@/features/api-sync";
```

### Components

#### ApiSettingsModal

Settings modal for configuring API sync and audio compression.

```typescript
import { ApiSettingsModal } from "@/features/api-sync";

function NavBar() {
  return (
    <div>
      <ApiSettingsModal />
    </div>
  );
}
```

**Props:**

- `disabled?: boolean` - Disable the settings button

### Services

#### Background Sync Service

Handles automatic transcript synchronization in the background.

```typescript
import { backgroundSyncService } from "@/features/api-sync";

// Queue a transcript for sync
backgroundSyncService.queueSync("transcript-123");

// Check queue size
const queueSize = backgroundSyncService.getQueueSize();

// Clear the queue
backgroundSyncService.clearQueue();
```

**Methods:**

- `queueSync(transcriptId: string): void` - Queue a transcript for sync
- `getQueueSize(): number` - Get current queue size
- `clearQueue(): void` - Clear all queued items

#### Audio Compression Service

Compresses audio blobs for efficient storage and transmission.

```typescript
import {
  compressAudio,
  isCompressionAvailable,
} from "@/features/api-sync";

// Compress an audio blob
const originalBlob = new Blob([audioData], { type: "audio/wav" });
const compressedBlob = await compressAudio(originalBlob, {
  sampleRate: 16000,
  channels: 1,
  quality: 0.7,
});

// Check if compression is available
if (isCompressionAvailable()) {
  // Compression is supported
}
```

**Functions:**

- `compressAudio(blob: Blob, options?: CompressionOptions): Promise<Blob>`
- `isCompressionAvailable(): boolean`
- `getEstimatedCompressionRatio(): number`

### React Query Hook

Use the `useTranscriptSync` hook for manual sync operations.

```typescript
import { useTranscriptSync } from "@/features/api-sync";

function MyComponent() {
  const { mutate: syncTranscript, isPending } = useTranscriptSync();

  const handleSync = () => {
    syncTranscript({
      transcriptId: "transcript-123",
      apiEndpoint: "https://api.example.com/transcripts",
      apiKey: "your-api-key",
      includeAudio: true,
    });
  };

  return <button onClick={handleSync}>Sync</button>;
}
```

## 🔧 Configuration

### App Settings Schema

Settings are stored in IndexedDB using the `AppSettings` schema:

```typescript
interface AppSettings {
  // ... other settings
  apiEnabled: boolean; // Enable/disable API sync
  compressAudio: boolean; // Enable/disable compression
  apiEndpoint?: string; // API endpoint URL
  apiKey?: string; // API authentication key
}
```

### Default Configuration

```typescript
const DEFAULT_SETTINGS = {
  apiEnabled: false,
  compressAudio: true,
  // ... other defaults
};
```

## 🔄 API Flow

### Automatic Sync Flow

1. **User saves transcript** → `useTranscripts.save()`
2. **Check if API sync is enabled** → Load settings from IndexedDB
3. **Queue transcript** → `backgroundSyncService.queueSync(id)`
4. **Process queue** → Background service processes items
5. **Prepare DTO** → `prepareTranscriptForSync()`
6. **Compress audio** → Convert to base64 if included
7. **Send to API** → POST request to configured endpoint
8. **Update status** → Mark as "synced" or "error"

### Sync Status States

- **`disabled`** - API sync is turned off
- **`pending`** - Queued for sync, waiting to process
- **`syncing`** - Currently being sent to API
- **`synced`** - Successfully synced
- **`error`** - Sync failed (includes error message)

## 📡 API Contract

### Endpoint

```
POST http://localhost:3010/api/transcripts/create
```

### Headers

```
Content-Type: application/json
X-Access-Token: dev-token
```

### Request Body (TranscriptSyncDTO)

```typescript
{
  id: string;
  fileName: string;
  duration: number;
  speakerCount: number;
  language: string;
  model: string;
  createdAt: number;
  fullText: string;
  chunks: Array<{
    text: string;
    timestamp: [number, number];
  }>;
  segments: Array<{
    label: string;
    start: number;
    end: number;
  }>;
  speakerNames?: Record<string, string>;
  compressedAudio?: string;        // base64 encoded
  compressedAudioMimeType?: string; // e.g., "audio/wav"
}
```

### Response (ApiSyncResponse)

```typescript
{
  success: boolean;
  transcriptId: string;
  message?: string;
  serverTranscriptId?: string; // Optional server-assigned ID
}
```

## 🧪 Testing

### Health Check Endpoint

```
GET http://localhost:3010/api/transcripts/health
```

**Response:**

```json
{
  "status": "ok"
}
```

### Manual Testing

The `ApiSettingsModal` includes a "Test Connection" button that verifies
API connectivity.

## 🎯 Integration Points

### Where API Sync is Triggered

1. **Single Transcript Upload** →
   [`useTranscripts.ts:194`](../../app/web-transc/hooks/useTranscripts.ts#L194)
2. **Batch Upload** →
   [`BatchQueueManager.ts:595`](../../app/web-transc/services/BatchQueueManager.ts#L595)

### Where Settings are Checked

1. **On transcript save** → Before queueing
2. **In background processor** → Before processing queue
3. **In settings modal** → For UI state

## 🔒 Security Considerations

- **API keys** are stored in IndexedDB (client-side)
- **Access tokens** are sent in request headers
- **Audio data** is base64 encoded for transmission
- Currently hardcoded to `localhost:3010` (should be configurable in
  production)

## 🚧 Future Enhancements

- [ ] Configurable API endpoint and token via UI
- [ ] Better error handling and user notifications
- [ ] Sync status dashboard
- [ ] Retry failed syncs with exponential backoff
- [ ] Batch sync operations
- [ ] MP3 encoding with lamejs
- [ ] Unit and integration tests
- [ ] Offline queue persistence

## 📝 Notes

- Compression uses Web Audio API (browser-native)
- Background sync is non-blocking and doesn't affect UI performance
- Failed syncs are logged but don't stop transcript saving
- Queue is cleared if API sync is disabled

## 🤝 Contributing

When adding new features:

1. Add types to `types/index.ts`
2. Add services to `services/`
3. Add components to `components/`
4. Export from `index.ts`
5. Update this README
6. Add tests to `tests/`

## 📄 License

Part of the Local Whisper Diarization project.
