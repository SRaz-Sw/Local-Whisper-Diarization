# 📦 Distribution Guide - Whisper Diarization Desktop App

Complete guide for distributing your Electron desktop app to users across all platforms.

## Table of Contents

- [Quick Start](#quick-start)
- [Building for Distribution](#building-for-distribution)
- [Distribution Platforms](#distribution-platforms)
- [Creating Download Links](#creating-download-links)
- [Auto-Updates](#auto-updates)
- [Code Signing](#code-signing)
- [Publishing Checklist](#publishing-checklist)

## Quick Start

### 1. Build All Platforms

```bash
cd speech-to-text/nextjs-v1

# Build for all platforms (requires dependencies installed)
bun run electron:build:mac
bun run electron:build:win
bun run electron:build:linux
```

### 2. Find Your Build Files

All installers will be in the `dist/` folder:

```
dist/
├── Whisper Diarization-0.1.0-arm64.dmg          # macOS Apple Silicon
├── Whisper Diarization-0.1.0-x64.dmg            # macOS Intel
├── Whisper Diarization-0.1.0-arm64-mac.zip      # macOS ARM ZIP
├── Whisper Diarization-0.1.0-mac.zip            # macOS Intel ZIP
├── Whisper Diarization Setup 0.1.0.exe          # Windows Installer
├── Whisper Diarization-0.1.0.exe                # Windows Portable
├── Whisper Diarization-0.1.0.AppImage           # Linux AppImage
└── whisper-diarization_0.1.0_amd64.deb          # Linux Debian package
```

## Building for Distribution

### Build Requirements by Platform

#### macOS (Build on macOS)

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Build
bun run electron:build:mac
```

**Outputs:**

- `.dmg` - Disk image for easy installation (recommended)
- `.zip` - Compressed app bundle (alternative)

#### Windows (Build on Windows or macOS)

```bash
# On Windows: Install Windows Build Tools
npm install --global windows-build-tools

# Build
bun run electron:build:win
```

**Outputs:**

- `Setup.exe` - NSIS installer with wizard
- `.exe` - Portable executable (no installation required)

#### Linux (Build on Linux or macOS)

```bash
# On Ubuntu/Debian: Install build essentials
sudo apt-get install build-essential

# Build
bun run electron:build:linux
```

**Outputs:**

- `.AppImage` - Universal Linux package (recommended)
- `.deb` - Debian/Ubuntu package

### Cross-Platform Building

If you're on macOS, you can build for all platforms:

```bash
# Build everything at once
electron-builder -mwl

# Or individually
bun run electron:build:mac
bun run electron:build:win
bun run electron:build:linux
```

**Note:** Cross-platform building for Windows from macOS requires Wine installed.

## Distribution Platforms

### Option 1: GitHub Releases (Recommended - Free)

Perfect for open-source projects or private releases.

#### Setup

1. **Create a GitHub Repository** (if not already done)

2. **Create a New Release**
   - Go to your repo → Releases → "Create a new release"
   - Tag: `v0.1.0`
   - Title: `Whisper Diarization v0.1.0`
   - Description: Add release notes

3. **Upload Build Files**
   - Drag and drop all files from `dist/` folder
   - Upload these key files:
     - ✅ `Whisper Diarization-0.1.0-arm64.dmg` (macOS Apple Silicon)
     - ✅ `Whisper Diarization-0.1.0-x64.dmg` (macOS Intel)
     - ✅ `Whisper Diarization Setup 0.1.0.exe` (Windows)
     - ✅ `Whisper Diarization-0.1.0.AppImage` (Linux)
     - ✅ `whisper-diarization_0.1.0_amd64.deb` (Linux Debian)

4. **Publish Release**

#### Example Download Links

Once published, your download links will look like:

```
# macOS Apple Silicon
https://github.com/username/repo/releases/download/v0.1.0/Whisper.Diarization-0.1.0-arm64.dmg

# macOS Intel
https://github.com/username/repo/releases/download/v0.1.0/Whisper.Diarization-0.1.0-x64.dmg

# Windows
https://github.com/username/repo/releases/download/v0.1.0/Whisper.Diarization.Setup.0.1.0.exe

# Linux AppImage
https://github.com/username/repo/releases/download/v0.1.0/Whisper.Diarization-0.1.0.AppImage

# Linux DEB
https://github.com/username/repo/releases/download/v0.1.0/whisper-diarization_0.1.0_amd64.deb
```

### Option 2: Self-Hosted Website

Host the files on your own server or cloud storage.

#### Setup

1. **Upload to Cloud Storage**
   - AWS S3
   - Google Cloud Storage
   - DigitalOcean Spaces
   - Cloudflare R2

2. **Make Files Public**
   - Set appropriate permissions
   - Enable direct download

3. **Create Download Page**

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Download Whisper Diarization</title>
  </head>
  <body>
    <h1>Download Whisper Diarization</h1>

    <h2>macOS</h2>
    <a href="https://your-cdn.com/whisper-diarization-arm64.dmg">
      Download for Apple Silicon (M1/M2/M3)
    </a>
    <br />
    <a href="https://your-cdn.com/whisper-diarization-x64.dmg">
      Download for Intel Mac
    </a>

    <h2>Windows</h2>
    <a href="https://your-cdn.com/whisper-diarization-setup.exe">
      Download for Windows (Installer)
    </a>

    <h2>Linux</h2>
    <a href="https://your-cdn.com/whisper-diarization.AppImage">
      Download AppImage (Universal)
    </a>
    <br />
    <a href="https://your-cdn.com/whisper-diarization.deb">
      Download DEB (Ubuntu/Debian)
    </a>
  </body>
</html>
```

### Option 3: App Stores (Paid/More Complex)

For wider distribution with automatic updates:

#### Mac App Store

- **Cost:** $99/year Apple Developer Program
- **Pros:** Trusted source, automatic updates, discoverability
- **Cons:** Strict review process, sandboxing requirements
- **Guide:** https://developer.apple.com/app-store/

#### Microsoft Store

- **Cost:** $19 one-time fee
- **Pros:** Windows integration, automatic updates
- **Cons:** Review process, packaging requirements
- **Guide:** https://docs.microsoft.com/en-us/windows/apps/publish/

#### Snap Store (Linux)

- **Cost:** Free
- **Pros:** Easy Linux distribution, automatic updates
- **Cons:** Snap-specific packaging
- **Guide:** https://snapcraft.io/

## Creating Download Links

### Smart Download Page (Auto-Detect OS)

Create a landing page that automatically detects the user's OS:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Download Whisper Diarization</title>
    <style>
      .download-button {
        padding: 20px 40px;
        font-size: 20px;
        background: #0070f3;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        text-decoration: none;
        display: inline-block;
      }
      .other-platforms {
        margin-top: 40px;
        opacity: 0.7;
      }
    </style>
  </head>
  <body>
    <h1>Download Whisper Diarization</h1>

    <div id="primary-download">
      <a id="download-link" class="download-button">
        Download for <span id="os-name"></span>
      </a>
    </div>

    <div class="other-platforms">
      <h3>Other Platforms</h3>
      <a href="https://github.com/user/repo/releases/latest"
        >View all downloads</a
      >
    </div>

    <script>
      // Auto-detect OS
      const userAgent = navigator.userAgent.toLowerCase();
      let downloadUrl = "";
      let osName = "";

      if (userAgent.includes("mac")) {
        // Detect Apple Silicon vs Intel
        const isAppleSilicon =
          navigator.userAgent.includes("Mac") &&
          navigator.platform === "MacIntel" &&
          navigator.maxTouchPoints > 0;

        if (isAppleSilicon) {
          downloadUrl =
            "https://github.com/user/repo/releases/download/v0.1.0/Whisper-Diarization-arm64.dmg";
          osName = "macOS (Apple Silicon)";
        } else {
          downloadUrl =
            "https://github.com/user/repo/releases/download/v0.1.0/Whisper-Diarization-x64.dmg";
          osName = "macOS (Intel)";
        }
      } else if (userAgent.includes("win")) {
        downloadUrl =
          "https://github.com/user/repo/releases/download/v0.1.0/Whisper-Diarization-Setup.exe";
        osName = "Windows";
      } else if (userAgent.includes("linux")) {
        downloadUrl =
          "https://github.com/user/repo/releases/download/v0.1.0/Whisper-Diarization.AppImage";
        osName = "Linux";
      } else {
        downloadUrl = "https://github.com/user/repo/releases/latest";
        osName = "Your Platform";
      }

      document.getElementById("download-link").href = downloadUrl;
      document.getElementById("os-name").textContent = osName;
    </script>
  </body>
</html>
```

### README Badges

Add download badges to your README:

```markdown
# Whisper Diarization

[![Download for macOS](https://img.shields.io/badge/Download-macOS-blue)](https://github.com/user/repo/releases/latest)
[![Download for Windows](https://img.shields.io/badge/Download-Windows-blue)](https://github.com/user/repo/releases/latest)
[![Download for Linux](https://img.shields.io/badge/Download-Linux-blue)](https://github.com/user/repo/releases/latest)

## Installation

### macOS

1. Download the `.dmg` file for your chip (Apple Silicon or Intel)
2. Open the `.dmg` file
3. Drag "Whisper Diarization" to Applications folder
4. Done! Launch from Applications

### Windows

1. Download the `Setup.exe` file
2. Run the installer
3. Follow the installation wizard
4. Launch from Start menu

### Linux

1. Download the `.AppImage` file
2. Make it executable: `chmod +x Whisper-Diarization-*.AppImage`
3. Run it: `./Whisper-Diarization-*.AppImage`
```

## Auto-Updates

Enable automatic updates so users always have the latest version.

### Setup electron-updater

1. **Install Package**

```bash
bun add electron-updater
```

2. **Update electron-builder.json**

```json
{
  "publish": {
    "provider": "github",
    "owner": "your-username",
    "repo": "your-repo"
  }
}
```

3. **Update electron/main.js**

```javascript
const { app, BrowserWindow } = require("electron");
const { autoUpdater } = require("electron-updater");

// Enable auto-updates
app.whenReady().then(() => {
  createWindow();

  // Check for updates
  autoUpdater.checkForUpdatesAndNotify();

  // Check for updates every hour
  setInterval(
    () => {
      autoUpdater.checkForUpdatesAndNotify();
    },
    60 * 60 * 1000,
  );
});

// Update event handlers
autoUpdater.on("update-available", () => {
  console.log("Update available");
});

autoUpdater.on("update-downloaded", () => {
  autoUpdater.quitAndInstall();
});
```

4. **Build with Auto-Update**

```bash
bun run electron:build
```

Now your app will automatically check for updates on GitHub Releases!

## Code Signing

### Why Code Sign?

- **Security:** Proves the app is from you and hasn't been tampered with
- **Trust:** Users won't see security warnings
- **Requirements:** Required for macOS and recommended for Windows

### macOS Code Signing

1. **Get Apple Developer Account** ($99/year)
   - Sign up at https://developer.apple.com

2. **Get Developer ID Certificate**
   - Xcode → Preferences → Accounts → Manage Certificates
   - Request "Developer ID Application" certificate

3. **Update electron-builder.json**

```json
{
  "mac": {
    "identity": "Developer ID Application: Your Name (TEAM_ID)",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "electron/entitlements.mac.plist",
    "entitlementsInherit": "electron/entitlements.mac.plist"
  }
}
```

4. **Build**

```bash
bun run electron:build:mac
```

### Windows Code Signing

1. **Get Code Signing Certificate** ($50-300/year)
   - Options: DigiCert, Sectigo, GlobalSign

2. **Update electron-builder.json**

```json
{
  "win": {
    "certificateFile": "path/to/certificate.pfx",
    "certificatePassword": "your-password"
  }
}
```

Or use environment variables:

```bash
export CSC_LINK=/path/to/certificate.pfx
export CSC_KEY_PASSWORD=your-password
bun run electron:build:win
```

## Publishing Checklist

Before releasing your app to users:

### Pre-Release Testing

- [ ] Test on all target platforms
- [ ] Test installation process
- [ ] Test uninstallation process
- [ ] Verify app icon appears correctly
- [ ] Test all core features
- [ ] Test offline functionality
- [ ] Check memory usage
- [ ] Verify no console errors

### Build Preparation

- [ ] Update version in `package.json`
- [ ] Update changelog/release notes
- [ ] Run final builds for all platforms
- [ ] Test built apps (not just dev mode)
- [ ] Verify file sizes are reasonable

### Distribution Setup

- [ ] Choose distribution platform
- [ ] Set up GitHub Release or hosting
- [ ] Upload all platform builds
- [ ] Create download links
- [ ] Test download links

### Documentation

- [ ] Update README with download links
- [ ] Add installation instructions
- [ ] Document system requirements
- [ ] Add troubleshooting guide
- [ ] Include screenshots/demos

### Optional but Recommended

- [ ] Set up code signing
- [ ] Enable auto-updates
- [ ] Create a landing page
- [ ] Add analytics (privacy-respecting)
- [ ] Set up error reporting

## File Size Optimization

Reduce download sizes:

```json
// In electron-builder.json
{
  "compression": "maximum",
  "files": [
    "out/**/*",
    "electron/**/*",
    "public/workers/**/*",
    "!**/*.map",
    "!**/*.ts",
    "!node_modules/**/*.md"
  ]
}
```

## Distribution Templates

### GitHub Release Template

```markdown
# 🎉 Whisper Diarization v0.1.0

## 📥 Downloads

### macOS

- [Download for Apple Silicon (M1/M2/M3)](link-to-arm64.dmg) - **200MB**
- [Download for Intel Mac](link-to-x64.dmg) - **210MB**

### Windows

- [Download Installer](link-to-setup.exe) - **180MB**
- [Download Portable](link-to-portable.exe) - **185MB**

### Linux

- [Download AppImage](link-to-appimage) - **190MB**
- [Download DEB Package](link-to-deb) - **185MB**

## ✨ What's New

- 🎙️ Whisper-based speech transcription
- 👥 Automatic speaker diarization
- ⚡ WebGPU acceleration
- 🌍 100+ languages supported
- 💾 Complete offline support

## 📋 System Requirements

- **OS:** macOS 10.13+, Windows 10+, or Ubuntu 18.04+
- **RAM:** 4GB minimum (8GB recommended)
- **Disk:** 500MB

## 🚀 Installation

### macOS

1. Download the appropriate DMG for your Mac
2. Open the DMG file
3. Drag app to Applications folder
4. Launch from Applications

### Windows

1. Download and run the installer
2. Follow the setup wizard
3. Launch from Start menu

### Linux

1. Download AppImage or DEB
2. Make executable (AppImage): `chmod +x *.AppImage`
3. Run the app

## 🐛 Known Issues

- None yet! Please report any issues on GitHub.

## 📝 Changelog

- Initial release with core features

---

**Full Changelog**: https://github.com/user/repo/compare/v0.0.0...v0.1.0
```

## Support Resources

- **Documentation:** Include link to docs
- **Issues:** GitHub Issues for bug reports
- **Discussions:** GitHub Discussions for questions
- **Email:** Support email address

---

## Quick Reference

**Build Commands:**

```bash
bun run electron:build:mac     # macOS
bun run electron:build:win     # Windows
bun run electron:build:linux   # Linux
```

**Distribution Platforms:**

- GitHub Releases (Free, recommended)
- Self-hosted website
- App stores (paid)

**File Locations:**

- Built apps: `dist/` folder
- Installer sizes: 180-210MB

**Next Steps:**

1. Build your app
2. Test on all platforms
3. Upload to GitHub Releases
4. Share download links with users!

---

**🎊 Congratulations!** Your app is ready for distribution!
