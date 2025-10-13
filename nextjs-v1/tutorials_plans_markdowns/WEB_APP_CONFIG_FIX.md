# Web App Configuration Fix

## Problem Summary

The web app was unable to load any models, showing the following error in the browser console:

```
❌ Worker error: Error: no available backend found. ERR: [wasm] TypeError: Failed to fetch
```

## Root Cause

The `next.config.ts` file was accidentally left in **Electron mode** instead of **web mode**.

### What Happened:

1. The project has two Next.js configurations:
   - `next.config.ts` - For web development (`npm run dev`)
   - `next.config.electron.ts` - For Electron builds (static export)

2. The `scripts/build-electron.js` script is designed to:
   - Backup `next.config.ts`
   - Replace it with `next.config.electron.ts` during Electron builds
   - **Restore the original after the build**

3. However, the Electron configuration was left in place, breaking the web app.

### Key Differences Between Configs:

| Feature              | Web Config (Working)               | Electron Config (Broken for Web) |
| -------------------- | ---------------------------------- | -------------------------------- |
| `output`             | Default (dev server)               | `"export"` (static export)       |
| `assetPrefix`        | Default                            | `"/"` (absolute paths)           |
| `trailingSlash`      | Default                            | `true`                           |
| CORS Headers         | ✅ Included                        | ❌ Missing                       |
| Cross-Origin Headers | ✅ On all routes                   | ⚠️ Only on specific routes       |
| `connect-src` CSP    | Comprehensive (includes wildcards) | Limited                          |

The missing CORS headers and different CSP directives prevented the worker from fetching WASM files and model data from HuggingFace CDN.

## The Fix

Restored the working web configuration from commit `47031a6`:

```bash
git checkout 47031a6 -- nextjs-v1/next.config.ts
```

## Key Configuration Sections (Web)

### 1. No Static Export

```typescript
const nextConfig: NextConfig = {
  // NO output: "export" - runs as normal Next.js dev server
  devIndicators: false,
  compress: true,
  // ...
```

### 2. Comprehensive CSP Directives

```typescript
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
  "connect-src 'self' data: blob: https://*.vercel.app https://huggingface.co https://cdn-lfs.huggingface.co http://localhost:* https://* ws: wss:",
  "worker-src 'self' blob:",
  // ...
];
```

### 3. CORS Headers

```typescript
const corsHeaders = [
  { key: "Access-Control-Allow-Credentials", value: "true" },
  { key: "Access-Control-Allow-Origin", value: "*" },
  {
    key: "Access-Control-Allow-Methods",
    value: "GET,OPTIONS,PATCH,DELETE,POST,PUT",
  },
  // ...
];
```

### 4. Special Headers for Workers

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [...securityHeaders, ...corsHeaders],
    },
    {
      source: "/workers/:path*",
      headers: [
        { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      ],
    },
  ];
}
```

## How to Prevent This Issue

### Development Workflow:

1. **For web development**: Use `npm run dev` (or `bun dev`)
   - Always ensure `next.config.ts` is in **web mode**
   - Check for `output: "export"` - it should NOT be present

2. **For Electron builds**: Use `npm run electron:build`
   - The build script will automatically handle config swapping
   - The script should restore the config after building

### Verification:

Check which config is active:

```bash
# Should NOT contain 'output: "export"'
grep -A 2 "const nextConfig" nextjs-v1/next.config.ts

# Should show CORS headers
grep -A 5 "corsHeaders" nextjs-v1/next.config.ts
```

### If Config Gets Swapped Again:

```bash
# Restore from the last working commit
git checkout 47031a6 -- nextjs-v1/next.config.ts

# Or restore from git history
git log --all --full-history -- nextjs-v1/next.config.ts
git checkout <commit-hash> -- nextjs-v1/next.config.ts
```

## Testing the Fix

1. Start the dev server:

   ```bash
   cd nextjs-v1
   npm run dev
   ```

2. Open `http://localhost:3000/web-transc`

3. Try to load a model - it should now work without WASM fetch errors

4. Check browser console for successful model downloads from HuggingFace

## Build Script Improvement Suggestion

To prevent this issue in the future, consider modifying `scripts/build-electron.js` to:

```javascript
// Add a verification step at the end
console.log("🔍 Verifying config restoration...");
const restoredConfig = fs.readFileSync(originalConfig, "utf8");
if (restoredConfig.includes('output: "export"')) {
  console.error("❌ ERROR: Config was not properly restored!");
  console.error("Run: git checkout 47031a6 -- nextjs-v1/next.config.ts");
  process.exit(1);
}
console.log("✅ Config properly restored\n");
```

## Summary

- **Web app needs**: Standard Next.js config with CORS and Cross-Origin headers
- **Electron app needs**: Static export config (temporarily swapped during build)
- **The fix**: Restored the correct web configuration
- **Prevention**: Always verify config after Electron builds

## Related Files

- `nextjs-v1/next.config.ts` - Web configuration (current)
- `nextjs-v1/next.config.electron.ts` - Electron configuration (used during builds)
- `nextjs-v1/scripts/build-electron.js` - Build script that swaps configs

## Commit History

- `47031a6` - Last working web configuration
- `64ab18d` - "Electron app works! (web broke for now)" - Where issue was introduced
- Current - Fixed by restoring web configuration
