# Audio Player Sync/Compress Button

## ✅ What Was Added

Added a **Compress & Backup** button to the AudioPlayer component that
triggers audio compression on-demand.

### Location

- **Component**: `AudioPlayer.tsx`
- **Position**: Next to the Edit buttons (conversation name and speaker
  names)

---

## 🎨 UI/UX Features

### Button Appearance

- **Icon**: Circular arrows (RefreshCw from lucide-react)
- **States**:
  - **Idle**: Gray background, static icon
  - **Compressing**: Blue background, spinning icon
  - **Hover**: Scale animation (1.05x)
  - **Click**: Scale animation (0.95x)

### Button Behavior

1. **Visible When**: Both `transcriptId` and `audioFileId` props are
   provided
2. **Disabled When**: Compression is already in progress
3. **Tooltip**:
   - Idle: "Compress & backup audio"
   - Active: "Compressing..."

---

## 🔧 Technical Implementation

### New Props

```typescript
interface AudioPlayerProps {
  // ... existing props
  audioFileId?: string; // ID of audio file in storage for compression
}
```

### New State

```typescript
const [isCompressing, setIsCompressing] = useState<boolean>(false);
```

### Compression Handler

```typescript
const handleCompress = useCallback(async () => {
  // 1. Validate transcriptId and audioFileId
  // 2. Check if already compressing
  // 3. Get transcript from storage
  // 4. Check if already compressed (has compressedAudioFileId)
  // 5. Get audio blob from blobStorage
  // 6. Compress using compressAudio() with progress callbacks
  // 7. Save compressed audio to blobStorage
  // 8. Update transcript with compressedAudioFileId
  // 9. Show success toast with compression ratio
}, [transcriptId, audioFileId, isCompressing]);
```

---

## 📊 Compression Flow

```
User clicks button
    ↓
Check if already compressed
    ↓ (if not)
Show "Starting compression..." toast
    ↓
Load audio from IndexedDB
    ↓
Compress with progress updates
    ↓
"Compressing: 45%" (toast updates)
    ↓
Save compressed audio to IndexedDB
    ↓
Update transcript record
    ↓
Show success: "Compressed to 8% of original size!"
```

---

## 🎯 User Notifications

### Toast Messages

1. **Start**: "Starting compression..."
2. **Progress**: "Compressing: 45%" (updates in real-time)
3. **Already Compressed**: "Audio already compressed!"
4. **Success**: "Compressed to 8% of original size!"
5. **Error**: "Compression failed: [error message]"

### Visual Feedback

- Button changes to blue during compression
- Icon spins while compressing
- Button disabled during compression

---

## 🔍 Smart Behavior

### Prevents Duplicate Compression

- Checks if `transcript.compressedAudioFileId` exists
- If already compressed, shows info toast and returns early
- No wasted computation

### Error Handling

- Missing transcript/audio ID: Error toast
- Transcript not found: Error toast
- Audio not in storage: Error toast
- Compression failure: Error toast with details
- Always resets `isCompressing` state in finally block

---

## 📝 Usage Example

To use the button, pass the required props to AudioPlayer:

```tsx
<AudioPlayer
  src={audioBlob}
  transcriptId={transcript.id}
  audioFileId={transcript.audioFileId} // Required for compress button
  onEditConversation={handleEditConversation}
  onEditSpeakers={handleEditSpeakers}
/>
```

**Note**: The button only appears when both `transcriptId` AND
`audioFileId` are provided.

---

## 🚀 Future Enhancements (Mentioned by User)

The user mentioned these will be added later:

1. **State Management**: Track sync status (local vs server)
2. **Visual Indicator**:
   - Green: Already synced to server
   - Default: Not synced, clickable to sync
3. **Upload Functionality**: After compression, also upload to backend
4. **Status Persistence**: Remember which transcripts are synced

### Current Implementation (Phase 1)

✅ Compression button with icon ✅ Compression logic ✅ Progress tracking
✅ Toast notifications ✅ Smart duplicate detection

### Future (Phase 2)

- [ ] Check sync status from API
- [ ] Show green indicator if synced
- [ ] Upload after compression
- [ ] Sync status in database
- [ ] Retry logic for failed uploads

---

## 🧪 Testing Checklist

- [ ] Button appears when props are provided
- [ ] Button hidden when props missing
- [ ] Click triggers compression
- [ ] Spinner shows during compression
- [ ] Progress toasts update
- [ ] Success toast shows compression ratio
- [ ] Already compressed shows info toast
- [ ] Error handling works
- [ ] Button disabled during compression
- [ ] Compressed audio saved to IndexedDB
- [ ] Transcript updated with compressed ID

---

## 💡 Implementation Notes

### Why This Approach?

1. **On-Demand**: User controls when compression happens
2. **Visual Feedback**: Clear indication of status
3. **Non-Blocking**: Uses Web Worker (FFmpeg.wasm)
4. **Smart**: Prevents duplicate compression
5. **Extensible**: Easy to add upload later

### Compression Settings

- **Codec**: Opus (best for speech)
- **Bitrate**: 24 kbps
- **Sample Rate**: 16 kHz
- **Channels**: 1 (mono)
- **Expected Reduction**: 90-95%

---

## 📦 Dependencies Added

- `RefreshCw` icon from lucide-react
- `compressAudio` from @/features/audioCompressor
- `blobStorage` from @/lib/localStorage/storage
- `transcripts` from @/lib/localStorage/collections
- `toast` from sonner

---

**Status**: ✅ Complete and ready to test!

**Next Step**: Add the button to your transcript detail page by passing the
`audioFileId` prop to the AudioPlayer component.
