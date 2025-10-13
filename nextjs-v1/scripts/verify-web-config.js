#!/usr/bin/env node

/**
 * Verify Web Config Script
 *
 * This script ensures next.config.ts is in web mode before starting dev mode.
 * It automatically fixes the config if it's in Electron mode.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const rootDir = path.join(__dirname, "..");
const configFile = path.join(rootDir, "next.config.ts");

console.log("🔍 Verifying Next.js config is in web mode...\n");

try {
  const config = fs.readFileSync(configFile, "utf8");

  // Check if config is in Electron mode
  if (config.includes('output: "export"')) {
    console.error("⚠️  WARNING: Config is in Electron mode!");
    console.log(
      "   This will break web development and Electron dev mode.",
    );
    console.log("\n🔧 Automatically fixing config...\n");

    try {
      // Try to restore from git
      execSync("git checkout 47031a6 -- nextjs-v1/next.config.ts", {
        cwd: path.join(rootDir, ".."),
        stdio: "inherit",
      });
      console.log("\n✅ Config automatically restored to web mode!");
      console.log("   You can now run dev or electron:start safely.\n");
    } catch (error) {
      console.error("\n❌ Could not restore config from git.");
      console.error("   Please manually restore the web config:\n");
      console.error(
        "   git checkout 47031a6 -- nextjs-v1/next.config.ts\n",
      );
      process.exit(1);
    }
  } else {
    console.log("✅ Config is in web mode - ready for development!\n");
  }
} catch (error) {
  console.error("❌ Error reading config:", error.message);
  process.exit(1);
}
