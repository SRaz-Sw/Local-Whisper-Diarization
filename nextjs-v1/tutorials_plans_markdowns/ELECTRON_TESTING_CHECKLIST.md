# 🧪 Electron App Testing Checklist

Use this checklist to verify your Electron app is working correctly.

## Pre-Testing Setup

- [ ] All dependencies installed (`bun install`)
- [ ] No port conflicts (port 3000 is free)
- [ ] Worker file exists at `public/workers/whisperDiarization.worker.js`
- [ ] Internet connection available (for first model download)

## Development Mode Testing

### Starting the App

- [ ] Run `bun run electron:start`
- [ ] Both Next.js and Electron start without errors
- [ ] Electron window opens and displays the app
- [ ] URL shows web-transc page (not error page)
- [ ] DevTools are open (development mode)

### UI Elements

- [ ] "Load model" button is visible
- [ ] Language selector is visible
- [ ] File upload area is visible
- [ ] Progress indicators are visible (when active)

### Model Loading

- [ ] Click "Load model" button
- [ ] Download progress shows for each file
- [ ] Models download successfully (~80-200MB)
- [ ] "Model loaded" or similar success message appears
- [ ] Button changes to "Run model" or becomes enabled

### Transcription Test

- [ ] Upload a test audio file (MP3, WAV, etc.)
- [ ] File plays in the audio player
- [ ] Language can be selected
- [ ] Click "Run model" button
- [ ] Transcription progress shows
- [ ] Transcription completes without errors
- [ ] Transcript displays with speaker labels
- [ ] Word-level timestamps work (clickable)
- [ ] Can export transcript as JSON

### Offline Test

- [ ] Disconnect from internet
- [ ] Restart app (`bun run electron:start`)
- [ ] App starts without errors
- [ ] Models load from cache (fast)
- [ ] Can transcribe audio without internet
- [ ] All features work offline

### Hot Reload Test

- [ ] Edit a React component (e.g., change button text)
- [ ] App reloads automatically
- [ ] Changes are visible
- [ ] No errors in console

## Production Build Testing

### Build Process

- [ ] Run `bun run electron:build`
- [ ] Next.js build completes successfully
- [ ] Electron packaging completes
- [ ] `dist/` folder is created
- [ ] Installer files are present in `dist/`

### macOS Build (if on Mac)

- [ ] `.dmg` file created
- [ ] `.zip` file created (optional)
- [ ] Open `.dmg` file
- [ ] Drag to Applications works
- [ ] App opens from Applications folder
- [ ] No security warnings (if code signed)

### Windows Build (if on Windows)

- [ ] `.exe` installer created
- [ ] Run installer
- [ ] Installation completes
- [ ] Desktop shortcut created (optional)
- [ ] Start menu entry created
- [ ] App launches from Start menu

### Linux Build (if on Linux)

- [ ] `.AppImage` created
- [ ] `.deb` package created (optional)
- [ ] Make AppImage executable
- [ ] AppImage runs successfully
- [ ] DEB installs correctly (if created)

### Production App Tests

After installing the built app:

- [ ] App launches successfully
- [ ] Window has correct title
- [ ] App icon shows correctly (if added)
- [ ] Click "Load model"
- [ ] Models download on first launch
- [ ] Upload and transcribe test file
- [ ] All features work as expected
- [ ] App works offline after model download
- [ ] Close and reopen - models load from cache
- [ ] No errors in menu bar (if visible)

## Cross-Platform Testing (Optional)

### Test on Multiple Platforms

- [ ] **macOS**: Intel and/or Apple Silicon
- [ ] **Windows**: Windows 10 and/or 11
- [ ] **Linux**: Ubuntu/Debian based distro

### Platform-Specific Features

**macOS**:

- [ ] App in Applications folder
- [ ] Dock icon shows correctly
- [ ] Menu bar works
- [ ] Keyboard shortcuts work (Cmd+Q, etc.)

**Windows**:

- [ ] Taskbar icon shows correctly
- [ ] Start menu entry works
- [ ] Desktop shortcut works (if created)
- [ ] App in Program Files or AppData
- [ ] Keyboard shortcuts work (Alt+F4, etc.)

**Linux**:

- [ ] App icon in application launcher
- [ ] Desktop file works
- [ ] File associations work (if configured)

## Performance Testing

### Speed Tests

- [ ] App starts in < 5 seconds
- [ ] Models load in < 10 seconds (from cache)
- [ ] UI is responsive (no lag)
- [ ] Transcription speed is acceptable
  - WebGPU: ~5-15s for 30s audio
  - WebAssembly: ~15-30s for 30s audio

### Memory Tests

- [ ] Check memory usage in Activity Monitor/Task Manager
- [ ] Memory usage is reasonable (< 4GB with models loaded)
- [ ] No memory leaks (stable usage over time)
- [ ] App doesn't slow down after multiple transcriptions

### Stress Tests

- [ ] Transcribe multiple files in sequence
- [ ] Transcribe large file (5+ minutes)
- [ ] Switch languages multiple times
- [ ] Export transcripts multiple times
- [ ] No crashes or errors

## Security Testing

### App Security

- [ ] No console errors about CSP violations
- [ ] No warnings about insecure content
- [ ] Worker loads without CORS errors
- [ ] Models download over HTTPS
- [ ] No external scripts loaded (except CDN for models)

### Permissions

- [ ] File upload works (file system access)
- [ ] Audio playback works
- [ ] Microphone access works (if feature added)
- [ ] No unnecessary permission requests

## Edge Cases

### Error Handling

- [ ] Upload invalid file type → Shows error
- [ ] Upload corrupted file → Handles gracefully
- [ ] Disconnect during download → Shows error
- [ ] Close during transcription → Can restart

### Unusual Usage

- [ ] Upload very short audio (< 1 second)
- [ ] Upload very long audio (> 10 minutes)
- [ ] Upload silent audio
- [ ] Upload audio with single speaker
- [ ] Upload audio with 3+ speakers
- [ ] Upload non-English audio

## Final Checks

### User Experience

- [ ] UI is intuitive and easy to use
- [ ] Loading states are clear
- [ ] Error messages are helpful
- [ ] Progress indicators are accurate
- [ ] Export functionality works smoothly

### Documentation

- [ ] README is clear and accurate
- [ ] Quick start guide is helpful
- [ ] Troubleshooting section covers common issues
- [ ] All screenshots are up to date (if any)

### Code Quality

- [ ] No console errors in production
- [ ] No console warnings in production
- [ ] Code is properly formatted
- [ ] No TODO comments left in critical sections

## Issue Tracking

If you find issues, note them here:

| Issue                                            | Severity | Platform | Status |
| ------------------------------------------------ | -------- | -------- | ------ |
| Example: Model download fails on slow connection | Medium   | All      | Fixed  |
|                                                  |          |          |        |
|                                                  |          |          |        |

## Test Results Summary

**Test Date**: ******\_\_\_******

**Tested By**: ******\_\_\_******

**Platform(s)**: ******\_\_\_******

**Overall Result**: ⭐ Pass / ❌ Fail

**Notes**:

```
(Add any additional notes here)
```

## Ready for Release?

The app is ready for release when:

- ✅ All "Must Have" items pass
- ✅ No critical bugs found
- ✅ Performance is acceptable
- ✅ Works on all target platforms
- ✅ Documentation is complete
- ✅ Icons are professional (if public release)
- ✅ Code signed (if public release)

---

**Pro Tip**: Test in the order listed above. Fix issues before moving to the next section.

**Testing Time**: Plan for ~30-60 minutes for complete testing.
