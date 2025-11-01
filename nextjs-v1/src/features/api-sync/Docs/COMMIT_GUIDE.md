# API Sync Feature - Commit Guide

## Branch

`adding_ext_api_integration`

## Summary

This commit introduces a clean, maintainable API sync feature with the
following capabilities:

- Automatic transcript synchronization to external APIs
- Background queue with retry logic
- Audio compression (WAV @ 16kHz, mono)
- Settings UI with connection testing
- Feature-based folder structure for maintainability

## Files to Commit

### 🆕 New Feature Files

```
src/features/api-sync/
├── README.md                           # Feature documentation
├── ARCHITECTURE.md                     # Architecture documentation
├── index.ts                            # Public API exports
├── components/
│   └── ApiSettingsModal.tsx           # Settings UI component
├── services/
│   ├── ApiSyncService.ts              # Sync service & queue
│   └── AudioCompressionService.ts     # Audio compression
└── types/
    └── index.ts                        # Type definitions
```

### ✏️ Modified Integration Files

```
src/app/providers.tsx                   # Settings initialization
src/components/home-navbar/HomeNavbar.tsx  # Settings modal button
src/app/web-transc/hooks/useTranscripts.ts # API sync integration
src/app/web-transc/services/BatchQueueManager.ts # Batch sync integration
src/lib/localStorage/schemas.ts         # Settings schema
src/lib/localStorage/initializeSettings.ts # Settings initialization utility
```

### 📚 Documentation Files (Optional)

```
nextjs-v1/docs/API_SYNC_FEATURE.md
nextjs-v1/docs/API_SYNC_IMPLEMENTATION.md
nextjs-v1/COMPRESSION_FIX.md
nextjs-v1/HOW_TO_TEST.md
nextjs-v1/ORPC_INTEGRATION.md
nextjs-v1/QUICK_START_API_SYNC.md
nextjs-v1/TEST_API_SYNC.md
```

### ⚠️ Files to Delete (Old Locations)

These files have been moved to the feature folder:

```
src/app/web-transc/components/ApiSettingsModal.tsx  → DELETED
src/app/web-transc/components/ApiTestPanel.tsx      → DELETED
src/app/web-transc/services/ApiSyncService.ts       → DELETED
src/app/web-transc/services/AudioCompressionService.ts → DELETED
src/app/web-transc/utils/testApiSync.ts             → DELETED
```

## Commit Message

### Option 1: Concise

```
feat: add API sync feature with audio compression

- Implement background transcript sync to external APIs
- Add audio compression (WAV @ 16kHz, mono)
- Create feature-based folder structure (src/features/api-sync/)
- Add settings UI with connection testing
- Initialize default settings on app startup
```

### Option 2: Detailed

```
feat: add API sync feature with clean architecture

This commit introduces a comprehensive API sync feature with the following components:

Features:
- Automatic transcript synchronization to external API endpoints
- Background queue with non-blocking processing
- Audio compression (reduces file size by ~70%)
- Settings modal with toggle controls and connection testing
- Visual indicators for sync status

Architecture:
- Feature-based organization (src/features/api-sync/)
- Clean API surface with single entry point (index.ts)
- Centralized type definitions
- Separation of concerns (components, services, types)

Integration Points:
- Settings initialization on app startup (providers.tsx)
- Navbar integration for easy access (HomeNavbar.tsx)
- Automatic sync trigger on transcript save (useTranscripts.ts)
- Batch upload support (BatchQueueManager.ts)

Files:
- Created: src/features/api-sync/* (feature folder)
- Modified: providers.tsx, HomeNavbar.tsx, useTranscripts.ts, BatchQueueManager.ts
- Added: initializeSettings.ts, updated schemas.ts

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Git Commands

### Step 1: Review Changes

```bash
git status
git diff src/features/api-sync/
git diff src/app/providers.tsx
git diff src/components/home-navbar/HomeNavbar.tsx
git diff src/app/web-transc/hooks/useTranscripts.ts
git diff src/app/web-transc/services/BatchQueueManager.ts
git diff src/lib/localStorage/
```

### Step 2: Stage Feature Files

```bash
# Add new feature folder
git add src/features/api-sync/

# Add integration files
git add src/app/providers.tsx
git add src/components/home-navbar/HomeNavbar.tsx
git add src/app/web-transc/hooks/useTranscripts.ts
git add src/app/web-transc/services/BatchQueueManager.ts
git add src/lib/localStorage/schemas.ts
git add src/lib/localStorage/initializeSettings.ts
```

### Step 3: Remove Old Files

```bash
git rm src/app/web-transc/components/ApiSettingsModal.tsx
git rm src/app/web-transc/components/ApiTestPanel.tsx
git rm src/app/web-transc/services/ApiSyncService.ts
git rm src/app/web-transc/services/AudioCompressionService.ts
git rm src/app/web-transc/utils/testApiSync.ts
```

### Step 4: Optional Documentation

```bash
# Add if you want comprehensive docs in the repo
git add nextjs-v1/docs/
git add nextjs-v1/*.md

# Or skip if you prefer lean commits
# (Documentation is also in src/features/api-sync/README.md)
```

### Step 5: Commit

```bash
git commit -m "$(cat <<'EOF'
feat: add API sync feature with audio compression

- Implement background transcript sync to external APIs
- Add audio compression (WAV @ 16kHz, mono)
- Create feature-based folder structure (src/features/api-sync/)
- Add settings UI with connection testing
- Initialize default settings on app startup

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

## Verification Checklist

Before committing, verify:

- [ ] Build passes: `npm run build`
- [ ] No TypeScript errors (for feature files)
- [ ] Prettier formatted:
      `npx prettier --write "src/features/api-sync/**/*.{ts,tsx}"`
- [ ] Old files deleted from previous location
- [ ] All imports updated to use `@/features/api-sync`
- [ ] Settings modal appears in navbar
- [ ] Settings initialization works on app startup
- [ ] Documentation is comprehensive

## Testing the Feature

After committing, test:

1. **Settings UI**
   - Open app → Click settings icon in navbar
   - Toggle API sync on/off
   - Toggle audio compression on/off
   - Click "Test Connection" (should fail if server not running)
   - Verify visual indicator (dot) appears when enabled

2. **Transcript Save**
   - Upload a transcript with API sync enabled
   - Check console for sync logs (`📤`, `🔄`, `✅`)
   - Verify transcript status updates

3. **Audio Compression**
   - Upload with compression enabled
   - Check console for compression logs (`🗜️`)
   - Verify compressed size is smaller

## Related Pull Requests

If creating a PR, reference:

- Main branch: `main`
- Feature branch: `adding_ext_api_integration`
- Related issues: (add issue numbers if applicable)

## Notes

- **API Server Required**: The feature syncs to
  `http://localhost:3010/api/transcripts/create`
- **Default Settings**: API sync is disabled by default (user must enable)
- **Non-Blocking**: All sync operations are background, non-blocking
- **Error Handling**: Sync failures don't prevent transcript saving

## Future Work

Items not included in this commit:

- [ ] Unit tests for services
- [ ] E2E tests for complete flow
- [ ] Configurable API endpoint in UI
- [ ] MP3 compression with lamejs
- [ ] Offline queue persistence
- [ ] WebSocket support for real-time sync
