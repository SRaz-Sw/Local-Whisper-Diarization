# App Icons

Place your application icons in this directory:

## Required Icons

### macOS

- `icon.icns` - macOS icon file (512x512, 256x256, 128x128, 64x64, 32x32, 16x16)

### Windows

- `icon.ico` - Windows icon file (256x256, 128x128, 96x96, 64x64, 48x48, 32x32, 16x16)

### Linux

- `icon.png` - Linux icon file (512x512 PNG)

## Creating Icons

### From PNG to ICNS (macOS)

```bash
# Using iconutil (macOS)
mkdir icon.iconset
sips -z 16 16     icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon.png --out icon.iconset/icon_512x512.png
iconutil -c icns icon.iconset
```

### From PNG to ICO (Windows)

Use an online converter like:

- https://convertio.co/png-ico/
- https://cloudconvert.com/png-to-ico

Or use ImageMagick:

```bash
convert icon.png -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico
```

## Fallback

If no icons are provided, electron-builder will use default Electron icons.



