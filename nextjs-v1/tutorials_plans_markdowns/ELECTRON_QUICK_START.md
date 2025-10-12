# 🚀 Quick Start - Electron Desktop App

Get the Whisper Diarization desktop app running in 3 simple steps!

## Development Mode

### Option 1: All-in-One Command (Recommended)

```bash
cd speech-to-text/nextjs-v1
bun run electron:start
```

This single command will:

- ✅ Start Next.js dev server
- ✅ Wait for it to be ready
- ✅ Launch Electron window automatically
- ✅ Enable hot reload for both

### Option 2: Manual Steps

```bash
# Terminal 1: Start Next.js
bun dev

# Terminal 2: Start Electron (after Next.js is ready)
bun run electron:dev
```

## First Time Setup

1. **Install Dependencies** (if not already done):

```bash
bun install
```

2. **Start the App**:

```bash
bun run electron:start
```

3. **Load ML Models** (first launch only):
   - Click "Load model" button in the app
   - Wait for ~80-200MB download
   - Models are cached for offline use

4. **Start Transcribing**:
   - Upload audio/video file
   - Select language
   - Click "Run model"
   - View results with speaker labels!

## Building Desktop App

### Quick Build (Current Platform)

```bash
bun run electron:build
```

Output will be in `dist/` folder:

- **macOS**: `.dmg` and `.zip` files
- **Windows**: `.exe` installer
- **Linux**: `.AppImage` and `.deb` packages

### Platform-Specific Builds

```bash
# macOS only
bun run electron:build:mac

# Windows only
bun run electron:build:win

# Linux only
bun run electron:build:linux
```

## Testing Your Build

After building:

1. Navigate to `dist/` folder
2. Install/run the app:
   - **macOS**: Open the `.dmg` and drag to Applications
   - **Windows**: Run the `.exe` installer
   - **Linux**: Make AppImage executable and run it

## Troubleshooting

### "Cannot find module 'electron'"

```bash
bun install
```

### "Port 3000 is already in use"

```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or change the port in package.json
```

### Models won't download

- Check your internet connection (first time only)
- Try clearing browser cache in DevTools
- Restart the app

### App won't start after build

- Make sure you built with `electron:build` not `build`
- Check that `out/` folder was created
- Look for errors in console

## What's Next?

- Read [ELECTRON_README.md](./ELECTRON_README.md) for full documentation
- Customize app icons in `electron/resources/`
- Add code signing for production distribution
- Set up auto-updates (see full docs)

## Need Help?

Check the full [ELECTRON_README.md](./ELECTRON_README.md) for:

- Detailed architecture
- Configuration options
- Security settings
- Distribution guide
- And much more!

---

**Happy Transcribing! 🎙️✨**
