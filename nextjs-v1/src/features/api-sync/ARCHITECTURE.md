# API Sync Feature - Architecture

## Overview

The API Sync feature provides automatic synchronization of transcripts to
external API endpoints with audio compression capabilities. It's designed
as a modular, maintainable feature with clean separation of concerns.

## Design Principles

### 1. **Feature-Based Organization**

All related code is contained within `src/features/api-sync/`, making it
easy to:

- Understand the feature scope
- Maintain and update
- Test in isolation
- Remove if needed

### 2. **Clean API Surface**

Single entry point via `index.ts`:

```typescript
import {
  ApiSettingsModal,
  backgroundSyncService,
  compressAudio,
} from "@/features/api-sync";
```

### 3. **Type Safety**

Centralized type definitions ensure consistency:

- `TranscriptSyncDTO` - Data transfer object
- `ApiSyncResponse` - API response structure
- `ApiSyncStatus` - Status enumeration
- `CompressionConfig` - Compression settings

### 4. **Separation of Concerns**

```
components/   → UI & user interaction
services/     → Business logic & APIs
types/        → Type definitions
hooks/        → React hooks (future)
utils/        → Helper functions (future)
tests/        → Testing (future)
```

## Architecture Layers

### Layer 1: UI Components (`components/`)

**ApiSettingsModal**

- User interface for settings
- State management (local)
- Settings persistence
- Connection testing

### Layer 2: Services (`services/`)

**ApiSyncService**

- Background sync queue management
- React Query integration
- Status tracking
- API communication

**AudioCompressionService**

- Audio blob compression
- WAV encoding
- Format detection

### Layer 3: Types (`types/`)

**Centralized Definitions**

- Interface definitions
- Type aliases
- Enumerations

## Data Flow

### Transcript Save Flow

```
User uploads file
     ↓
useTranscripts.save()
     ↓
Check app settings (apiEnabled?)
     ↓
[IF ENABLED]
     ↓
backgroundSyncService.queueSync(id)
     ↓
Process queue (background)
     ↓
Prepare DTO + Compress audio
     ↓
Send POST to API
     ↓
Update sync status
```

### Settings Update Flow

```
User opens ApiSettingsModal
     ↓
Load current settings from IndexedDB
     ↓
User modifies settings
     ↓
Save to IndexedDB
     ↓
Components reactively update
```

## State Management

### LocalStorage (IndexedDB)

- **App Settings** - Stored in `settings` collection
  - `apiEnabled: boolean`
  - `compressAudio: boolean`
  - `apiEndpoint?: string`
  - `apiKey?: string`

- **Transcript Metadata** - Stored with each transcript
  - `apiSyncStatus: ApiSyncStatus`
  - `apiSyncedAt?: number`
  - `apiError?: string`

### In-Memory State

- **BackgroundSyncService**
  - `queue: Set<string>` - Pending transcript IDs
  - `isProcessing: boolean` - Processing flag

- **React Component State**
  - Modal open/close
  - Loading states
  - Test results

## Error Handling

### Levels of Error Handling

1. **Service Level**
   - Catch errors in service methods
   - Log to console
   - Return fallback values

2. **Queue Level**
   - Mark transcript as "error"
   - Store error message
   - Continue processing other items

3. **UI Level**
   - Toast notifications (sonner)
   - Error messages in modal
   - Visual indicators

### Non-Blocking Design

- Sync failures don't prevent transcript saving
- UI remains responsive during background sync
- Errors are logged but don't crash the app

## Integration Points

### Existing Systems

1. **IndexedDB Collections** (`@/lib/localStorage/collections`)
   - Read/write app settings
   - Update transcript sync status

2. **Blob Storage** (`@/lib/localStorage/storage`)
   - Retrieve compressed audio blobs

3. **React Query** (`@tanstack/react-query`)
   - Manage sync mutations
   - Cache invalidation

4. **UI Components** (`@/components/ui`)
   - Dialog, Button, Switch, etc.
   - Consistent design system

### Entry Points

**Where API Sync is Triggered:**

1. Single upload: `useTranscripts.save()` → line 194
2. Batch upload: `BatchQueueManager._saveTranscript()` → line 595

**Where Settings are Accessed:**

1. `ApiSettingsModal` - Read/write settings
2. `useTranscripts` - Check apiEnabled before queue
3. `BackgroundSyncService` - Check apiEnabled before processing

## Performance Considerations

### Audio Compression

- Uses Web Audio API (browser-native, no external deps)
- Runs in main thread (consider Web Workers for large files)
- Typical compression: 70% reduction (WAV @ 16kHz, mono)

### Background Sync

- Non-blocking (`setTimeout` for queue processing)
- Single-item processing (no parallel requests)
- Exponential backoff for retries (React Query)

### Memory Management

- Audio blobs converted to base64 on-demand
- Queue stored as Set (lightweight, no duplicates)
- Blob storage GC handled by IndexedDB

## Security & Privacy

### Data Storage

- All data stored client-side (IndexedDB)
- API keys in plaintext (consider encryption)
- No server-side state

### API Communication

- HTTPS recommended (currently http://localhost)
- Token-based auth (`X-Access-Token` header)
- Base64 encoding for audio transmission

## Testing Strategy (Future)

### Unit Tests

- Audio compression functions
- DTO preparation
- Status update logic

### Integration Tests

- Background queue processing
- Settings persistence
- API communication (mocked)

### E2E Tests

- Complete sync flow
- Settings modal interaction
- Error scenarios

## Scalability

### Current Limitations

1. Single-item queue processing (sequential)
2. No retry persistence (queue lost on page refresh)
3. Hardcoded API endpoint

### Future Enhancements

1. Parallel sync (batch requests)
2. Persistent queue (IndexedDB)
3. Configurable endpoints
4. WebSocket support for real-time sync
5. Offline queue with sync on reconnect

## Dependencies

### External

- `@tanstack/react-query` - Async state management
- `sonner` - Toast notifications
- `lucide-react` - Icons
- `zod` - Schema validation (via localStorage)

### Internal

- `@/lib/localStorage/*` - Data persistence
- `@/components/ui/*` - UI components
- `@/lib/localStorage/schemas` - Type definitions

## Maintenance Guidelines

### Adding New Features

1. Add types to `types/index.ts`
2. Implement in appropriate service
3. Export from `index.ts`
4. Update README.md
5. Add tests

### Modifying API Contract

1. Update `TranscriptSyncDTO` type
2. Update `prepareTranscriptForSync` function
3. Document in README.md
4. Test with actual API

### Removing the Feature

1. Delete `src/features/api-sync/` folder
2. Remove imports from:
   - `useTranscripts.ts`
   - `BatchQueueManager.ts`
   - `HomeNavbar.tsx`
3. Remove schema fields from `SavedTranscript`:
   - `apiSyncStatus`
   - `apiSyncedAt`
   - `apiError`
   - `compressedAudioFileId`

## Monitoring & Debugging

### Console Logs

- `🗜️` Audio compression
- `📤` Queue operations
- `🔄` Processing status
- `✅` Success
- `❌` Errors

### Development Tools

- React Query DevTools
- IndexedDB inspector (browser)
- Network tab for API calls

### Status Indicators

- Settings icon dot (API enabled)
- Queue size badge
- Sync status in transcript metadata

## Related Documentation

- [README.md](./README.md) - User-facing documentation
- [API_SYNC_FEATURE.md](../../docs/API_SYNC_FEATURE.md) - Original feature
  docs
- [schemas.ts](../../lib/localStorage/schemas.ts) - Data schemas
