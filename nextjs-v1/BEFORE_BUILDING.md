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
```

**Example (filled in):**

```typescript
const baseUrl =
  "https://github.com/johnsmith/whisper-diarization/releases/download/v0.1.0";
```

---

## 📝 Step 3: Optional - Add App Icons

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

After updating the above, you can build:

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

---

## 📚 Next Steps

1. ✅ Update `package.json` metadata
2. ✅ Update landing page URLs
3. ✅ Build for all platforms
4. ✅ Test on target platforms
5. ✅ Create GitHub Release
6. ✅ Upload builds to release
7. ✅ Update download links in landing page
8. ✅ Deploy web app to Vercel

See `BUILD_AND_DISTRIBUTION_GUIDE.md` for detailed instructions!

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
