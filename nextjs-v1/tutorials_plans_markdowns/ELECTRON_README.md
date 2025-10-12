# Whisper Diarization - Electron Desktop App

A desktop application for speech transcription with speaker diarization, built with Next.js and Electron. This app runs completely offline after the first model download, ensuring privacy and security.

## Features

- 🖥️ **Native Desktop App** - Installable on macOS, Windows, and Linux
- 🔒 **100% Offline** - All processing happens locally after initial setup
- 🎙️ **Whisper Transcription** - State-of-the-art speech recognition
- 👥 **Speaker Diarization** - Automatic speaker identification
- ⚡ **WebGPU Acceleration** - Fast processing with hardware acceleration
- 🌍 **100+ Languages** - Multilingual support
- 🎯 **Word-level Timestamps** - Precise timing for each word
- 💾 **No Cloud Required** - Complete privacy, no data leaves your device

## System Requirements

### Minimum

- **OS**: macOS 10.13+, Windows 10+, or Ubuntu 18.04+
- **RAM**: 4GB (8GB recommended)
- **Disk**: 500MB for app + 200MB for models
- **CPU**: x64 processor

### Recommended

- **RAM**: 8GB or more
- **GPU**: Any GPU with WebGPU support (Chrome 94+ on modern GPUs)
- **Disk**: SSD for faster model loading

## Quick Start

### Development Mode

1. **Start Next.js dev server and Electron together**:

```bash
cd speech-to-text/nextjs-v1
bun run electron:start
```

This will:

- Start Next.js on `http://localhost:3000`
- Wait for the server to be ready
- Launch Electron in development mode
- Enable hot reload for both Next.js and Electron

2. **Or start them separately**:

```bash
# Terminal 1: Start Next.js
bun dev

# Terminal 2: Start Electron
bun run electron:dev
```

### First Launch

1. The app will open to the web-transc page
2. Click **"Load model"** to download ML models (~80-200MB)
3. Models are cached locally in your user data directory
4. Once loaded, the app works completely offline

## Building the Desktop App

### Build for Current Platform

```bash
bun run electron:build
```

This will create an installer in the `dist/` folder for your current platform.

### Platform-Specific Builds

**macOS** (DMG and ZIP):

```bash
bun run electron:build:mac
```

Output: `dist/Whisper Diarization-0.1.0-arm64.dmg` and `.zip`

**Windows** (NSIS installer and Portable):

```bash
bun run electron:build:win
```

Output: `dist/Whisper Diarization Setup 0.1.0.exe`

**Linux** (AppImage and DEB):

```bash
bun run electron:build:linux
```

Output: `dist/Whisper Diarization-0.1.0.AppImage` and `.deb`

### Cross-Platform Building

To build for other platforms from macOS:

```bash
# Build for all platforms
electron-builder -mwl

# Build for specific platforms
electron-builder --mac --win --linux
```

Note: Cross-platform building may require additional dependencies.

## Project Structure

```
speech-to-text/nextjs-v1/
├── electron/
│   ├── main.js                    # Electron main process
│   ├── preload.js                 # Preload script (security)
│   ├── entitlements.mac.plist     # macOS permissions
│   └── resources/                 # App icons
│       ├── icon.icns              # macOS icon
│       ├── icon.ico               # Windows icon
│       └── icon.png               # Linux icon
├── electron-builder.json          # Build configuration
├── next.config.electron.ts        # Next.js config for Electron
├── next.config.ts                 # Next.js config for web
├── src/app/(web-transc)/          # Main app code
│   ├── components/                # React components
│   ├── hooks/                     # Custom hooks
│   ├── workers/                   # Web Workers
│   └── types/                     # TypeScript types
└── public/
    └── workers/                   # Worker files
```

## Configuration

### Electron Builder (electron-builder.json)

Key configurations:

- **App ID**: `com.whisper.diarization`
- **Product Name**: Whisper Diarization
- **Output Directory**: `dist/`
- **Build Resources**: `electron/resources/`

### Next.js Configuration

Two configurations:

1. **next.config.ts** - For web development
2. **next.config.electron.ts** - For Electron builds (static export)

### Application Icons

Place your custom icons in `electron/resources/`:

- `icon.icns` for macOS
- `icon.ico` for Windows
- `icon.png` for Linux (512x512)

See `electron/resources/README.md` for icon creation instructions.

## Scripts Reference

| Script                         | Description                                           |
| ------------------------------ | ----------------------------------------------------- |
| `bun dev`                      | Start Next.js dev server only                         |
| `bun run electron:dev`         | Start Electron in dev mode (requires Next.js running) |
| `bun run electron:start`       | Start both Next.js and Electron together              |
| `bun run electron:build`       | Build for current platform                            |
| `bun run electron:build:mac`   | Build for macOS                                       |
| `bun run electron:build:win`   | Build for Windows                                     |
| `bun run electron:build:linux` | Build for Linux                                       |

## How It Works

### Architecture

```
┌─────────────────────────┐
│   Electron Main         │
│   (Node.js Process)     │  ← Manages app lifecycle
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   Electron Renderer     │
│   (Browser Window)      │  ← Loads Next.js app
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   Next.js App           │
│   (Static HTML/JS)      │  ← React UI
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   Web Worker            │
│   (ML Processing)       │  ← Runs Whisper + Pyannote
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   Transformers.js       │
│   (ONNX Runtime)        │  ← ML inference
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   WebGPU / WASM         │  ← Hardware acceleration
└─────────────────────────┘
```

### Build Process

1. **Next.js Build**: Creates static export in `out/`
2. **Electron Packaging**: Bundles static files with Electron
3. **Native Installer**: Creates platform-specific installer

### Data Storage

- **Models**: Cached in IndexedDB (browser storage)
- **User Data**: `~/.config/whisper-diarization/` (Linux/macOS) or `%APPDATA%/whisper-diarization/` (Windows)
- **Logs**: Electron logs in user data directory

## Troubleshooting

### Build Issues

**Error: Cannot find module 'electron'**

```bash
bun install
```

**Error: next.config.electron.ts not found**

Make sure you're using the electron build scripts:

```bash
bun run electron:build
```

**Error: electron-builder failed**

Check if you have the required dependencies:

```bash
# macOS: Xcode Command Line Tools
xcode-select --install

# Windows: Windows Build Tools
npm install --global windows-build-tools

# Linux: Build essentials
sudo apt-get install build-essential
```

### Runtime Issues

**App won't start**

1. Check Electron version compatibility
2. Try deleting `node_modules` and reinstalling:

```bash
bun clean
bun install
```

**Models won't download**

1. Check internet connection (first time only)
2. Clear app data and try again:
   - macOS: `~/Library/Application Support/whisper-diarization/`
   - Windows: `%APPDATA%/whisper-diarization/`
   - Linux: `~/.config/whisper-diarization/`

**WebGPU not working**

1. Make sure you're using Chrome/Edge Electron (default)
2. Update graphics drivers
3. Check if WebGPU is enabled in DevTools

**Worker errors**

1. Check that `public/workers/` contains the worker file
2. Verify CSP headers allow workers
3. Check console for specific errors

### Performance Issues

**Slow transcription**

- Use WebGPU (faster than WebAssembly)
- Close other apps to free up RAM
- Use shorter audio files (< 5 minutes)
- Consider using a smaller Whisper model

**High memory usage**

- This is normal for ML models
- Models use 2-4GB RAM when loaded
- Close app when not in use to free memory

## Development

### Hot Reload

In development mode, both Next.js and Electron support hot reload:

- **Next.js**: Changes to React components reload automatically
- **Electron**: Changes to `electron/main.js` require restart

To restart Electron:

1. Stop the process (Ctrl+C)
2. Run `bun run electron:start` again

### Debugging

**Chrome DevTools**

The app automatically opens DevTools in development mode. You can:

- Inspect React components
- Debug JavaScript
- Monitor network requests
- Check console logs

**Main Process Debugging**

Add `console.log()` in `electron/main.js` and check your terminal.

### Testing

**Test in Dev Mode**

```bash
bun run electron:start
```

**Test Production Build**

```bash
bun run electron:build
# Then install and run the app from dist/
```

## Customization

### Change App Name

1. Update `electron-builder.json`:

```json
{
  "productName": "Your App Name",
  "appId": "com.yourcompany.yourapp"
}
```

2. Update `package.json`:

```json
{
  "name": "your-app-name",
  "version": "1.0.0"
}
```

### Change Window Size

Edit `electron/main.js`:

```javascript
mainWindow = new BrowserWindow({
  width: 1600, // Change this
  height: 1000, // Change this
  // ...
});
```

### Add Menu Bar

Edit `electron/main.js` and add:

```javascript
const { Menu } = require("electron");

const template = [
  {
    label: "File",
    submenu: [{ role: "quit" }],
  },
  // Add more menu items
];

Menu.setApplicationMenu(Menu.buildFromTemplate(template));
```

### Change Models

Edit `src/app/(web-transc)/workers/whisperDiarization.worker.js`:

```javascript
// Use different Whisper model size
const whisperModel = "onnx-community/whisper-small_timestamped"; // tiny, base, small, medium, large
```

## Distribution

### Code Signing

For production apps, you should sign your code:

**macOS**:

```bash
# Get Apple Developer ID
# Add to electron-builder.json:
{
  "mac": {
    "identity": "Developer ID Application: Your Name (TEAM_ID)"
  }
}
```

**Windows**:

```bash
# Get code signing certificate
# Add to electron-builder.json:
{
  "win": {
    "certificateFile": "path/to/cert.pfx",
    "certificatePassword": "password"
  }
}
```

### Auto Updates

To add auto-update capability:

1. Install electron-updater:

```bash
bun add electron-updater
```

2. Configure update server in `electron-builder.json`
3. Implement update logic in `electron/main.js`

See [electron-updater docs](https://www.electron.build/auto-update) for details.

## Security

### Content Security Policy

The app uses strict CSP headers defined in `next.config.electron.ts`:

- Scripts: Only from same origin + CDN for models
- Workers: Only from same origin and blob URLs
- Connect: Only to HuggingFace CDN for models

### Sandboxing

The renderer process runs with:

- `contextIsolation: true` - Isolates preload scripts
- `nodeIntegration: false` - No Node.js in renderer
- `sandbox: false` - Required for Web Workers (but still secure)

### Permissions

macOS permissions in `electron/entitlements.mac.plist`:

- Audio input (for recording)
- Camera (for future features)
- File access (user-selected files only)
- Network (for model downloads)

## Resources

### Documentation

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder Guide](https://www.electron.build/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Transformers.js](https://huggingface.co/docs/transformers.js)

### Related Projects

- [Whisper Web](https://github.com/xenova/whisper-web) - Original web implementation
- [Pyannote](https://github.com/pyannote/pyannote-audio) - Speaker diarization

### Community

- [Electron Discord](https://discord.com/invite/electron)
- [Next.js Discord](https://nextjs.org/discord)

## License

Same as parent project.

---

## Changelog

### v0.1.0 (2025-10-10)

- ✨ Initial Electron implementation
- ✅ Full offline support
- ✅ WebGPU acceleration
- ✅ Multi-platform builds (macOS, Windows, Linux)
- ✅ Development mode with hot reload
- ✅ Production builds with electron-builder

---

**Built with ❤️ using Next.js, Electron, and Transformers.js**
