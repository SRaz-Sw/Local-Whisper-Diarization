# 📦 Whisper Diarization - Installation Instructions

Thank you for downloading Whisper Diarization! Please follow the instructions below for your operating system.

---

## 🍎 macOS Installation

### Step 1: Download

- **Apple Silicon (M1/M2/M3):** Download the `-arm64.dmg` file
- **Intel Mac:** Download the `-x64.dmg` file

### Step 2: Install

1. Open the downloaded `.dmg` file
2. Drag "Whisper Diarization" to the Applications folder
3. Close the DMG window

### Step 3: Open the App (Important!)

⚠️ **Do NOT double-click the app the first time!** You'll see an error saying the app is "damaged."

**Instead, do this:**

1. Open **Finder** → **Applications**
2. Find "Whisper Diarization"
3. **Right-click** (or Control + click) on the app
4. Select **"Open"** from the menu
5. Click **"Open"** in the dialog that appears
6. The app will now open successfully

**After the first time,** you can open the app normally by double-clicking.

### Why does this happen?

This app is not code-signed with an Apple Developer certificate (which costs $99/year). macOS's security feature (Gatekeeper) blocks unsigned apps by default. The right-click method allows you to override this security check.

**Is it safe?** Yes, if you downloaded it from our official GitHub repository or website. The app is open-source and you can review the code at any time.

### Alternative Methods

If right-clicking doesn't work:

**Method 1: System Settings**

1. Try to open the app normally
2. Go to **System Settings** → **Privacy & Security**
3. Look for a message about "Whisper Diarization was blocked"
4. Click **"Open Anyway"**

**Method 2: Remove Quarantine (Terminal)**

```bash
xattr -cr /Applications/Whisper\ Diarization.app
```

Then open the app normally.

---

## 🪟 Windows Installation

### Step 1: Download

- **Installer:** Download `Whisper Diarization Setup X.X.X.exe` (recommended)
- **Portable:** Download `Whisper Diarization X.X.X.exe` (no installation required)

### Step 2: Install

#### If using the Installer:

1. Double-click the `Setup.exe` file
2. If you see "Windows protected your PC":
   - Click **"More info"**
   - Click **"Run anyway"**
3. Follow the installation wizard
4. Launch from Start menu or desktop shortcut

#### If using the Portable version:

1. Double-click the `.exe` file
2. If you see "Windows protected your PC":
   - Click **"More info"**
   - Click **"Run anyway"**
3. The app will run without installation

### Why does this happen?

This app is not code-signed with a Windows certificate (which costs $50-300/year). Windows SmartScreen blocks unsigned apps to protect users. The "Run anyway" option allows you to bypass this.

**Is it safe?** Yes, if you downloaded it from our official GitHub repository or website.

---

## 🐧 Linux Installation

### AppImage (Universal)

1. Download the `.AppImage` file
2. Make it executable:
   ```bash
   chmod +x Whisper-Diarization-*.AppImage
   ```
3. Run it:
   ```bash
   ./Whisper-Diarization-*.AppImage
   ```

**Optional:** Integrate with your system:

```bash
# Move to local bin
mv Whisper-Diarization-*.AppImage ~/bin/whisper-diarization
chmod +x ~/bin/whisper-diarization

# Create desktop entry
cat > ~/.local/share/applications/whisper-diarization.desktop <<EOF
[Desktop Entry]
Type=Application
Name=Whisper Diarization
Exec=$HOME/bin/whisper-diarization
Icon=whisper-diarization
Categories=AudioVideo;Audio;
EOF
```

### DEB Package (Ubuntu/Debian)

```bash
# Install
sudo dpkg -i whisper-diarization_*.deb

# If there are dependency issues
sudo apt-get install -f

# Launch
whisper-diarization
```

### RPM Package (Fedora/RHEL)

```bash
# Install
sudo rpm -i whisper-diarization-*.rpm

# Launch
whisper-diarization
```

---

## 📋 System Requirements

### All Platforms

- **RAM:** 4GB minimum, 8GB recommended
- **Disk Space:** 500MB for app + 1-2GB for models
- **Internet:** Required for initial model download (then works offline)

### macOS

- **Version:** macOS 10.13 (High Sierra) or later
- **Architecture:** Intel (x64) or Apple Silicon (arm64)

### Windows

- **Version:** Windows 10 or later
- **Architecture:** 64-bit (x64) or 32-bit (ia32)

### Linux

- **Distribution:** Ubuntu 18.04+, Debian 10+, Fedora 32+, or equivalent
- **Architecture:** 64-bit (x64)
- **Dependencies:** Most are bundled, but you may need:
  ```bash
  sudo apt-get install libgbm1 libasound2
  ```

---

## 🚀 First Launch

On first launch, the app will:

1. Open to the main transcription screen
2. Prompt you to select a Whisper model (downloads on first use)
3. Show model download progress (500MB - 1.5GB depending on model)

**Recommended model for most users:** `small` (good balance of speed/accuracy)

---

## 🆘 Troubleshooting

### macOS: Still showing "damaged" error

1. Make sure you **right-clicked** (not double-clicked)
2. Try the System Settings method (see above)
3. Try the Terminal method: `xattr -cr /Applications/Whisper\ Diarization.app`
4. Check macOS version (requires 10.13+)

### Windows: SmartScreen won't let me run it

1. Click "More info" → "Run anyway"
2. Temporarily disable SmartScreen:
   - Settings → Privacy & Security → Windows Security
   - App & browser control → Set to "Warn"
3. Right-click the file → Properties → Check "Unblock" → OK

### Linux: AppImage won't run

1. Make sure it's executable: `chmod +x *.AppImage`
2. Install FUSE: `sudo apt-get install fuse libfuse2`
3. Try running with `--no-sandbox` flag: `./Whisper-Diarization-*.AppImage --no-sandbox`

### App crashes on launch

1. Check you meet system requirements
2. Try running from terminal to see error messages:
   - macOS: `/Applications/Whisper\ Diarization.app/Contents/MacOS/Whisper\ Diarization`
   - Windows: Run the `.exe` from Command Prompt
   - Linux: Run the AppImage from terminal
3. Report the error on our GitHub Issues page

### Model download fails

1. Check internet connection
2. Check available disk space (need 1-2GB)
3. Try a smaller model first (e.g., "tiny" or "base")
4. Check firewall isn't blocking the app

---

## 📚 Documentation

- **User Guide:** See the built-in help in the app
- **GitHub Repository:** [Your GitHub URL]
- **Report Issues:** [Your GitHub Issues URL]
- **Source Code:** Available on GitHub (open-source!)

---

## 🔒 Privacy & Security

- ✅ **100% Offline:** After model download, works completely offline
- ✅ **No Telemetry:** We don't collect any usage data
- ✅ **Open Source:** Review the code yourself on GitHub
- ✅ **Local Processing:** All transcription happens on your computer

---

## 💬 Support

Need help? Here's how to get it:

1. **Check the troubleshooting section** above
2. **Search existing GitHub Issues** - someone may have solved your problem
3. **Open a new GitHub Issue** with:
   - Your operating system and version
   - Steps to reproduce the problem
   - Any error messages you see
4. **Join our community discussions** on GitHub

---

## ⭐ Enjoying the App?

If you find Whisper Diarization useful:

- ⭐ Star the GitHub repository
- 🐦 Share it with friends
- 🐛 Report bugs to help us improve
- 💡 Suggest features you'd like to see

---

**Thank you for using Whisper Diarization!** 🎉

_For more detailed technical information, see the documentation in the GitHub repository._
