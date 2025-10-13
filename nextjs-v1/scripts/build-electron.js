#!/usr/bin/env node

/**
 * Electron Build Script
 *
 * This script handles the Next.js build for Electron by:
 * 1. Temporarily using next.config.electron.ts instead of next.config.ts
 * 2. Building Next.js with static export
 * 3. Restoring the original config
 *
 * This is necessary because Next.js doesn't support dynamic config file selection,
 * but we need different configs for web vs Electron builds.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const rootDir = path.join(__dirname, "..");
const originalConfig = path.join(rootDir, "next.config.ts");
const electronConfig = path.join(rootDir, "next.config.electron.ts");
const backupConfig = path.join(rootDir, "next.config.ts.backup");

console.log("🔧 Starting Electron build process...\n");

// Step 1: Backup original config
console.log("📦 Backing up next.config.ts...");
if (fs.existsSync(originalConfig)) {
  fs.copyFileSync(originalConfig, backupConfig);
  console.log("✅ Backup created: next.config.ts.backup\n");
}

// Step 2: Use Electron config
console.log("🔄 Switching to Electron configuration...");
fs.copyFileSync(electronConfig, originalConfig);
console.log("✅ Using next.config.electron.ts\n");

try {
  // Step 3: Clean previous build
  console.log("🧹 Cleaning previous build...");
  const outDir = path.join(rootDir, "out");
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
    console.log("✅ Cleaned out directory\n");
  }

  // Step 4: Run Next.js build
  console.log("🏗️  Building Next.js for Electron (static export)...");
  console.log("This may take a few minutes...\n");

  execSync("bun install --force", {
    cwd: rootDir,
    stdio: "inherit",
  });

  execSync("bun run next build", {
    cwd: rootDir,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  });

  console.log("\n✅ Next.js build completed successfully!");

  // Step 5: Verify output
  if (fs.existsSync(outDir)) {
    const files = fs.readdirSync(outDir);
    console.log(`✅ Static export created: ${files.length} items in out/`);

    // Check for web-transc page
    const webTranscHtml = path.join(outDir, "web-transc", "index.html");
    if (fs.existsSync(webTranscHtml)) {
      console.log("✅ Found out/web-transc/index.html");
    } else {
      console.warn("⚠️  Warning: out/web-transc/index.html not found");
    }
  } else {
    console.error("❌ Error: out directory was not created!");
    process.exit(1);
  }
} catch (error) {
  console.error("\n❌ Build failed:", error.message);
  process.exit(1);
} finally {
  // Step 6: Restore original config
  console.log("\n🔄 Restoring original configuration...");
  if (fs.existsSync(backupConfig)) {
    fs.copyFileSync(backupConfig, originalConfig);
    fs.unlinkSync(backupConfig);
    console.log("✅ Restored next.config.ts");
  }

  // Step 7: Verify restoration
  console.log("🔍 Verifying config restoration...");
  try {
    const restoredConfig = fs.readFileSync(originalConfig, "utf8");
    if (restoredConfig.includes('output: "export"')) {
      console.error("\n❌ ERROR: Config was not properly restored!");
      console.error(
        "   The web config should not have 'output: export' property.",
      );
      console.error("\n   Attempting automatic fix from git history...");
      try {
        execSync("git checkout 47031a6 -- nextjs-v1/next.config.ts", {
          cwd: path.join(rootDir, ".."),
          stdio: "inherit",
        });
        console.log("✅ Config automatically restored from git\n");
      } catch (gitError) {
        console.error(
          "   ⚠️  Manual fix required: git checkout 47031a6 -- nextjs-v1/next.config.ts",
        );
      }
    } else {
      console.log("✅ Config properly restored for web development\n");
    }
  } catch (verifyError) {
    console.warn(
      "⚠️  Could not verify config restoration:",
      verifyError.message,
    );
  }
}

console.log("✨ Electron build preparation complete!");
console.log("📦 Ready for electron-builder packaging...\n");
