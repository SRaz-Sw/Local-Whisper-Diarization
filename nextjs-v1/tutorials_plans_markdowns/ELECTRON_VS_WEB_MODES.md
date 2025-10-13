# Electron vs Web Development Modes

## 🚨 Important: Don't Mix Build Commands!

You encountered a **white screen** because you mixed production build with development mode.

## The Two Configurations

Your project has **TWO separate Next.js configs**:

1. **`next.config.ts`** - For web development (currently active ✅)
2. **`next.config.electron.ts`** - For Electron production builds only

## How to Run Each Mode

### 🌐 Web Development (Browser)

```bash
cd nextjs-v1
bun dev
# or
npm run dev
```

Then open: `http://localhost:3000/web-transc`

**Uses:** `next.config.ts` (web config)

---

### ⚡ Electron Development

```bash
cd nextjs-v1
bun run electron:start
# or
npm run electron:start
```

**What it does:**
1. Starts Next.js dev server with web config
2. Waits for `http://localhost:3000/web-transc`
3. Opens Electron that loads from the dev server

**Uses:** 
- Next.js: `next.config.ts` (web config)
- Electron: Loads from `http://localhost:3000/web-transc`

**⚠️ Don't run `electron:build` before this!**

The security warnings you see are normal in dev mode:
```
Electron Security Warning (Disabled webSecurity)
Electron Security Warning (allowRunningInsecureContent)
Electron Security Warning (experimentalFeatures)
```
These are **expected** and won't appear in production builds.

---

### 📦 Electron Production Build (Distribution)

```bash
cd nextjs-v1
bun run electron:build
# or for specific platform:
bun run electron:build:mac
bun run electron:build:win
```

**What it does:**
1. Builds web worker with webpack
2. **Temporarily swaps** to `next.config.electron.ts`
3. Builds Next.js as static export → `out/`
4. **Restores** `next.config.ts` 
5. Packages with electron-builder → `dist/`

**Output:** `dist/Whisper Diarization.app` (or `.exe` on Windows)

**Uses:**
- Build time: `next.config.electron.ts` (temporarily)
- Runtime: Loads from `out/` directory via custom protocol

**To test the built app:**
```bash
open "dist/mac-arm64/Whisper Diarization.app"
# or on Intel Mac:
open "dist/mac/Whisper Diarization.app"
```

---

## Your White Screen Issue

You ran:
```bash
bun run electron:build  # ← Created production build
bun run electron:start  # ← Tried to run dev mode
```

**Problem:** `electron:start` expects:
1. Next.js dev server running
2. Web config active
3. Route accessible at `http://localhost:3000/web-transc`

But after `electron:build`, the system was in a mixed state.

**Solution:** Pick ONE mode:

### Option A: Development Mode (Recommended for Testing)
```bash
# Kill any running processes first
pkill -f "next dev" || true
pkill -f "electron" || true

# Start fresh in dev mode
cd nextjs-v1
bun run electron:start
```

### Option B: Test Production Build
```bash
# The build already completed, just open the app:
cd nextjs-v1
open "dist/mac-arm64/Whisper Diarization.app"
```

---

## Quick Reference

| What You Want | Command | Config Used | Where It Loads |
|---------------|---------|-------------|----------------|
| Web dev | `bun dev` | `next.config.ts` | Browser: `localhost:3000` |
| Electron dev | `bun run electron:start` | `next.config.ts` | Electron → dev server |
| Build for distribution | `bun run electron:build` | `next.config.electron.ts` (temp) | Packaged app → `out/` |
| Test built app | `open dist/*.app` | N/A | Already built |

---

## Troubleshooting

### White Screen in Electron Dev Mode

1. **Check if dev server is running:**
   ```bash
   curl http://localhost:3000/web-transc
   # Should return HTML
   ```

2. **Check Electron console:**
   - Open DevTools (they auto-open in dev mode)
   - Look for actual errors (not security warnings)
   - Check Network tab for failed requests

3. **Restart clean:**
   ```bash
   pkill -f "next dev" || true
   pkill -f "electron" || true
   cd nextjs-v1
   bun run electron:start
   ```

### Production Build Issues

1. **Verify the build completed:**
   ```bash
   ls -la nextjs-v1/out/web-transc/
   # Should contain index.html and assets
   ```

2. **Check the packaged app:**
   ```bash
   ls -la nextjs-v1/dist/
   # Should contain .app file
   ```

3. **Open with console:**
   The production build opens with DevTools enabled (line 97 in main.js).
   Check for actual errors there.

### Config Got Swapped Again?

```bash
# Check current config
grep "output:" nextjs-v1/next.config.ts

# If it shows 'output: "export"', restore web config:
git checkout 47031a6 -- nextjs-v1/next.config.ts
```

---

## Best Practices

1. **During development:** Only use `electron:start` or `dev`
2. **Before distribution:** Run `electron:build` once
3. **After building:** Verify config was restored
4. **Never manually swap configs** - let the build script handle it

---

## The Build Script Protection

The `scripts/build-electron.js` should:
- ✅ Backup web config
- ✅ Swap to electron config  
- ✅ Build Next.js
- ✅ Restore web config
- ❌ Currently doesn't verify restoration

Consider adding verification (see `WEB_APP_CONFIG_FIX.md` for details).

