# 🔐 Complete Code Signing Guide

This guide explains how to properly code sign your Electron apps to avoid "damaged app" warnings and security blocks.

## Table of Contents

- [Why Code Sign?](#why-code-sign)
- [macOS Code Signing](#macos-code-signing)
- [Windows Code Signing](#windows-code-signing)
- [Linux (No Signing Required)](#linux)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

---

## Why Code Sign?

### Benefits

✅ **No security warnings** - Users can install without workarounds  
✅ **Increased trust** - Proves the app comes from you  
✅ **Auto-updates work** - Required for electron-updater  
✅ **Professional distribution** - Essential for serious apps  
✅ **macOS requirement** - Required for distribution on macOS 10.15+

### Costs

- **macOS:** $99/year (Apple Developer Program)
- **Windows:** $50-300/year (Code Signing Certificate)
- **Linux:** Free (no signing required)

### Decision

- **Code sign if:** Distributing to external users, selling the app, or need professional credibility
- **Don't sign if:** Internal use only, personal projects, or testing

---

## macOS Code Signing

### Prerequisites

1. **Apple Developer Account** ($99/year)
   - Sign up at [https://developer.apple.com](https://developer.apple.com)
   - Enroll in the Apple Developer Program

2. **Mac Computer with Xcode**
   - Install Xcode from App Store
   - Install Command Line Tools:
     ```bash
     xcode-select --install
     ```

### Step 1: Get Developer ID Certificate

#### Method A: Using Xcode (Easiest)

1. Open **Xcode**
2. Go to **Xcode** → **Settings** → **Accounts**
3. Click **+** to add your Apple ID
4. Select your Apple ID → Click **Manage Certificates**
5. Click **+** → Select **"Developer ID Application"**
6. Certificate will be downloaded automatically

#### Method B: Using Developer Portal

1. Go to [https://developer.apple.com/account/resources/certificates](https://developer.apple.com/account/resources/certificates)
2. Click **+** to create a new certificate
3. Select **"Developer ID Application"**
4. Follow the instructions to create a CSR (Certificate Signing Request)
5. Upload CSR and download the certificate
6. Double-click to install in Keychain Access

### Step 2: Find Your Certificate Identity

Open Terminal and run:

```bash
security find-identity -v -p codesigning
```

Output will look like:

```
1) 1234567890ABCDEF "Developer ID Application: Your Name (TEAM_ID)"
```

Copy the full identity string in quotes.

### Step 3: Configure electron-builder

Update `electron-builder.json`:

```json
{
  "mac": {
    "category": "public.app-category.productivity",
    "icon": "electron/resources/icon.icns",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "electron/entitlements.mac.plist",
    "entitlementsInherit": "electron/entitlements.mac.plist",
    "identity": "Developer ID Application: Your Name (TEAM_ID)",
    "type": "distribution",
    "notarize": {
      "teamId": "TEAM_ID"
    }
  }
}
```

### Step 4: Configure Notarization

Notarization is **required** for macOS 10.15+ (Catalina and later).

#### Create App-Specific Password

1. Go to [https://appleid.apple.com](https://appleid.apple.com)
2. Sign in with your Apple ID
3. Go to **Security** → **App-Specific Passwords**
4. Click **+** to generate a new password
5. Name it "electron-builder notarization"
6. Copy the generated password (you won't see it again!)

#### Store Credentials in Keychain (Secure Method)

```bash
xcrun notarytool store-credentials "AC_PASSWORD" \
  --apple-id "your-apple-id@email.com" \
  --team-id "TEAM_ID" \
  --password "app-specific-password"
```

Then update `electron-builder.json`:

```json
{
  "mac": {
    "notarize": {
      "teamId": "TEAM_ID"
    }
  }
}
```

#### Or Use Environment Variables (Less Secure)

Create a `.env.local` file (add to `.gitignore`!):

```bash
# .env.local
APPLE_ID=your-apple-id@email.com
APPLE_ID_PASSWORD=your-app-specific-password
APPLE_TEAM_ID=YOUR_TEAM_ID
```

Update `electron-builder.json`:

```json
{
  "mac": {
    "notarize": {
      "teamId": "TEAM_ID"
    }
  },
  "afterSign": "electron/notarize.js"
}
```

Create `electron/notarize.js`:

```javascript
const { notarize } = require("@electron/notarize");

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== "darwin") {
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  return await notarize({
    appBundleId: "com.whisper.diarization",
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_ID_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });
};
```

Install the notarization package:

```bash
bun add -D @electron/notarize
```

### Step 5: Build and Sign

```bash
# Export environment variables if using .env method
export APPLE_ID=your-apple-id@email.com
export APPLE_ID_PASSWORD=your-app-specific-password
export APPLE_TEAM_ID=YOUR_TEAM_ID

# Build
bun run electron:build:mac
```

**Note:** Notarization can take 5-30 minutes. The build will wait for Apple's servers to complete.

### Step 6: Verify Code Signing

```bash
# Check code signature
codesign -dv --verbose=4 "dist/mac/Whisper Diarization.app"

# Check if notarized
spctl -a -vv "dist/mac/Whisper Diarization.app"

# Should output: "source=Notarized Developer ID"
```

---

## Windows Code Signing

### Prerequisites

1. **Code Signing Certificate** ($50-300/year)
   - **Providers:**
     - [DigiCert](https://www.digicert.com/signing/code-signing-certificates) - $474/year (most trusted)
     - [Sectigo](https://sectigo.com/ssl-certificates-tls/code-signing) - $184/year
     - [SSL.com](https://www.ssl.com/certificates/code-signing/) - $199/year
2. **Certificate File**
   - You'll receive a `.pfx` or `.p12` file
   - Keep this file **very secure** (it's like your password)

### Step 1: Get Code Signing Certificate

1. Purchase certificate from a provider
2. Complete identity verification (can take 3-7 days)
3. Download the certificate file (.pfx)
4. Note your certificate password

### Step 2: Configure electron-builder

#### Method A: Configuration File (Less Secure)

⚠️ **Warning:** Never commit certificate files or passwords to Git!

Update `electron-builder.json`:

```json
{
  "win": {
    "icon": "electron/resources/icon.ico",
    "certificateFile": "certs/certificate.pfx",
    "certificatePassword": "your-password",
    "sign": "./electron/sign.js",
    "verifyUpdateCodeSignature": true
  }
}
```

Add `certs/` to `.gitignore`:

```gitignore
# .gitignore
certs/
*.pfx
*.p12
```

#### Method B: Environment Variables (Recommended)

Update `electron-builder.json`:

```json
{
  "win": {
    "icon": "electron/resources/icon.ico",
    "forceCodeSigning": false,
    "verifyUpdateCodeSignature": true
  }
}
```

Set environment variables:

```bash
# Windows (Command Prompt)
set CSC_LINK=C:\path\to\certificate.pfx
set CSC_KEY_PASSWORD=your-password

# Windows (PowerShell)
$env:CSC_LINK="C:\path\to\certificate.pfx"
$env:CSC_KEY_PASSWORD="your-password"

# macOS/Linux (if cross-compiling)
export CSC_LINK=/path/to/certificate.pfx
export CSC_KEY_PASSWORD=your-password
```

### Step 3: Build and Sign

```bash
# Set environment variables first (see above)

# Build
bun run electron:build:win
```

### Step 4: Verify Code Signing

On Windows, run PowerShell:

```powershell
# Check signature
Get-AuthenticodeSignature "dist\Whisper Diarization Setup 0.1.0.exe" | Format-List

# Should show:
# Status: Valid
# SignerCertificate: Your certificate details
```

---

## Linux

Good news! **Linux doesn't require code signing**.

Users can verify your app using checksums (SHA256) instead:

```bash
# Generate checksum when building
sha256sum "dist/Whisper Diarization-0.1.0.AppImage" > checksums.txt
```

Users can verify:

```bash
sha256sum -c checksums.txt
```

---

## Configuration Files

### For Unsigned Builds (Current Setup)

```json
{
  "mac": {
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "electron/entitlements.mac.plist",
    "entitlementsInherit": "electron/entitlements.mac.plist",
    "identity": null,
    "type": "distribution",
    "notarize": false
  },
  "win": {
    "forceCodeSigning": false,
    "verifyUpdateCodeSignature": false
  }
}
```

### For Signed Builds (Production)

```json
{
  "mac": {
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "electron/entitlements.mac.plist",
    "entitlementsInherit": "electron/entitlements.mac.plist",
    "identity": "Developer ID Application: Your Name (TEAM_ID)",
    "type": "distribution",
    "notarize": {
      "teamId": "TEAM_ID"
    }
  },
  "win": {
    "forceCodeSigning": false,
    "verifyUpdateCodeSignature": true
  }
}
```

**Note:** When code signing is enabled, electron-builder will automatically use `CSC_LINK` and `CSC_KEY_PASSWORD` environment variables if set. Set `forceCodeSigning: false` to allow unsigned builds.

---

## Troubleshooting

### macOS

#### "No identity found"

```bash
# List all identities
security find-identity -v -p codesigning

# If empty, install certificate from Xcode or developer portal
```

#### "Notarization failed"

```bash
# Check notarization logs
xcrun notarytool log <submission-id> --keychain-profile "AC_PASSWORD"

# Common issues:
# - Wrong app-specific password
# - Wrong team ID
# - Missing entitlements
```

#### "Code signature invalid"

```bash
# Remove old signatures
codesign --remove-signature "Whisper Diarization.app"

# Re-sign manually
codesign --deep --force --sign "Developer ID Application: Your Name" "Whisper Diarization.app"
```

### Windows

#### "Certificate not found"

- Check `CSC_LINK` path is correct
- Verify password with `CSC_KEY_PASSWORD`
- Ensure certificate is valid (not expired)

#### "Access denied"

- Run as Administrator
- Check certificate permissions
- Verify certificate password

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Release

on:
  push:
    tags:
      - "v*"

jobs:
  build-mac:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: bun install

      - name: Build macOS
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        run: bun run electron:build:mac

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: mac-builds
          path: dist/*.dmg

  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: bun install

      - name: Decode certificate
        run: |
          echo "${{ secrets.WINDOWS_CERTIFICATE }}" | base64 --decode > cert.pfx

      - name: Build Windows
        env:
          CSC_LINK: cert.pfx
          CSC_KEY_PASSWORD: ${{ secrets.WINDOWS_CERT_PASSWORD }}
        run: bun run electron:build:win

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: windows-builds
          path: dist/*.exe
```

**Required Secrets:**

- `APPLE_ID`
- `APPLE_ID_PASSWORD`
- `APPLE_TEAM_ID`
- `WINDOWS_CERTIFICATE` (base64 encoded .pfx file)
- `WINDOWS_CERT_PASSWORD`

---

## Cost Summary

| Platform    | Requirement              | Annual Cost  | One-Time | Free Alternative                 |
| ----------- | ------------------------ | ------------ | -------- | -------------------------------- |
| **macOS**   | Apple Developer Program  | $99/year     | No       | Unsigned (users need workaround) |
| **Windows** | Code Signing Certificate | $50-300/year | No       | Unsigned (SmartScreen warning)   |
| **Linux**   | None                     | Free         | N/A      | SHA256 checksum verification     |

---

## Quick Start Checklist

### For macOS Signing

- [ ] Join Apple Developer Program ($99/year)
- [ ] Install Xcode and Command Line Tools
- [ ] Create Developer ID Application certificate
- [ ] Find certificate identity string
- [ ] Create app-specific password
- [ ] Store notarization credentials
- [ ] Update `electron-builder.json`
- [ ] Build and wait for notarization
- [ ] Verify with `spctl -a -vv`

### For Windows Signing

- [ ] Purchase code signing certificate ($50-300/year)
- [ ] Complete identity verification
- [ ] Download certificate file (.pfx)
- [ ] Secure the certificate file
- [ ] Set environment variables
- [ ] Update `electron-builder.json`
- [ ] Build
- [ ] Verify with `Get-AuthenticodeSignature`

---

## Resources

- [Electron Builder Code Signing](https://www.electron.build/code-signing)
- [Apple Notarization Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Windows Code Signing Best Practices](https://docs.microsoft.com/en-us/windows/win32/seccrypto/cryptography-tools)

---

**Need help?** Check the [troubleshooting section](#troubleshooting) or open an issue on GitHub.
