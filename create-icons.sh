#!/bin/bash
#
# Create placeholder icons for Electron app
# For production, replace with professional icons
#

echo "Creating placeholder icons..."

# Create a simple SVG icon
cat > electron/assets/icon.svg << 'EOF'
<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="256" height="256" fill="url(#grad1)" rx="40"/>
  <text x="128" y="140" font-family="Arial" font-size="80" font-weight="bold" fill="white" text-anchor="middle">MF</text>
  <text x="128" y="190" font-family="Arial" font-size="24" fill="white" text-anchor="middle" opacity="0.9">PRO</text>
</svg>
EOF

# If ImageMagick is available, convert SVG to PNG
if command -v convert &> /dev/null; then
    echo "Converting SVG to PNG formats..."
    convert -background none electron/assets/icon.svg -resize 512x512 electron/assets/icon.png
    convert -background none electron/assets/icon.svg -resize 256x256 electron/assets/icon-256.png
    convert -background none electron/assets/icon.svg -resize 128x128 electron/assets/icon-128.png
    convert -background none electron/assets/icon.svg -resize 64x64 electron/assets/icon-64.png
    convert -background none electron/assets/icon.svg -resize 32x32 electron/assets/icon-32.png

    # Tray icon (smaller)
    convert -background none electron/assets/icon.svg -resize 16x16 electron/assets/tray-icon.png

    echo "✓ Icons created successfully"
else
    echo "⚠ ImageMagick not found. Using SVG only."
    echo "  Install ImageMagick: sudo apt-get install imagemagick"
    # Create dummy PNG file
    cp electron/assets/icon.svg electron/assets/icon.png
fi

# Create placeholder ICO file (Windows)
echo "Creating Windows ICO placeholder..."
if command -v convert &> /dev/null; then
    convert electron/assets/icon.png -define icon:auto-resize=256,128,64,48,32,16 electron/assets/icon.ico
    echo "✓ Windows ICO created"
else
    touch electron/assets/icon.ico
    echo "⚠ Created placeholder ICO (install ImageMagick for real icons)"
fi

# Create placeholder ICNS file (macOS)
echo "Creating macOS ICNS placeholder..."
touch electron/assets/icon.icns
echo "⚠ Created placeholder ICNS (use png2icns or iconutil on macOS for real icons)"

echo ""
echo "Icons created in electron/assets/"
echo "Replace these with professional icons before production release!"
