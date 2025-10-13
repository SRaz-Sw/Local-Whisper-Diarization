# 🔓 Installing Unsigned Apps - User Guide

## The "Damaged" Error on macOS

If you see this error when trying to open the Whisper Diarization app:

```
"Whisper Diarization" is damaged and can't be opened.
You should move it to the Trash.
```

**Don't worry!** The app is **not actually damaged**. This is macOS's security warning for apps that aren't code-signed by an Apple Developer account. The app is safe to use.

---

## ✅ Solution Options (macOS)

### Option 1: Right-Click Method (Recommended)

This is the easiest and safest method:

1. **DO NOT** double-click the app
2. **Right-click** (or Control + click) on "Whisper Diarization.app"
3. Select **"Open"** from the menu
4. You'll see a different dialog with an **"Open"** button
5. Click **"Open"**
6. The app will now open and remember this choice

**Why this works:** Right-clicking gives you an override option that bypasses the strict Gatekeeper check.

### Option 2: System Settings Method

If the right-click method doesn't work:

1. Try to open the app normally (you'll get the error)
2. Go to **System Settings** → **Privacy & Security**
3. Scroll down to the **Security** section
4. You'll see a message: _"Whisper Diarization was blocked..."_
5. Click **"Open Anyway"**
6. Confirm in the next dialog

### Option 3: Remove Quarantine Attribute (Advanced)

For advanced users comfortable with Terminal:

```bash
# Navigate to Applications folder
cd /Applications

# Remove quarantine attribute
xattr -cr "Whisper Diarization.app"

# Now open the app normally
open "Whisper Diarization.app"
```

**What this does:** Removes the "downloaded from internet" flag that triggers Gatekeeper.

### Option 4: Temporarily Disable Gatekeeper (Not Recommended)

⚠️ **Warning:** This affects ALL apps, not just this one. Re-enable after installation.

```bash
# Disable Gatekeeper
sudo spctl --master-disable

# Install and open the app

# Re-enable Gatekeeper (IMPORTANT!)
sudo spctl --master-enable
```

---

## ✅ Solution for Windows

If Windows SmartScreen blocks the app:

### Method 1: "More Info" Method

1. Try to run the installer
2. Windows will show "Windows protected your PC"
3. Click **"More info"**
4. Click **"Run anyway"**

### Method 2: SmartScreen Settings

1. Go to **Settings** → **Privacy & Security** → **Windows Security**
2. Click **"App & browser control"**
3. Under "Check apps and files", select **"Warn"** or **"Off"** temporarily
4. Install the app
5. **Re-enable** SmartScreen protection

---

## ✅ Solution for Linux

Linux distributions generally don't have this issue. If the AppImage won't run:

```bash
# Make it executable
chmod +x Whisper-Diarization-*.AppImage

# Run it
./Whisper-Diarization-*.AppImage
```

---

## ❓ Why Does This Happen?

### macOS

- **Code Signing** costs $99/year (Apple Developer Program)
- Apps without code signing trigger Gatekeeper warnings
- This is a security feature to protect users from malware
- **The app is safe** - it's just not signed with an Apple certificate

### Windows

- **Code Signing Certificates** cost $50-300/year
- Microsoft SmartScreen blocks unsigned apps
- This protects users from potentially harmful software
- **The app is safe** - it's just not signed with a Microsoft-trusted certificate

---

## 🔒 Is This Safe?

**Yes, if you downloaded from a trusted source:**

✅ **Safe sources:**

- Official GitHub Releases
- Developer's official website
- Direct link from developer

❌ **Unsafe sources:**

- Random download sites
- Torrent sites
- Unknown third-party mirrors

**How to verify:**

- Check the GitHub repository and compare checksums (SHA256)
- Download from official sources only
- Scan with antivirus if concerned

---

## 🛡️ For Developers: How to Fix This Permanently

If you're distributing this app, see:

- `CODE_SIGNING_GUIDE.md` - Complete code signing setup
- `DISTRIBUTION_GUIDE.md` - Distribution best practices

**Short answer:** Get a code signing certificate and configure electron-builder properly.

---

## 📝 Summary by Platform

### macOS

1. Right-click → Open (easiest)
2. System Settings → Privacy & Security → Open Anyway
3. Terminal: `xattr -cr "Whisper Diarization.app"`

### Windows

1. Click "More info" → "Run anyway"
2. Temporarily adjust SmartScreen settings

### Linux

1. `chmod +x` to make AppImage executable
2. Run the AppImage

---

## 🆘 Still Having Issues?

If none of these solutions work:

1. **Check macOS version:** Requires macOS 10.13+ (High Sierra or later)
2. **Check file integrity:** Re-download the app
3. **Try different download format:**
   - macOS: Try `.zip` instead of `.dmg` (or vice versa)
   - Windows: Try portable `.exe` instead of installer
4. **Check system logs:**
   ```bash
   # macOS - Check for detailed error
   log show --predicate 'process == "kernel"' --last 5m | grep -i gatekeeper
   ```

---

## 📚 Additional Resources

- [Apple's Gatekeeper Documentation](https://support.apple.com/guide/security/gatekeeper-and-runtime-protection-sec5599b66df/web)
- [Windows SmartScreen Information](https://support.microsoft.com/en-us/windows/what-is-smartscreen-and-how-can-it-help-protect-me-1c9a874a-6826-be5e-45b1-67fa445a74c8)

---

**Remember:** After successfully opening the app once, macOS/Windows will remember your choice and won't block it again!
