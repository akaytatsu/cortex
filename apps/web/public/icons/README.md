# PWA Icons

This directory contains PWA icons in various sizes for Cortex IDE.

## Required Icon Sizes

The following icon files need to be generated from the logo files:
- `icon-72x72.png` (72x72px) - Android launcher icon
- `icon-96x96.png` (96x96px) - Android launcher icon
- `icon-128x128.png` (128x128px) - Chrome Web Store
- `icon-144x144.png` (144x144px) - Android launcher icon
- `icon-152x152.png` (152x152px) - iOS Safari
- `icon-192x192.png` (192x192px) - Android launcher icon (standard)
- `icon-384x384.png` (384x384px) - Android launcher icon
- `icon-512x512.png` (512x512px) - Android launcher icon (high-res)

## Shortcut Icons
- `shortcut-new.png` (96x96px) - New workspace shortcut
- `shortcut-terminal.png` (96x96px) - Terminal shortcut

## Generation Instructions

Use the existing logo files to generate these icons:
- Source: `/public/logo-dark.png` or `/public/logo-light.png`
- Ensure proper padding and contrast for maskable icons
- Use tools like ImageMagick, GIMP, or online PWA icon generators

### Example with ImageMagick:
```bash
# Generate all sizes from source logo
convert logo-dark.png -resize 72x72 icon-72x72.png
convert logo-dark.png -resize 96x96 icon-96x96.png
convert logo-dark.png -resize 128x128 icon-128x128.png
convert logo-dark.png -resize 144x144 icon-144x144.png
convert logo-dark.png -resize 152x152 icon-152x152.png
convert logo-dark.png -resize 192x192 icon-192x192.png
convert logo-dark.png -resize 384x384 icon-384x384.png
convert logo-dark.png -resize 512x512 icon-512x512.png
```

## Maskable Icons

All icons should be designed as "maskable" icons with appropriate safe zone padding to work well across different device shapes and masks.