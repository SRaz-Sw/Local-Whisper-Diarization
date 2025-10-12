# ✅ Before Building - Quick Checklist

**Important:** Update these values before building your Electron apps!

---

## 📝 Step 1: Update package.json

Open `package.json` and update these fields:

### Replace Placeholder Values

```json
{
  "author": {
    "name": "Your Name", // ← Change this
    "email": "your.email@example.com" // ← Change this
  },
  "homepage": "https://github.com/YOUR_USERNAME/whisper-diarization", // ← Change this
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/whisper-diarization.git" // ← Change this
  }
}
```

**Example (filled in):**

```json
{
  "author": {
    "name": "John Smith",
    "email": "john@example.com"
  },
  "homepage": "https://github.com/johnsmith/whisper-diarization",
  "repository": {
    "type": "git",
    "url": "https://github.com/johnsmith/whisper-diarization.git"
  }
}
```

---

## 📝 Step 2: Update Landing Page URLs

Open `src/app/page.tsx` and update the GitHub release URLs (around line 47-48):

```typescript
const baseUrl =
  "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/download/v0.1.0";
("https://github.com/SRaz-Sw/Local-Whisper-Diarization/releases/download/v0.1.0");
```

**Example (filled in):**

```typescript
const baseUrl =
  "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/latest";
```

---

## 📝 Step 3: Code Signing (Critical for Distribution)

⚠️ **Important:** Apps built without code signing will trigger security warnings!

### Quick Decision Guide

**Building for yourself only?**

- ✅ Skip code signing
- ℹ️ Users will need to right-click → Open on macOS
- ℹ️ See `tutorials_plans_markdowns/UNSIGNED_APP_INSTALLATION.md` for user instructions

**Building for others to download?**

- ✅ **Highly recommended** to code sign
- 💰 Costs: macOS ($99/year) + Windows ($50-300/year)
- 📚 See complete guide: `tutorials_plans_markdowns/CODE_SIGNING_GUIDE.md`

### Current Configuration

By default, the app is configured to build **without code signing**:

- `mac.identity: null` - No macOS signing
- `mac.notarize: false` - No notarization
- `win.sign: null` - No Windows signing

This is fine for:

- ✅ Personal use
- ✅ Internal company distribution
- ✅ Testing and development

This will cause issues for:

- ❌ Public downloads (users see "damaged" error on macOS)
- ❌ Windows SmartScreen warnings
- ❌ Auto-updates (requires signing)

### To Enable Code Signing

See the complete guide: `tutorials_plans_markdowns/CODE_SIGNING_GUIDE.md`

**Quick steps:**

1. **For macOS:**
   - Get Apple Developer account ($99/year)
   - Update `electron-builder.json`:
     ```json
     "mac": {
       "identity": "Developer ID Application: Your Name (TEAM_ID)",
       "notarize": { "teamId": "TEAM_ID" }
     }
     ```

2. **For Windows:**
   - Get code signing certificate ($50-300/year)
   - Set environment variables:
     ```bash
     export CSC_LINK=/path/to/certificate.pfx
     export CSC_KEY_PASSWORD=your-password
     ```

---

## 📝 Step 4: Optional - Add App Icons

Place your custom icons in `electron/resources/`:

- `icon.icns` - macOS icon (512x512 PNG converted to ICNS)
- `icon.ico` - Windows icon (256x256 PNG converted to ICO)
- `icon.png` - Linux icon (512x512 PNG)

**Tools for conversion:**

- macOS: `iconutil` (built-in)
- Online: https://cloudconvert.com/png-to-icns
- Online: https://cloudconvert.com/png-to-ico

**If you don't add icons:** Default Electron icon will be used.

---

## ✅ You're Ready!

After updating the above (steps 1-2 required, steps 3-4 optional), you can build:

```bash
cd speech-to-text/nextjs-v1

# Build for macOS
bun run electron:build:mac

# Build for Windows
bun run electron:build:win

# Build for Linux
bun run electron:build:linux
```

---

## 🔍 Verify Your Changes

### Check package.json

```bash
cd speech-to-text/nextjs-v1
cat package.json | grep -A 3 "author"
cat package.json | grep "homepage"
```

You should see your actual values, not placeholders.

### Check landing page

```bash
cd speech-to-text/nextjs-v1
grep "baseUrl" src/app/page.tsx
```

You should see your GitHub username, not `YOUR_USERNAME`.

---

## 📋 Build Output Checklist

After building, verify you have these files:

### macOS (if built on Mac)

```bash
ls -lh dist/*.dmg
# Expected: Whisper Diarization-0.1.0-arm64.dmg (~200MB)
# Expected: Whisper Diarization-0.1.0-x64.dmg (~210MB)
```

### Windows (if built from Mac with fix)

```bash
ls -lh dist/*.exe
# Expected: Whisper Diarization Setup 0.1.0.exe (~180MB)
# Expected: Whisper Diarization 0.1.0.exe (~185MB, portable)
```

### Linux (if built)

```bash
ls -lh dist/*.AppImage dist/*.deb
# Expected: Whisper Diarization-0.1.0.AppImage (~190MB)
# Expected: nextjs-v1-client_0.1.0_amd64.deb (~185MB)
```

---

## 🆘 Common Issues

### "description is missed in package.json"

✅ Already fixed - description is included

### "author is missed in package.json"

⚠️ Update the `author` field with your name and email

### "Please specify project homepage"

⚠️ Update the `homepage` field with your GitHub URL

### "default Electron icon is used"

ℹ️ This is just a warning - add icons to `electron/resources/` to fix

### macOS: "App is damaged and can't be opened"

This happens because the app isn't code signed. Two solutions:

**For Users:**

- See `tutorials_plans_markdowns/UNSIGNED_APP_INSTALLATION.md`
- Quick fix: Right-click the app → Select "Open"

**For Developers:**

- See `tutorials_plans_markdowns/CODE_SIGNING_GUIDE.md`
- Get Apple Developer account and code sign the app

### Windows: "Windows protected your PC"

This happens because the app isn't code signed.

**For Users:**

- Click "More info" → "Run anyway"

**For Developers:**

- Get a code signing certificate ($50-300/year)
- See `tutorials_plans_markdowns/CODE_SIGNING_GUIDE.md`

---

## 📚 Next Steps

1. ✅ Update `package.json` metadata
2. ✅ Update landing page URLs
3. ⚠️ Decide on code signing (optional but recommended)
4. ✅ Build for all platforms
5. ✅ Test on target platforms
6. ✅ Create GitHub Release
7. ✅ Upload builds to release
8. ✅ Include installation instructions for unsigned apps (if not signed)
9. ✅ Update download links in landing page
10. ✅ Deploy web app to Vercel

See these guides for more details:

- `tutorials_plans_markdowns/DISTRIBUTION_GUIDE.md` - Distribution best practices
- `tutorials_plans_markdowns/CODE_SIGNING_GUIDE.md` - How to code sign apps
- `tutorials_plans_markdowns/UNSIGNED_APP_INSTALLATION.md` - User instructions for unsigned apps

---

**Quick Command to Update and Build:**

```bash
# 1. Edit package.json (update author, homepage)
# 2. Edit src/app/page.tsx (update GitHub URLs)
# 3. Build

cd speech-to-text/nextjs-v1
bun run electron:build:mac
bun run electron:build:win
bun run electron:build:linux

# Check output
ls -lh dist/
```

🎉 **You're all set!**
