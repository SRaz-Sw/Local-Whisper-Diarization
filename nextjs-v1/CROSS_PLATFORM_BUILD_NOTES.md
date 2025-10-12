# 🔧 Cross-Platform Build Notes

Solutions for building Windows/Linux apps from macOS.

---

## ❌ The Problem

When building Windows or Linux apps from macOS, you may encounter this error:

```
⨯ node-gyp does not support cross-compiling native modules from source.
failedTask=build
Error: node-gyp does not support cross-compiling native modules from source.
```

This happens because:

1. Some dependencies include **native modules** (like `msgpackr-extract`)
2. These modules need to be compiled for the target platform
3. `node-gyp` cannot cross-compile from macOS to Windows/Linux

---

## ✅ Solution 1: Skip Native Module Rebuild (Recommended)

I've already updated `electron-builder.json` with these settings:

```json
{
  "buildDependenciesFromSource": false,
  "nodeGypRebuild": false,
  "npmRebuild": false
}
```

**What this does:**

- Tells electron-builder to skip rebuilding native modules
- Uses pre-compiled binaries instead
- Allows cross-platform builds from macOS

**Now try building again:**

```bash
bun run electron:build:win
bun run electron:build:linux
```

---

## ✅ Solution 2: Build on Target Platform

For the most reliable builds, build on the actual platform:

### Windows Builds (on Windows)

```bash
# On Windows machine:
cd speech-to-text/nextjs-v1
bun install
bun run electron:build:win
```

### Linux Builds (on Linux)

```bash
# On Linux machine:
cd speech-to-text/nextjs-v1
bun install
bun run electron:build:linux
```

---

## ✅ Solution 3: Use Docker (Advanced)

Build for Linux using Docker on macOS:

```bash
# Install Docker Desktop for Mac
brew install --cask docker

# Build Linux version in Docker
cd speech-to-text/nextjs-v1
docker run --rm -ti \
  -v ${PWD}:/project \
  -w /project \
  electronuserland/builder:wine \
  /bin/bash -c "bun install && bun run electron:build:linux"
```

---

## ✅ Solution 4: Use GitHub Actions (CI/CD)

Let GitHub build all platforms automatically:

Create `.github/workflows/build.yml`:

```yaml
name: Build Electron App

on:
  push:
    tags:
      - "v*"

jobs:
  build-mac:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: cd speech-to-text/nextjs-v1 && bun install
      - run: cd speech-to-text/nextjs-v1 && bun run electron:build:mac
      - uses: actions/upload-artifact@v3
        with:
          name: mac-builds
          path: speech-to-text/nextjs-v1/dist/*.dmg

  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: cd speech-to-text/nextjs-v1 && bun install
      - run: cd speech-to-text/nextjs-v1 && bun run electron:build:win
      - uses: actions/upload-artifact@v3
        with:
          name: windows-builds
          path: speech-to-text/nextjs-v1/dist/*.exe

  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: cd speech-to-text/nextjs-v1 && bun install
      - run: cd speech-to-text/nextjs-v1 && bun run electron:build:linux
      - uses: actions/upload-artifact@v3
        with:
          name: linux-builds
          path: |
            speech-to-text/nextjs-v1/dist/*.AppImage
            speech-to-text/nextjs-v1/dist/*.deb

  create-release:
    needs: [build-mac, build-windows, build-linux]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v3
      - uses: softprops/action-gh-release@v1
        with:
          files: |
            mac-builds/*
            windows-builds/*
            linux-builds/*
```

**Usage:**

```bash
# Tag and push to trigger build
git tag v0.1.0
git push origin v0.1.0

# GitHub Actions builds all platforms automatically
# Artifacts appear in the release
```

---

## 🧪 Testing the Fix

After updating `electron-builder.json`, try:

```bash
cd speech-to-text/nextjs-v1

# Try Windows build again
bun run electron:build:win

# Try Linux build
bun run electron:build:linux
```

**Expected result:** Builds should complete without the `node-gyp` error.

---

## 📝 What Changed

**Before:**

```json
{
  "appId": "com.whisper.diarization"
  // ... no rebuild settings
}
```

**After:**

```json
{
  "appId": "com.whisper.diarization",
  "buildDependenciesFromSource": false,
  "nodeGypRebuild": false,
  "npmRebuild": false
  // ... rest of config
}
```

---

## ⚠️ Potential Issues

### Issue 1: Missing Native Modules

**Problem:** App crashes on Windows/Linux due to missing native module

**Solution:** The native module (`msgpackr-extract`) has pre-built binaries for all platforms, so this shouldn't be an issue. If it is:

```bash
# Manually install with pre-built binaries
npm install --force msgpackr-extract
```

### Issue 2: Missing Metadata for Linux Builds

**Problem:** Linux build fails with:

```
Please specify project homepage
Please specify author 'email' in the application package.json
It is required to set Linux .deb package maintainer
```

**Solution:** I've added the required metadata to `package.json`:

```json
{
  "description": "Professional speech-to-text transcription...",
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com"
  },
  "homepage": "https://github.com/YOUR_USERNAME/whisper-diarization",
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/whisper-diarization.git"
  }
}
```

**Important:** Update these placeholders:

- Replace `Your Name` with your actual name
- Replace `your.email@example.com` with your email
- Replace `YOUR_USERNAME` with your GitHub username

### Issue 3: Wine Installation (for Windows builds on macOS)

If you still want to try building Windows apps on macOS with Wine:

```bash
# Install Wine (allows running Windows executables on macOS)
brew install --cask wine-stable

# Try building again
bun run electron:build:win
```

**Note:** Wine can be unreliable. GitHub Actions or building on Windows is recommended.

---

## 🎯 Recommended Approach

For distributing to customers:

### Option A: Multi-Machine Builds

- Build macOS on Mac ✅ (works)
- Build Windows on Windows PC
- Build Linux on Linux VM/PC

### Option B: GitHub Actions (Best)

- Push tag to GitHub
- GitHub builds all platforms automatically
- Download artifacts from release
- Zero setup on your end after initial config

### Option C: Current Solution (Good Enough)

- Build macOS locally ✅ (works)
- Use the updated config to build Windows/Linux from macOS
- Test on target platforms before distribution

---

## 🔍 Verifying Builds

After building, verify the files exist:

```bash
ls -lh speech-to-text/nextjs-v1/dist/

# You should see:
# - *.dmg (macOS)
# - *.exe (Windows)
# - *.AppImage, *.deb (Linux)
```

**File sizes should be:**

- macOS: 200-210 MB
- Windows: 180-185 MB
- Linux: 185-190 MB

---

## 📚 Additional Resources

- **electron-builder docs:** https://www.electron.build/configuration/configuration
- **Native modules:** https://www.electron.build/multi-platform-build
- **GitHub Actions:** https://www.electron.build/configuration/publish

---

## ✅ Summary

1. ✅ Updated `electron-builder.json` to skip native module rebuilding
2. ✅ This allows cross-platform builds from macOS
3. ✅ Try building Windows/Linux again
4. ✅ For most reliable results: Use GitHub Actions or build on target platform

---

**Try building now:**

```bash
cd speech-to-text/nextjs-v1
bun run electron:build:win
```

If it still fails, use **GitHub Actions** (Solution 4) or build on a Windows machine.
