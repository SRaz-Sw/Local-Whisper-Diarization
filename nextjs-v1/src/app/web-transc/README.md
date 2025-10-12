# Web Transcription Feature

## Overview

Browser-based speech transcription with **speaker diarization** using Whisper and Pyannote models. Everything runs entirely client-side using Transformers.js.

**🖥️ NEW: Now Available as Desktop App!** This app can run as a standalone Electron desktop application. See [Electron Desktop App](#electron-desktop-app) section below.

## Features

- ✅ **Whisper-based transcription** - OpenAI's powerful speech recognition
- ✅ **Speaker diarization** - Automatic speaker identification and segmentation
- ✅ **Word-level timestamps** - Precise timing for each word
- ✅ **Interactive transcript** - Click words to jump to that time
- ✅ **Export to JSON** - Download complete transcript with metadata
- ✅ **Offline support** - Works completely offline after first load
- ✅ **WebGPU acceleration** - Fast processing when available
- ✅ **100+ languages** - Multilingual support
- ✅ **Modern UI** - Built with shadCN components, Tailwind CSS, and Framer Motion
- ✅ **Animated gradients** - Beautiful moving gradient backgrounds for a modern look
- ✅ **Dark/Light Mode** - Seamless theme switching with animated transitions
- ✅ **Fully Responsive** - Optimized for mobile, tablet, and desktop
- ✅ **Enhanced File Upload** - Beautiful drag-and-drop interface with media playback
- ✅ **Desktop App** - Available as installable Electron app (macOS, Windows, Linux)

## Quick Start

### Web Version

#### 1. Start the Development Server

```bash
cd speech-to-text/nextjs-v1
bun dev
```

#### 2. Open the Application

Navigate to: **http://localhost:3000/web-transc**

#### 3. First Time Setup

1. Click **"Load model"** button
2. Wait for models to download (~80-200MB total)
3. Models will be cached in IndexedDB for future use

#### 4. Transcribe Audio

1. Upload an audio or video file (drag & drop or click)
2. Select language (default: English)
3. Click **"Run model"**
4. Wait for transcription to complete
5. View results with speaker labels

## Electron Desktop App

This web app is now available as a standalone **Electron desktop application**!

### Quick Start (Desktop)

```bash
# Development mode
cd ../../..  # Navigate to nextjs-v1 root
bun run electron:start

# Build desktop app
bun run electron:build
```

### Desktop App Features

- 🖥️ **Native Desktop App** - Installable on macOS, Windows, and Linux
- 📦 **Standalone** - No browser required
- 🔒 **Enhanced Security** - Sandboxed and code-signed (optional)
- ⚡ **Better Performance** - Optimized for desktop
- 💾 **Offline First** - Complete privacy, all processing local

### Documentation

For complete Electron documentation, see the root project directory:

- **../../ELECTRON_QUICK_START.md** - Quick 3-step guide
- **../../ELECTRON_README.md** - Full documentation
- **../../ELECTRON_TESTING_CHECKLIST.md** - Testing guide
- **../../DISTRIBUTION_GUIDE.md** - How to distribute to users

### Build Commands

```bash
# Current platform
bun run electron:build

# Platform-specific
bun run electron:build:mac     # macOS (DMG/ZIP)
bun run electron:build:win     # Windows (EXE)
bun run electron:build:linux   # Linux (AppImage/DEB)
```

Output will be in `dist/` folder at project root.

## File Structure

```
src/app/web-transc/
├── page.tsx                          # Main page with ErrorBoundary
├── types/
│   └── index.ts                      # TypeScript type definitions
├── components/
│   ├── WhisperDiarization.tsx        # Main component with animated backgrounds
│   ├── IntroSection.tsx              # Modern intro section with gradient animations
│   ├── MediaFileUpload.tsx           # Enhanced file upload with media playback
│   ├── ThemeToggle.tsx               # Dark/Light mode toggle button
│   ├── WhisperMediaInput.tsx         # (Legacy) File upload & media player
│   ├── WhisperTranscript.tsx         # Transcript display with speakers
│   ├── WhisperProgress.tsx           # Loading progress
│   ├── WhisperLanguageSelector.tsx   # Language dropdown
│   ├── ErrorBoundary.tsx             # Error handling
│   └── StreamingTranscript.tsx       # Streaming transcript display
├── hooks/
│   ├── useWebGPU.ts                  # WebGPU detection hook
│   └── useTranscriptionWorker.ts     # Worker management hook
├── workers/
│   └── whisperDiarization.worker.js  # Web Worker for ML processing
└── api/                              # (reserved for future API routes)
```

## Technical Details

### Models Used

1. **Whisper Base** (77-196MB depending on device)
   - Source: `onnx-community/whisper-base_timestamped`
   - Purpose: Speech recognition with word-level timestamps
   - Languages: 100+ supported

2. **Pyannote Segmentation 3.0** (~6MB)
   - Source: `onnx-community/pyannote-segmentation-3.0`
   - Purpose: Speaker diarization and segmentation

### Technology Stack

- **Framework**: Next.js 15 + React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadCN UI
- **Animations**: Framer Motion v12
- **ML Library**: @huggingface/transformers v3.7.5
- **Runtime**: WebGPU / WebAssembly (ONNX)
- **Desktop**: Electron (optional)

### Architecture

```
┌─────────────────┐
│   User Input    │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ WhisperDiarization  │ (Main Component)
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   Web Worker        │ (Offloads ML processing)
│ whisperDiarization  │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Transformers.js    │ (Runs models in browser)
│  + ONNX Runtime     │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ WebGPU / WASM       │ (Hardware acceleration)
└─────────────────────┘
```

## Resources

- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js)
- [Whisper Model](https://huggingface.co/onnx-community/whisper-base_timestamped)
- [Pyannote Model](https://huggingface.co/onnx-community/pyannote-segmentation-3.0)
- [shadCN UI](https://ui.shadcn.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Electron Documentation](https://www.electronjs.org/docs)

## License

Same as parent project.

---

**Status**: Production Ready  
**Last Updated**: 2025-10-10  
**Version**: 3.1 (TypeScript + shadCN + Electron)
