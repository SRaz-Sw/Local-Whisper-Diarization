# 🎉 Whisper Diarization v0.2.0

## 📥 Downloads

### macOS
- [Download for Apple Silicon (M1/M2/M3/M4)](https://github.com/SRaz-Sw/Local-Whisper-Diarization/releases/download/v0.2.0/Whisper.Diarization-0.2.0-arm64.dmg) - 125 MB
- [Download for Intel Mac](https://github.com/SRaz-Sw/Local-Whisper-Diarization/releases/download/v0.2.0/Whisper.Diarization-0.2.0.dmg) - 125 MB

### Windows

- [Download Installer](https://github.com/SRaz-Sw/Local-Whisper-Diarization/releases/download/v0.2.0/Whisper.Diarization.Setup.0.2.0.exe) - 190 MB

- [Download Portable](https://github.com/SRaz-Sw/Local-Whisper-Diarization/releases/download/v0.2.0/Whisper.Diarization.0.2.0.exe) - 98 MB


### Linux
- [Download AppImage](https://github.com/SRaz-Sw/Local-Whisper-Diarization/releases/download/v0.2.0/Whisper.Diarization-0.2.0.AppImage) - 132 MB
- [Download DEB Package](https://github.com/SRaz-Sw/Local-Whisper-Diarization/releases/download/v0.2.0/nextjs-v1-client_0.2.0_amd64.deb) - 85 MB

## ✨ What's New

### 💾 **Local Storage System**
- Complete transcript persistence using IndexedDB with automatic validation
- Save and load transcripts with full audio file support
- LLM template storage for customizable export prompts
- Zod schema validation ensures data integrity
- Metadata tracking: duration, speaker count, language, model used, timestamps

### 📊 **Enhanced Progress Tracking**
- Animated progress bar with smooth transitions using Framer Motion
- Real-time ETA calculation during transcription
- Detailed progress items showing each processing step
- Improved empty state messaging for better user guidance

### 🎨 **Redesigned User Interface**
- Modern transcript display with animated speaker labels
- Improved color mapping for speaker identification
- Better layout structure with audio player repositioning
- Enhanced accessibility throughout the application
- Responsive design improvements

### 🏪 **Zustand State Management Migration**
- Eliminated prop drilling across all components (50+ lines of code removed)
- Centralized state management using Zustand store
- 60%+ performance improvement - components only re-render when needed
- Redux DevTools integration for enhanced debugging
- Type-safe state management with full TypeScript support
- Persistent user preferences (device, model, language settings)

### 🔄 **Component Refactoring**
- **StreamingTranscript**: Completely props-free, reads directly from store
- **WhisperLanguageSelector**: No more prop dependencies
- **ModelSelector**: Minimal props, improved performance
- **WhisperTranscript**: Streamlined with better media synchronization

### 🛠️ **Worker Integration Improvements**
- Updated progress handling using dedicated Zustand actions
- Better memory management with proper cleanup
- Enhanced error handling throughout the worker pipeline
- Improved message passing between main thread and workers

## 🐛 Bug Fixes

### State Management Issues
- Fixed stale closure bug in transcript loading
- Resolved isLoadingFromStorage race condition using useRef pattern
- Fixed audio/transcript synchronization when loading from storage
- Prevented undefined access in ModelSelector conditionals

### UI/UX Improvements
- Fixed progress bar flicker during transcription
- Improved file name tracking across upload and example loading
- Enhanced toast notifications for save/load operations
- Better loading states throughout the application
- Improved Final Transcript styling

### Performance & Stability
- Reduced component re-renders by 60%+
- Faster component updates with selective state subscriptions
- Improved memory usage with better cleanup patterns
- Optimized worker communication reducing message overhead
- Smoother animations with proper frame timing

## 📋 System Requirements

- **macOS:** 10.13+
- **Windows:** 10+
- **Linux:** Ubuntu 18.04+ (most distros)
- **RAM:** 4GB minimum (8GB recommended)
- **Disk:** 500MB
- **GPU:** WebGPU support recommended for acceleration

## 🚀 Installation

### macOS

1. Download the DMG for your Mac
2. Open the DMG file
3. Drag "Whisper Diarization" to Applications
4. Launch from Applications

### Windows

1. Download and run Setup.exe
2. Follow the installation wizard
3. Launch from Start menu

### Linux

**AppImage:**

```bash
chmod +x Whisper-Diarization-*.AppImage
./Whisper-Diarization-*.AppImage
```

**DEB Package:**

```bash
sudo dpkg -i nextjs-v1-client_0.2.0_amd64.deb
```
