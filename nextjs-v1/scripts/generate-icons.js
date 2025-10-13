#!/usr/bin/env node
/**
 * Generate icon files for Electron app from SVG
 *
 * This script converts the SVG icon to PNG files at various sizes,
 * then creates .icns (macOS), .ico (Windows), and .png (Linux) files
 *
 * Requirements: npm install sharp
 */

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);

const SVG_PATH = path.join(__dirname, "../public/icon.svg");
const RESOURCES_DIR = path.join(__dirname, "../electron/resources");
const TEMP_DIR = path.join(__dirname, "../temp-icons");

// Ensure directories exist
if (!fs.existsSync(RESOURCES_DIR)) {
  fs.mkdirSync(RESOURCES_DIR, { recursive: true });
}

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Icon sizes needed for different platforms
const SIZES = {
  macOS: [16, 32, 64, 128, 256, 512, 1024],
  windows: [16, 24, 32, 48, 64, 128, 256],
  linux: [512, 1024],
};

console.log("🎨 Generating icon files from SVG...\n");

async function convertSvgToPng() {
  try {
    // Check if sharp is available
    try {
      require("sharp");
    } catch (e) {
      console.log("⚠️  Sharp not found. Installing...");
      await execAsync("npm install sharp --no-save");
      console.log("✅ Sharp installed\n");
    }

    const sharp = require("sharp");
    const svgBuffer = fs.readFileSync(SVG_PATH);

    // Generate PNG files at different sizes
    console.log("📐 Generating PNG files...");

    const allSizes = new Set([
      ...SIZES.macOS,
      ...SIZES.windows,
      ...SIZES.linux,
    ]);

    for (const size of allSizes) {
      const outputPath = path.join(TEMP_DIR, `icon-${size}.png`);
      await sharp(svgBuffer).resize(size, size).png().toFile(outputPath);
      console.log(`  ✓ Created ${size}x${size} PNG`);
    }

    console.log("");

    // Create .icns file for macOS
    await createIcns();

    // Create .ico file for Windows
    await createIco();

    // Create .png file for Linux
    await createLinuxPng();

    // Clean up temp directory
    console.log("\n🧹 Cleaning up...");
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });

    console.log("\n✨ Icon generation complete!\n");
    console.log("📁 Generated files:");
    console.log(`  - ${path.join(RESOURCES_DIR, "icon.icns")} (macOS)`);
    console.log(`  - ${path.join(RESOURCES_DIR, "icon.ico")} (Windows)`);
    console.log(`  - ${path.join(RESOURCES_DIR, "icon.png")} (Linux)`);
    console.log("");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

async function createIcns() {
  console.log("🍎 Creating macOS .icns file...");

  // Check platform and available tools
  const isMac = process.platform === "darwin";

  if (isMac) {
    // Use iconutil on macOS
    const iconsetDir = path.join(TEMP_DIR, "icon.iconset");
    fs.mkdirSync(iconsetDir, { recursive: true });

    // Copy PNGs to iconset with correct names
    const iconsetSizes = [
      { size: 16, name: "icon_16x16.png" },
      { size: 32, name: "icon_16x16@2x.png" },
      { size: 32, name: "icon_32x32.png" },
      { size: 64, name: "icon_32x32@2x.png" },
      { size: 128, name: "icon_128x128.png" },
      { size: 256, name: "icon_128x128@2x.png" },
      { size: 256, name: "icon_256x256.png" },
      { size: 512, name: "icon_256x256@2x.png" },
      { size: 512, name: "icon_512x512.png" },
      { size: 1024, name: "icon_512x512@2x.png" },
    ];

    for (const { size, name } of iconsetSizes) {
      const src = path.join(TEMP_DIR, `icon-${size}.png`);
      const dest = path.join(iconsetDir, name);
      fs.copyFileSync(src, dest);
    }

    // Convert iconset to icns
    await execAsync(
      `iconutil -c icns "${iconsetDir}" -o "${path.join(RESOURCES_DIR, "icon.icns")}"`,
    );
    console.log("  ✓ Created icon.icns using iconutil");
  } else {
    // On non-Mac, use png2icons package
    try {
      const png2icons = require("png2icons");
      const input = fs.readFileSync(path.join(TEMP_DIR, "icon-1024.png"));
      const output = png2icons.createICNS(input, png2icons.BEZIER, 0);
      fs.writeFileSync(path.join(RESOURCES_DIR, "icon.icns"), output);
      console.log("  ✓ Created icon.icns using png2icons");
    } catch (e) {
      console.log("  ⚠️  png2icons not available. Installing...");
      await execAsync("npm install png2icons --no-save");
      const png2icons = require("png2icons");
      const input = fs.readFileSync(path.join(TEMP_DIR, "icon-1024.png"));
      const output = png2icons.createICNS(input, png2icons.BEZIER, 0);
      fs.writeFileSync(path.join(RESOURCES_DIR, "icon.icns"), output);
      console.log("  ✓ Created icon.icns using png2icons");
    }
  }
}

async function createIco() {
  console.log("🪟 Creating Windows .ico file...");

  try {
    const png2icons = require("png2icons");
    const input = fs.readFileSync(path.join(TEMP_DIR, "icon-256.png"));
    const output = png2icons.createICO(input, png2icons.HERMITE, 0, false);
    fs.writeFileSync(path.join(RESOURCES_DIR, "icon.ico"), output);
    console.log("  ✓ Created icon.ico");
  } catch (e) {
    console.log("  ⚠️  png2icons not available. Installing...");
    await execAsync("npm install png2icons --no-save");
    const png2icons = require("png2icons");
    const input = fs.readFileSync(path.join(TEMP_DIR, "icon-256.png"));
    const output = png2icons.createICO(input, png2icons.HERMITE, 0, false);
    fs.writeFileSync(path.join(RESOURCES_DIR, "icon.ico"), output);
    console.log("  ✓ Created icon.ico");
  }
}

async function createLinuxPng() {
  console.log("🐧 Creating Linux .png file...");
  const src = path.join(TEMP_DIR, "icon-512.png");
  const dest = path.join(RESOURCES_DIR, "icon.png");
  fs.copyFileSync(src, dest);
  console.log("  ✓ Created icon.png");
}

// Run the script
convertSvgToPng().catch(console.error);
