# 🔄 Development Workflow - Next.js to Electron

Complete guide for developing your app in Next.js (browser) and building for Electron.

## 📋 Quick Development Cycle

### Phase 1: Develop in Browser (Recommended)

**Why Start Here:**

- ⚡ Fastest hot reload
- 🔍 Best DevTools experience
- 🐛 Easier debugging
- 🚀 Quickest iteration

**Steps:**

```bash
# 1. Start Next.js dev server
cd speech-to-text/nextjs-v1
bun dev

# 2. Open in browser
# Navigate to: http://localhost:3000/web-transc

# 3. Develop your features
# - Make changes to components
# - Test in browser
# - Hot reload works instantly ✅

# 4. Test your changes
# - Upload audio files
# - Test transcription
# - Verify UI/UX
```

### Phase 2: Test in Electron (Periodically)

**When to Test:**

- After major feature completion
- Before committing code
- When testing desktop-specific features
- Before building for distribution

**Steps:**

```bash
# 1. Stop browser dev server (Ctrl+C)

# 2. Start Electron dev mode
bun run electron:start

# 3. Test in Electron window
# - Verify features work in Electron
# - Check for WASM/security issues
# - Test offline mode

# 4. If issues found, fix and restart
# Press Ctrl+C and go back to Phase 1
```

### Phase 3: Build for Distribution

**When to Build:**

- Ready to share with users
- Making a release
- Testing production builds

**Steps:**

```bash
# 1. Build for your platform
bun run electron:build

# 2. Find built app in dist/ folder
ls -la dist/

# 3. Test the built app
# Install and run the actual installer

# 4. If all works, distribute!
# Upload to GitHub Releases or your hosting
```

---

## 🎯 Recommended Workflow

### Daily Development (90% of time)

```
┌─────────────────────────────────────┐
│  1. bun dev                         │
│  2. Open browser                    │
│  3. Make changes                    │
│  4. Hot reload instantly ✅         │
│  5. Test in browser                 │
│  6. Repeat 3-5                      │
└─────────────────────────────────────┘
```

### Testing Phase (Before commits)

```
┌─────────────────────────────────────┐
│  1. bun run electron:start          │
│  2. Test all features               │
│  3. Verify desktop works ✅         │
│  4. Fix any issues                  │
│  5. Commit code                     │
└─────────────────────────────────────┘
```

### Release Phase (When ready)

```
┌─────────────────────────────────────┐
│  1. bun run electron:build          │
│  2. Test built app                  │
│  3. Upload to GitHub Releases ✅    │
│  4. Share download links            │
└─────────────────────────────────────┘
```

---

## 📊 Comparison: Browser vs Electron Dev

| Feature          | Browser Dev     | Electron Dev                |
| ---------------- | --------------- | --------------------------- |
| **Speed**        | ⚡⚡⚡ Instant  | ⚡⚡ Fast                   |
| **Hot Reload**   | ✅ Yes          | ✅ Yes (slower)             |
| **DevTools**     | ✅ Full Chrome  | ✅ Full Chrome              |
| **Startup Time** | ~1 second       | ~3-5 seconds                |
| **Memory**       | Normal          | Higher (Electron + Next.js) |
| **Best For**     | UI/UX, features | Desktop testing, final QA   |

**Recommendation:** Use browser dev 90% of the time, Electron dev 10%.

---

## 🔧 Advanced Considerations

### 1. Avoiding Next.js API Routes

**Problem:** Next.js API routes (`/api/*`) won't work in static Electron builds.

**Solution:** Use client-side only logic for the web-transc app.

**Check your code:**

```bash
# Search for API routes in web-transc
grep -r "fetch.*\/api\/" src/app/web-transc/

# Search for getServerSideProps (not compatible)
grep -r "getServerSideProps" src/app/web-transc/

# Search for server actions (not compatible)
grep -r "'use server'" src/app/web-transc/
```

**Good (Client-side only):**

```typescript
// ✅ Direct browser APIs
const audioContext = new AudioContext();

// ✅ Web Workers
const worker = new Worker("/workers/whisper.worker.js");

// ✅ External APIs with fetch
const response = await fetch("https://huggingface.co/...");

// ✅ IndexedDB for storage
const db = await openDB("whisper-cache");
```

**Bad (Server-side):**

```typescript
// ❌ Next.js API routes
const response = await fetch("/api/transcribe");

// ❌ Server actions
("use server");
async function transcribe() {}

// ❌ getServerSideProps
export async function getServerSideProps() {}

// ❌ Node.js APIs in components
import fs from "fs"; // Won't work in browser/Electron renderer
```

### 2. Environment Detection

**Detect if running in Electron:**

```typescript
// In your components
const isElectron =
  typeof window !== "undefined" && window.electron !== undefined;

// Use conditionally
if (isElectron) {
  // Electron-specific code
  const version = await window.electron.getVersion();
} else {
  // Browser-specific code
  console.log("Running in browser");
}
```

**In your type definitions:**

```typescript
// src/types/electron.d.ts
interface Window {
  electron?: {
    getVersion: () => Promise<string>;
    getAppPath: () => Promise<string>;
    platform: string;
    isElectron: boolean;
  };
}
```

### 3. File Paths and Public Assets

**Problem:** File paths differ between dev and production.

**Solution:** Use relative paths from `/public`.

**Good:**

```typescript
// ✅ Relative to public/
const worker = new Worker('/workers/whisper.worker.js');

// ✅ Next.js Image component (with unoptimized in Electron config)
<Image src="/logo.svg" alt="Logo" />

// ✅ Public assets
<audio src="/samples/test.mp3" />
```

**Bad:**

```typescript
// ❌ Absolute paths
const worker = new Worker("/Users/name/project/workers/whisper.worker.js");

// ❌ Direct file system access
const file = fs.readFileSync("./worker.js");

// ❌ Process.cwd() in components
const path = process.cwd() + "/workers/";
```

### 4. Testing Both Environments

**Create a test checklist:**

```markdown
## Pre-Commit Checklist

### Browser (bun dev)

- [ ] App loads at http://localhost:3000/web-transc
- [ ] Hot reload works
- [ ] Models download
- [ ] Transcription works
- [ ] No console errors

### Electron (bun run electron:start)

- [ ] App launches
- [ ] Models download
- [ ] Transcription works
- [ ] Offline mode works (disconnect internet)
- [ ] No WASM errors

### Production Build (bun run electron:build)

- [ ] Build succeeds
- [ ] Built app installs
- [ ] Built app runs
- [ ] All features work
- [ ] Models cache properly
```

### 5. Shared Configuration

**Keep configs in sync:**

**Both browser and Electron need:**

- Same worker files in `public/workers/`
- Same CSP policies (adjusted per environment)
- Same model configurations
- Same component code

**Electron-specific:**

- `next.config.electron.ts` - Static export settings
- `electron/main.js` - Desktop window settings
- `electron-builder.json` - Build configuration

**Browser-specific:**

- `next.config.ts` - Standard Next.js settings
- Can use API routes (if needed for other parts of app)

### 6. Debugging Electron Issues

**Common issues and solutions:**

**Issue: Works in browser, fails in Electron**

```bash
# 1. Check Electron console logs
bun run electron:start
# Look at terminal output

# 2. Check renderer console
# DevTools opens automatically in dev mode
# Look for errors in Console tab

# 3. Check security policies
# Look for CSP errors
# Look for CORS errors
```

**Issue: WASM won't load**

```bash
# Check electron/main.js settings:
# - webSecurity: false
# - CSP allows 'unsafe-eval'
# - WASM switches enabled
```

**Issue: Worker fails**

```bash
# 1. Verify worker file exists
ls -la public/workers/whisperDiarization.worker.js

# 2. Check worker path in code
grep -r "new Worker" src/app/web-transc/

# 3. Ensure path is /workers/... (relative to public)
```

### 7. Hot Reload in Electron

**How it works:**

```
Next.js Dev Server (localhost:3000)
         ↓
    Hot Reload
         ↓
Electron loads from localhost:3000
         ↓
Changes reflect automatically ✅
```

**To restart Electron only:**

```bash
# In terminal running electron:start
# Press Ctrl+C
# Then restart
bun run electron:start
```

**To restart both:**

```bash
# Press Ctrl+C twice (stops both processes)
# Then restart
bun run electron:start
```

### 8. Building for Multiple Platforms

**From macOS, you can build:**

- ✅ macOS (Intel + Apple Silicon)
- ✅ Windows (with Wine installed)
- ✅ Linux

**Setup for cross-platform:**

```bash
# Install Wine for Windows builds (on macOS)
brew install --cask wine-stable

# Then build all platforms
bun run electron:build:mac
bun run electron:build:win
bun run electron:build:linux
```

**Or build all at once:**

```bash
# In package.json, add:
"electron:build:all": "cross-env NEXT_CONFIG_FILE=next.config.electron.ts next build && electron-builder -mwl"

# Then run:
bun run electron:build:all
```

### 9. Version Management

**Keep versions in sync:**

```json
// package.json
{
  "version": "0.1.0",
  "name": "whisper-diarization"
}
```

```json
// electron-builder.json
{
  // Version auto-syncs from package.json
  "productName": "Whisper Diarization"
}
```

**Update version workflow:**

```bash
# 1. Update version
npm version patch  # 0.1.0 -> 0.1.1
# or
npm version minor  # 0.1.0 -> 0.2.0

# 2. Build
bun run electron:build

# 3. Tag and commit
git add .
git commit -m "Release v0.1.1"
git tag v0.1.1
git push && git push --tags
```

### 10. Deployment Checklist

**Before releasing:**

```markdown
## Release Checklist

### Code Quality

- [ ] All tests pass
- [ ] No console errors in browser
- [ ] No console errors in Electron
- [ ] Code is formatted (Prettier)
- [ ] TypeScript types are correct

### Functionality

- [ ] Models download successfully
- [ ] Transcription works
- [ ] Speaker diarization works
- [ ] Export to JSON works
- [ ] Offline mode works
- [ ] All languages tested (at least 3-4)

### Electron Specific

- [ ] App icon displays correctly
- [ ] Window title is correct
- [ ] Menu bar works (if implemented)
- [ ] Installer works
- [ ] Uninstaller works
- [ ] Updates work (if implemented)

### Build Artifacts

- [ ] Built for all target platforms
- [ ] DMG works (macOS)
- [ ] EXE installer works (Windows)
- [ ] AppImage works (Linux)
- [ ] File sizes are reasonable (~200MB)

### Documentation

- [ ] README updated
- [ ] CHANGELOG updated
- [ ] Version number incremented
- [ ] Release notes written

### Distribution

- [ ] Uploaded to GitHub Releases
- [ ] Download links tested
- [ ] Auto-update configured (if applicable)
- [ ] Announced to users
```

---

## 🎓 Best Practices

### Do's ✅

1. **Develop in browser first** - Fastest iteration
2. **Test in Electron before committing** - Catch issues early
3. **Use client-side code only** - No API routes in web-transc
4. **Keep files in public/** - Consistent paths
5. **Test offline mode** - Ensure caching works
6. **Use TypeScript** - Catch errors early
7. **Test built apps** - Not just dev mode
8. **Update docs** - Keep guides current

### Don'ts ❌

1. **Don't use Next.js API routes** - Won't work in static export
2. **Don't use server components** - Client-side only
3. **Don't use absolute paths** - Use relative paths
4. **Don't skip Electron testing** - Browser ≠ Electron
5. **Don't build without testing** - Test dev mode first
6. **Don't use Node.js APIs in components** - Won't work in browser
7. **Don't hardcode paths** - Use /public relative paths
8. **Don't ignore console errors** - Fix them early

---

## 🚀 Quick Commands Reference

### Development

```bash
# Browser development (fastest)
bun dev

# Electron development (with browser hot reload)
bun run electron:start

# Electron only (requires Next.js already running)
bun run electron:dev

# Clean start
bun run clean
bun install
bun dev
```

### Building

```bash
# Build for current platform
bun run electron:build

# Build for specific platforms
bun run electron:build:mac
bun run electron:build:win
bun run electron:build:linux

# Just Next.js build (no Electron)
bun run build-local
```

### Testing

```bash
# Run in browser
bun dev
open http://localhost:3000/web-transc

# Run in Electron
bun run electron:start

# Test offline
bun run electron:start
# Then disconnect internet
```

---

## 📁 Project Structure Reminder

```
speech-to-text/nextjs-v1/
├── src/app/web-transc/          # Your app (browser + Electron)
│   ├── components/              # React components
│   ├── hooks/                   # Custom hooks
│   ├── workers/                 # Worker source
│   ├── types/                   # TypeScript types
│   └── page.tsx                 # Entry point
├── public/
│   └── workers/                 # Worker files (accessible to both)
├── electron/
│   ├── main.js                  # Electron main process
│   └── preload.js               # Electron preload
├── next.config.ts               # Browser config
├── next.config.electron.ts      # Electron config
├── electron-builder.json        # Build config
└── package.json                 # Scripts
```

---

## ⚡ Speed Tips

### Faster Development

1. **Use browser dev most of the time** - 10x faster than Electron
2. **Only test Electron periodically** - Not every change
3. **Use hot reload** - Don't restart unnecessarily
4. **Clear cache only when needed** - Not every restart
5. **Use faster builds** - Skip platforms you don't need

### Faster Builds

```bash
# Build only what you need
bun run electron:build:mac  # Only macOS (fast)

# vs

bun run electron:build  # All platforms (slow)
```

---

## 🎯 Summary

### Development Flow

```
1. Daily: bun dev (browser)
   ↓
2. Code features
   ↓
3. Test in browser
   ↓
4. Periodically: bun run electron:start
   ↓
5. Test in Electron
   ↓
6. Before release: bun run electron:build
   ↓
7. Distribute!
```

### Key Principle

> **Develop in browser, test in Electron, build for distribution**

### Time Allocation

- 🌐 **Browser Dev**: 85% of time
- 🖥️ **Electron Testing**: 10% of time
- 📦 **Building**: 5% of time

---

**Questions?** Refer to:

- `ELECTRON_README.md` - Full Electron docs
- `ELECTRON_QUICK_START.md` - Quick commands
- `DISTRIBUTION_GUIDE.md` - How to share your app
- `ELECTRON_WASM_FIX.md` - Troubleshooting WASM issues
- `ELECTRON_MODEL_CACHE.md` - Model caching details
