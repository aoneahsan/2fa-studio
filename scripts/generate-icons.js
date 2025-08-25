#!/usr/bin/env node

/**
 * Comprehensive Icon Generator Script for 2FA Studio
 * Generates all required icon sizes for PWA, iOS, Android, and Web platforms
 * 
 * Features:
 * - Complete iOS app icon set with Contents.json
 * - Android adaptive icons with background and foreground
 * - PWA maskable icons with safe area padding
 * - Notification icons (Android)
 * - Store-ready icons (Play Store, App Store)
 * - Favicon and web icons
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// Comprehensive icon sizes for all platforms and use cases
const iconSizes = {
  android: {
    // Launcher icons (mipmap)
    launcher: [
      { size: 48, folder: 'mipmap-mdpi', filename: 'ic_launcher.png' },
      { size: 72, folder: 'mipmap-hdpi', filename: 'ic_launcher.png' },
      { size: 96, folder: 'mipmap-xhdpi', filename: 'ic_launcher.png' },
      { size: 144, folder: 'mipmap-xxhdpi', filename: 'ic_launcher.png' },
      { size: 192, folder: 'mipmap-xxxhdpi', filename: 'ic_launcher.png' },
      // Round launcher icons
      { size: 48, folder: 'mipmap-mdpi', filename: 'ic_launcher_round.png', round: true },
      { size: 72, folder: 'mipmap-hdpi', filename: 'ic_launcher_round.png', round: true },
      { size: 96, folder: 'mipmap-xhdpi', filename: 'ic_launcher_round.png', round: true },
      { size: 144, folder: 'mipmap-xxhdpi', filename: 'ic_launcher_round.png', round: true },
      { size: 192, folder: 'mipmap-xxxhdpi', filename: 'ic_launcher_round.png', round: true },
      // Foreground icons for adaptive icons
      { size: 108, folder: 'mipmap-mdpi', filename: 'ic_launcher_foreground.png', foreground: true },
      { size: 162, folder: 'mipmap-hdpi', filename: 'ic_launcher_foreground.png', foreground: true },
      { size: 216, folder: 'mipmap-xhdpi', filename: 'ic_launcher_foreground.png', foreground: true },
      { size: 324, folder: 'mipmap-xxhdpi', filename: 'ic_launcher_foreground.png', foreground: true },
      { size: 432, folder: 'mipmap-xxxhdpi', filename: 'ic_launcher_foreground.png', foreground: true }
    ],
    // Notification icons
    notification: [
      { size: 24, folder: 'drawable-mdpi', filename: 'ic_stat_icon_config_sample.png', notification: true },
      { size: 36, folder: 'drawable-hdpi', filename: 'ic_stat_icon_config_sample.png', notification: true },
      { size: 48, folder: 'drawable-xhdpi', filename: 'ic_stat_icon_config_sample.png', notification: true },
      { size: 72, folder: 'drawable-xxhdpi', filename: 'ic_stat_icon_config_sample.png', notification: true },
      { size: 96, folder: 'drawable-xxxhdpi', filename: 'ic_stat_icon_config_sample.png', notification: true }
    ]
  },
  ios: [
    // iPhone App Icons
    { size: 120, filename: 'AppIcon-60@2x.png', type: 'app', device: 'iphone' },
    { size: 180, filename: 'AppIcon-60@3x.png', type: 'app', device: 'iphone' },
    // iPad App Icons
    { size: 152, filename: 'AppIcon-76@2x.png', type: 'app', device: 'ipad' },
    { size: 167, filename: 'AppIcon-83.5@2x.png', type: 'app', device: 'ipad' },
    // Settings Icons
    { size: 58, filename: 'AppIcon-29@2x.png', type: 'settings', device: 'iphone' },
    { size: 87, filename: 'AppIcon-29@3x.png', type: 'settings', device: 'iphone' },
    { size: 58, filename: 'AppIcon-29@2x~ipad.png', type: 'settings', device: 'ipad' },
    // Spotlight Icons
    { size: 80, filename: 'AppIcon-40@2x.png', type: 'spotlight', device: 'iphone' },
    { size: 120, filename: 'AppIcon-40@3x.png', type: 'spotlight', device: 'iphone' },
    { size: 80, filename: 'AppIcon-40@2x~ipad.png', type: 'spotlight', device: 'ipad' },
    // Notification Icons
    { size: 40, filename: 'AppIcon-20@2x.png', type: 'notification', device: 'iphone' },
    { size: 60, filename: 'AppIcon-20@3x.png', type: 'notification', device: 'iphone' },
    { size: 40, filename: 'AppIcon-20@2x~ipad.png', type: 'notification', device: 'ipad' },
    // App Store Icon
    { size: 1024, filename: 'AppIcon-512@2x.png', type: 'marketing', noAlpha: true }
  ],
  web: {
    pwa: [
      { size: 72, filename: 'icon-72x72.png' },
      { size: 96, filename: 'icon-96x96.png' },
      { size: 128, filename: 'icon-128x128.png' },
      { size: 144, filename: 'icon-144x144.png' },
      { size: 152, filename: 'icon-152x152.png' },
      { size: 192, filename: 'icon-192x192.png' },
      { size: 384, filename: 'icon-384x384.png' },
      { size: 512, filename: 'icon-512x512.png' },
      { size: 512, filename: 'icon-512x512-maskable.png', maskable: true }
    ],
    favicon: [
      { size: 16, filename: 'favicon-16x16.png' },
      { size: 32, filename: 'favicon-32x32.png' },
      { size: 192, filename: 'android-chrome-192x192.png' },
      { size: 512, filename: 'android-chrome-512x512.png' }
    ]
  }
};

// Create comprehensive 2FA Studio icon SVG
const createIconSVG = (size, options = {}) => {
  const { maskable = false, foreground = false, notification = false, round = false } = options;
  
  // Calculate dimensions based on type
  const padding = maskable ? size * 0.1 : 0;
  const iconSize = size - (padding * 2);
  const centerX = size / 2;
  const centerY = size / 2;
  
  // Colors
  const primaryColor = notification ? '#FFFFFF' : '#0EA5E9'; // White for notifications
  const secondaryColor = notification ? 'transparent' : '#FFFFFF';
  const backgroundColor = notification ? 'transparent' : primaryColor;
  
  // For foreground adaptive icons, make background transparent
  const bgColor = foreground ? 'transparent' : backgroundColor;
  const borderRadius = round ? size / 2 : size * 0.2;
  
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      ${!notification && !foreground ? `<rect width="${size}" height="${size}" fill="${bgColor}" rx="${borderRadius}"/>` : ''}
      
      <!-- Main Icon Content -->
      <g transform="translate(${padding}, ${padding})">
        <!-- Shield Background -->
        <path d="M ${iconSize/2} ${iconSize * 0.1}
                 L ${iconSize * 0.2} ${iconSize * 0.2}
                 L ${iconSize * 0.2} ${iconSize * 0.5}
                 C ${iconSize * 0.2} ${iconSize * 0.75}
                   ${iconSize/2} ${iconSize * 0.9}
                   ${iconSize/2} ${iconSize * 0.9}
                 C ${iconSize/2} ${iconSize * 0.9}
                   ${iconSize * 0.8} ${iconSize * 0.75}
                   ${iconSize * 0.8} ${iconSize * 0.5}
                 L ${iconSize * 0.8} ${iconSize * 0.2}
                 Z"
              fill="${notification ? primaryColor : secondaryColor}" 
              ${notification ? '' : 'opacity="0.95"'}/>
        
        <!-- Lock/Key Symbol -->
        <g transform="translate(${iconSize/2}, ${iconSize * 0.45})">
          <!-- Lock body -->
          <rect x="${-iconSize * 0.08}" y="${-iconSize * 0.05}" 
                width="${iconSize * 0.16}" height="${iconSize * 0.12}" 
                rx="${iconSize * 0.02}" 
                fill="${notification ? primaryColor : primaryColor}"/>
          
          <!-- Lock shackle -->
          <path d="M ${-iconSize * 0.06} ${-iconSize * 0.05}
                   L ${-iconSize * 0.06} ${-iconSize * 0.12}
                   C ${-iconSize * 0.06} ${-iconSize * 0.16}
                     ${-iconSize * 0.03} ${-iconSize * 0.18}
                     0 ${-iconSize * 0.18}
                   C ${iconSize * 0.03} ${-iconSize * 0.18}
                     ${iconSize * 0.06} ${-iconSize * 0.16}
                     ${iconSize * 0.06} ${-iconSize * 0.12}
                   L ${iconSize * 0.06} ${-iconSize * 0.05}"
                stroke="${notification ? primaryColor : primaryColor}" 
                stroke-width="${iconSize * 0.012}" 
                fill="none"/>
          
          <!-- Key hole -->
          <circle r="${iconSize * 0.015}" fill="${notification ? 'transparent' : secondaryColor}"/>
        </g>
        
        <!-- 2FA Text -->
        ${size >= 72 ? `
          <text x="${iconSize/2}" y="${iconSize * 0.75}" 
                font-family="Arial, sans-serif" 
                font-size="${Math.max(iconSize * 0.12, 8)}" 
                font-weight="bold" 
                fill="${notification ? primaryColor : secondaryColor}" 
                text-anchor="middle">2FA</text>
        ` : ''}
        
        <!-- Studio Text (for larger sizes) -->
        ${size >= 128 ? `
          <text x="${iconSize/2}" y="${iconSize * 0.85}" 
                font-family="Arial, sans-serif" 
                font-size="${Math.max(iconSize * 0.08, 6)}" 
                fill="${notification ? primaryColor : secondaryColor}" 
                text-anchor="middle" 
                opacity="0.8">Studio</text>
        ` : ''}
      </g>
    </svg>
  `;
};

// Create Contents.json for iOS App Icons
const createiOSContentsJson = () => ({
  images: [
    {
      filename: "AppIcon-20@2x.png",
      idiom: "iphone",
      scale: "2x",
      size: "20x20"
    },
    {
      filename: "AppIcon-20@3x.png",
      idiom: "iphone",
      scale: "3x",
      size: "20x20"
    },
    {
      filename: "AppIcon-29@2x.png",
      idiom: "iphone",
      scale: "2x",
      size: "29x29"
    },
    {
      filename: "AppIcon-29@3x.png",
      idiom: "iphone",
      scale: "3x",
      size: "29x29"
    },
    {
      filename: "AppIcon-40@2x.png",
      idiom: "iphone",
      scale: "2x",
      size: "40x40"
    },
    {
      filename: "AppIcon-40@3x.png",
      idiom: "iphone",
      scale: "3x",
      size: "40x40"
    },
    {
      filename: "AppIcon-60@2x.png",
      idiom: "iphone",
      scale: "2x",
      size: "60x60"
    },
    {
      filename: "AppIcon-60@3x.png",
      idiom: "iphone",
      scale: "3x",
      size: "60x60"
    },
    {
      filename: "AppIcon-20@2x~ipad.png",
      idiom: "ipad",
      scale: "1x",
      size: "20x20"
    },
    {
      filename: "AppIcon-20@2x~ipad.png",
      idiom: "ipad",
      scale: "2x",
      size: "20x20"
    },
    {
      filename: "AppIcon-29@2x~ipad.png",
      idiom: "ipad",
      scale: "1x",
      size: "29x29"
    },
    {
      filename: "AppIcon-29@2x~ipad.png",
      idiom: "ipad",
      scale: "2x",
      size: "29x29"
    },
    {
      filename: "AppIcon-40@2x~ipad.png",
      idiom: "ipad",
      scale: "1x",
      size: "40x40"
    },
    {
      filename: "AppIcon-40@2x~ipad.png",
      idiom: "ipad",
      scale: "2x",
      size: "40x40"
    },
    {
      filename: "AppIcon-76@2x.png",
      idiom: "ipad",
      scale: "1x",
      size: "76x76"
    },
    {
      filename: "AppIcon-76@2x.png",
      idiom: "ipad",
      scale: "2x",
      size: "76x76"
    },
    {
      filename: "AppIcon-83.5@2x.png",
      idiom: "ipad",
      scale: "2x",
      size: "83.5x83.5"
    },
    {
      filename: "AppIcon-512@2x.png",
      idiom: "ios-marketing",
      scale: "1x",
      size: "1024x1024"
    }
  ],
  info: {
    author: "xcode",
    version: 1
  }
});

async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

async function generateIconSet(icons, basePath, platform, category) {
  console.log(`\n📱 Generating ${platform} ${category} icons...`);
  
  for (const icon of icons) {
    const outputDir = path.join(basePath, icon.folder || '');
    await ensureDirectoryExists(outputDir);
    
    const outputPath = path.join(outputDir, icon.filename);
    
    // Create SVG with appropriate options
    const options = {
      maskable: icon.maskable,
      foreground: icon.foreground,
      notification: icon.notification,
      round: icon.round
    };
    
    const svg = createIconSVG(icon.size, options);
    
    try {
      let sharpInstance = sharp(Buffer.from(svg), { density: 300 });
      
      // Remove alpha channel for specific iOS icons
      if (icon.noAlpha) {
        sharpInstance = sharpInstance.flatten({ background: { r: 255, g: 255, b: 255 } });
      }
      
      // Apply circular mask for round icons
      if (icon.round) {
        const circularMask = Buffer.from(
          `<svg><circle r="${icon.size/2}" cx="${icon.size/2}" cy="${icon.size/2}" fill="white"/></svg>`
        );
        sharpInstance = sharpInstance.composite([{ input: circularMask, blend: 'dest-in' }]);
      }
      
      await sharpInstance
        .resize(icon.size, icon.size)
        .png()
        .toFile(outputPath);
      
      console.log(`  ✅ ${icon.filename} (${icon.size}x${icon.size})`);
    } catch (error) {
      console.error(`  ❌ Failed to generate ${icon.filename}: ${error.message}`);
    }
  }
}

async function generateIcons() {
  console.log('🎨 Generating comprehensive icons for 2FA Studio...\n');
  
  const projectRoot = path.join(__dirname, '..');
  
  // Generate Android icons
  const androidResPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
  
  for (const [category, icons] of Object.entries(iconSizes.android)) {
    await generateIconSet(icons, androidResPath, 'Android', category);
  }

  // Generate iOS icons
  const iosIconsDir = path.join(projectRoot, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
  await ensureDirectoryExists(iosIconsDir);
  
  await generateIconSet(iconSizes.ios, iosIconsDir, 'iOS', 'App');
  
  // Create Contents.json for iOS
  const contentsJson = createiOSContentsJson();
  await fs.writeFile(
    path.join(iosIconsDir, 'Contents.json'),
    JSON.stringify(contentsJson, null, 2)
  );
  console.log('  ✅ Contents.json created');

  // Generate Web/PWA icons
  const webIconsDir = path.join(projectRoot, 'public', 'icons');
  await ensureDirectoryExists(webIconsDir);
  
  for (const [category, icons] of Object.entries(iconSizes.web)) {
    await generateIconSet(icons, webIconsDir, 'Web', category);
  }

  // Create store assets directory and icons
  const storeAssetsDir = path.join(projectRoot, 'assets', 'store');
  await ensureDirectoryExists(storeAssetsDir);

  // Generate Play Store icon (512x512)
  const playStoreIcon = createIconSVG(512);
  await sharp(Buffer.from(playStoreIcon), { density: 300 })
    .resize(512, 512)
    .png()
    .toFile(path.join(storeAssetsDir, 'play-store-512.png'));
  console.log('  ✅ Play Store icon (512x512)');

  // Generate App Store icon (1024x1024)
  const appStoreIcon = createIconSVG(1024);
  await sharp(Buffer.from(appStoreIcon), { density: 300 })
    .resize(1024, 1024)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toFile(path.join(storeAssetsDir, 'app-store-1024.png'));
  console.log('  ✅ App Store icon (1024x1024)');

  // Create favicon
  console.log('\n🌐 Generating web assets...');
  const faviconIcon = createIconSVG(32);
  await sharp(Buffer.from(faviconIcon), { density: 300 })
    .resize(32, 32)
    .png()
    .toFile(path.join(projectRoot, 'public', 'favicon.ico'));
  console.log('  ✅ favicon.ico');

  // Create Apple Touch Icon
  const appleTouchIcon = createIconSVG(180);
  await sharp(Buffer.from(appleTouchIcon), { density: 300 })
    .resize(180, 180)
    .png()
    .toFile(path.join(projectRoot, 'public', 'apple-touch-icon.png'));
  console.log('  ✅ apple-touch-icon.png');

  // Generate Android adaptive icon XML files
  await generateAdaptiveIconXml(projectRoot);

  console.log('\n✅ All icons generated successfully!');
  console.log('\n📋 Generated assets:');
  console.log('   • Android: App launcher, Round, Notification, Adaptive icons');
  console.log('   • iOS: App icons for all devices and contexts');
  console.log('   • Web: PWA icons, Maskable icons, Favicons');
  console.log('   • Store: Play Store (512px), App Store (1024px)');
  console.log('\n💡 Next steps:');
  console.log('   1. Review generated icons in android/app/src/main/res/');
  console.log('   2. Review iOS icons in ios/App/App/Assets.xcassets/AppIcon.appiconset/');
  console.log('   3. Test icons on different devices');
  console.log('   4. Upload store icons for app submission');
}

async function generateAdaptiveIconXml(projectRoot) {
  console.log('\n🤖 Generating Android adaptive icon XML files...');
  
  // Create adaptive icon XML
  const adaptiveIconXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>`;

  // Create background XML
  const backgroundXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#0EA5E9"
        android:pathData="M0,0h108v108h-108z" />
</vector>`;

  const drawableDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'drawable');
  const valuesDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'values');
  const mipmapAnydpiV26Dir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'mipmap-anydpi-v26');
  
  await ensureDirectoryExists(drawableDir);
  await ensureDirectoryExists(valuesDir);
  await ensureDirectoryExists(mipmapAnydpiV26Dir);

  // Write adaptive icon files
  await fs.writeFile(path.join(mipmapAnydpiV26Dir, 'ic_launcher.xml'), adaptiveIconXml);
  await fs.writeFile(path.join(mipmapAnydpiV26Dir, 'ic_launcher_round.xml'), adaptiveIconXml);
  await fs.writeFile(path.join(drawableDir, 'ic_launcher_background.xml'), backgroundXml);
  
  // Create values for background color
  const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0EA5E9</color>
</resources>`;

  await fs.writeFile(path.join(valuesDir, 'ic_launcher_background.xml'), colorsXml);
  
  console.log('  ✅ Adaptive icon XML files created');
}

// Run the generator
if (require.main === module) {
  generateIcons().catch(console.error);
}

module.exports = { generateIcons };