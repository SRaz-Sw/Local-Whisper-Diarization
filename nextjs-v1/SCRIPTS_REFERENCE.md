# Scripts Reference Guide

Quick reference for all package.json scripts and when to use them.

---

## 🔧 DEVELOPMENT SCRIPTS

### `bun dev`

**Purpose:** Start web development server for browser testing  
**When to use:** Testing the web version at `http://localhost:3000`  
**Opens:** Browser at localhost:3000  
**Auto-verifies config:** ✅ Yes

```bash
cd nextjs-v1
bun dev
```

---

### `bun run electron:start`

**Purpose:** Start Electron in development mode  
**When to use:** Testing desktop app with hot reload  
**Opens:** Electron window with dev server  
**Auto-verifies config:** ✅ Yes

```bash
cd nextjs-v1
bun run electron:start
```

**Note:** This is the recommended way to develop Electron features. It combines:

- Next.js dev server with hot reload
- Electron window for desktop testing
- Full debugging capabilities

---

## 🌐 WEB DEPLOYMENT (Vercel)

### `bun run build`

**Purpose:** Build the web app for Vercel deployment  
**When to use:** Deploying landing page + web tool to Vercel  
**Output:** `.next/` directory  
**Used by:** Vercel's build process (automatic)

```bash
cd nextjs-v1
bun run build
```

**Deploys:**

- `/` - Landing page with download links
- `/web-transc` - Web-based transcription tool

---

### `bun run start`

**Purpose:** Start production Next.js server  
**When to use:** Testing production build locally before deploying  
**Requires:** Must run `bun run build` first

```bash
cd nextjs-v1
bun run build
bun run start
# Opens on http://localhost:3000
```

**Note:** Rarely needed - Vercel handles this automatically.

---

## 📦 ELECTRON BUILDS (Desktop Apps)

### `bun run electron:build`

**Purpose:** Build desktop app for ALL platforms  
**When to use:** Creating release builds for distribution  
**Output:** `dist/` directory with all platform builds  
**Duration:** ~5-10 minutes

```bash
cd nextjs-v1
bun run electron:build
```

**Creates:**

- macOS (Apple Silicon) - `.dmg`, `.app`
- macOS (Intel) - `.dmg`, `.app`
- Windows - `.exe` installer
- Linux - `.AppImage`

**Auto-manages config:** ✅ Yes (swaps → builds → restores → verifies)

---

### `bun run electron:build:mac`

**Purpose:** Build ONLY for macOS (faster)  
**When to use:** Quick testing on Mac, or Mac-only releases  
**Output:** `dist/mac/` and `dist/mac-arm64/`  
**Duration:** ~2-3 minutes

```bash
cd nextjs-v1
bun run electron:build:mac
```

**Creates:**

- `Whisper Diarization.app` (Apple Silicon)
- `Whisper Diarization.app` (Intel)
- `.dmg` installers
- `.zip` archives

---

### `bun run electron:build:win`

**Purpose:** Build ONLY for Windows  
**When to use:** Creating Windows releases  
**Output:** `dist/` directory  
**Requirements:** Can build on any platform (cross-platform)

```bash
cd nextjs-v1
bun run electron:build:win
```

**Creates:**

- `Whisper Diarization Setup 0.1.0.exe` - Installer
- Unpacked directory for testing

---

### `bun run electron:build:linux`

**Purpose:** Build ONLY for Linux  
**When to use:** Creating Linux releases  
**Output:** `dist/` directory

```bash
cd nextjs-v1
bun run electron:build:linux
```

**Creates:**

- `.AppImage` - Universal Linux format
- `.deb` - Debian/Ubuntu package
- `.rpm` - RedHat/Fedora package (if configured)

---

## 🛠️ UTILITIES

### `bun run worker:build`

**Purpose:** Build the web worker separately  
**When to use:** Usually not needed directly (used internally by electron:build)  
**Output:** `public/workers/whisperDiarization.worker.js`

```bash
cd nextjs-v1
bun run worker:build
```

**Note:** Automatically run by all `electron:build*` commands.

---

### `bun run lint`

**Purpose:** Check code quality with ESLint  
**When to use:** Before committing, or to find code issues

```bash
cd nextjs-v1
bun run lint
```

**Checks:**

- Code style issues
- Potential bugs
- Best practices violations

---

### `bun run clean`

**Purpose:** Nuclear option - delete all node_modules and build artifacts  
**When to use:** When things are completely broken

```bash
cd nextjs-v1
bun run clean
# Then reinstall:
bun install
```

**Deletes:**

- `node_modules/`
- `.next/`
- `bun.lockb`
- Fixes permission issues

---

## 🎯 COMMON WORKFLOWS

### Daily Development (Web)

```bash
cd nextjs-v1
bun dev
# Edit code, see changes instantly in browser
```

### Daily Development (Electron)

```bash
cd nextjs-v1
bun run electron:start
# Edit code, see changes instantly in Electron window
```

### Before Deploying to Vercel

```bash
cd nextjs-v1
bun run build
bun run start  # Test locally
# If looks good, push to GitHub (Vercel auto-deploys)
```

### Creating a New Release

```bash
cd nextjs-v1

# Option A: Build all platforms at once
bun run electron:build

# Option B: Build platforms separately
bun run electron:build:mac
bun run electron:build:win
bun run electron:build:linux

# Upload to GitHub Releases
# Update download links in src/app/page.tsx
```

### When Things Break

```bash
cd nextjs-v1
bun run clean
bun install
bun dev  # Test if fixed
```

---

## 📊 Script Comparison

| Script                 | Duration  | Output                | Use Case            |
| ---------------------- | --------- | --------------------- | ------------------- |
| `dev`                  | Instant   | Dev server            | Browser development |
| `electron:start`       | ~5 sec    | Electron + dev server | Desktop development |
| `build`                | ~1 min    | `.next/`              | Vercel deployment   |
| `electron:build`       | ~5-10 min | All platforms         | Full release        |
| `electron:build:mac`   | ~2-3 min  | macOS only            | Quick Mac testing   |
| `electron:build:win`   | ~3-4 min  | Windows only          | Windows release     |
| `electron:build:linux` | ~3-4 min  | Linux only            | Linux release       |

---

## 🚫 REMOVED SCRIPTS

These scripts were removed because they were redundant:

### ~~`build-local`~~

**Why removed:** Same as `build` but without `--force` install. Unnecessary duplication.  
**Use instead:** `bun run build`

### ~~`electron:dev`~~

**Why removed:** Just ran Electron without starting dev server first.  
**Use instead:** `bun run electron:start` (better - includes dev server)

---

## 💡 PRO TIPS

### 1. **Parallel Development**

You can run both at the same time:

```bash
# Terminal 1: Web dev
bun dev

# Terminal 2: Electron dev
bun run electron:start
```

### 2. **Quick Build Testing**

Build just your platform for faster testing:

```bash
# On Mac:
bun run electron:build:mac

# Test the built app:
open "dist/mac-arm64/Whisper Diarization.app"
```

### 3. **Build Time Optimization**

If you only need Mac builds (for development):

```bash
# Edit electron-builder.json to only build for mac
bun run electron:build  # Now faster
```

### 4. **Vercel Auto-Deploy**

Vercel automatically runs `bun run build` on every push to main.  
No need to build manually for web deployment!

---

## 🔗 Related Documentation

- `COMPLETE_FIX_SUMMARY.md` - Overall project setup
- `AUTO_CONFIG_MANAGEMENT.md` - How config switching works
- `ELECTRON_VS_WEB_MODES.md` - Understanding dev modes

---

## 🆘 Troubleshooting

### "Config is in wrong mode"

```bash
# Auto-fixed by scripts, but if manual fix needed:
git checkout 47031a6 -- nextjs-v1/next.config.ts
```

### "Build failed"

```bash
bun run clean
bun install
# Try build again
```

### "Port 3000 already in use"

```bash
# Kill existing processes
pkill -f "next dev"
# Or use a different port
PORT=3001 bun dev
```

### "Electron shows white screen"

- Make sure you're using `electron:start`, not the old `electron:dev`
- Check that dev server is running (you'll see Next.js output)
- Verify config is in web mode: `node scripts/verify-web-config.js`

---

**Last Updated:** October 13, 2025  
**Scripts Version:** 2.0 (Cleaned & Organized)
