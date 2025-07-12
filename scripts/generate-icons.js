#!/usr/bin/env node

/**
 * Icon Generator Script for 2FA Studio
 * Generates all required icon sizes for PWA, iOS, and Android
 */

import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define all required icon sizes
const iconSizes = {
  pwa: [
    { size: 72, name: 'icon-72x72.png' },
    { size: 96, name: 'icon-96x96.png' },
    { size: 128, name: 'icon-128x128.png' },
    { size: 144, name: 'icon-144x144.png' },
    { size: 152, name: 'icon-152x152.png' },
    { size: 192, name: 'icon-192x192.png' },
    { size: 384, name: 'icon-384x384.png' },
    { size: 512, name: 'icon-512x512.png' },
    { size: 512, name: 'icon-512x512-maskable.png', maskable: true }
  ],
  ios: [
    // iPhone
    { size: 180, name: 'ios/AppIcon-180x180.png' }, // iPhone @3x
    { size: 120, name: 'ios/AppIcon-120x120.png' }, // iPhone @2x
    { size: 87, name: 'ios/AppIcon-87x87.png' }, // iPhone @3x Settings
    { size: 58, name: 'ios/AppIcon-58x58.png' }, // iPhone @2x Settings
    // iPad
    { size: 167, name: 'ios/AppIcon-167x167.png' }, // iPad Pro
    { size: 152, name: 'ios/AppIcon-152x152.png' }, // iPad @2x
    { size: 76, name: 'ios/AppIcon-76x76.png' }, // iPad @1x
    // App Store
    { size: 1024, name: 'ios/AppIcon-1024x1024.png', noAlpha: true }
  ],
  android: [
    { size: 48, name: 'android/mipmap-mdpi/ic_launcher.png' },
    { size: 72, name: 'android/mipmap-hdpi/ic_launcher.png' },
    { size: 96, name: 'android/mipmap-xhdpi/ic_launcher.png' },
    { size: 144, name: 'android/mipmap-xxhdpi/ic_launcher.png' },
    { size: 192, name: 'android/mipmap-xxxhdpi/ic_launcher.png' },
    // Adaptive icons
    { size: 108, name: 'android/mipmap-mdpi/ic_launcher_foreground.png' },
    { size: 162, name: 'android/mipmap-hdpi/ic_launcher_foreground.png' },
    { size: 216, name: 'android/mipmap-xhdpi/ic_launcher_foreground.png' },
    { size: 324, name: 'android/mipmap-xxhdpi/ic_launcher_foreground.png' },
    { size: 432, name: 'android/mipmap-xxxhdpi/ic_launcher_foreground.png' }
  ]
};

// Create base icon SVG
const createIconSVG = (size, maskable = false) => {
  const padding = maskable ? size * 0.1 : 0;
  const iconSize = size - (padding * 2);
  const shieldSize = iconSize * 0.7;
  const keySize = iconSize * 0.4;
  
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="${size}" height="${size}" fill="#0EA5E9" rx="${size * 0.2}"/>
      
      <!-- Shield -->
      <path d="M ${size/2} ${padding + iconSize * 0.15}
               L ${size/2 - shieldSize/2} ${padding + iconSize * 0.25}
               L ${size/2 - shieldSize/2} ${padding + iconSize * 0.5}
               C ${size/2 - shieldSize/2} ${padding + iconSize * 0.75}
                 ${size/2} ${padding + iconSize * 0.85}
                 ${size/2} ${padding + iconSize * 0.85}
               C ${size/2} ${padding + iconSize * 0.85}
                 ${size/2 + shieldSize/2} ${padding + iconSize * 0.75}
                 ${size/2 + shieldSize/2} ${padding + iconSize * 0.5}
               L ${size/2 + shieldSize/2} ${padding + iconSize * 0.25}
               Z"
            fill="white" opacity="0.9"/>
      
      <!-- Key -->
      <g transform="translate(${size/2}, ${size/2})">
        <circle r="${keySize * 0.3}" fill="#0EA5E9"/>
        <rect x="0" y="0" width="${keySize * 0.1}" height="${keySize * 0.5}" fill="#0EA5E9"/>
        <rect x="${keySize * 0.2}" y="${keySize * 0.3}" width="${keySize * 0.15}" height="${keySize * 0.1}" fill="#0EA5E9"/>
        <rect x="${keySize * 0.2}" y="${keySize * 0.45}" width="${keySize * 0.1}" height="${keySize * 0.1}" fill="#0EA5E9"/>
      </g>
      
      <!-- 2FA Text -->
      <text x="${size/2}" y="${size * 0.75}" 
            font-family="Arial, sans-serif" 
            font-size="${iconSize * 0.15}" 
            font-weight="bold" 
            fill="white" 
            text-anchor="middle">2FA</text>
    </svg>
  `;
};

async function generateIcons() {
  console.log('🎨 Generating icons for 2FA Studio...\n');
  
  // Create output directories
  const dirs = [
    'public/icons',
    'public/icons/ios',
    'public/icons/android/mipmap-mdpi',
    'public/icons/android/mipmap-hdpi',
    'public/icons/android/mipmap-xhdpi',
    'public/icons/android/mipmap-xxhdpi',
    'public/icons/android/mipmap-xxxhdpi'
  ];
  
  for (const dir of dirs) {
    await fs.mkdir(path.join(process.cwd(), dir), { recursive: true });
  }
  
  // Generate icons for each platform
  for (const platform of ['pwa', 'ios', 'android']) {
    console.log(`\n📱 Generating ${platform.toUpperCase()} icons...`);
    
    for (const icon of iconSizes[platform]) {
      const svg = createIconSVG(icon.size, icon.maskable);
      const outputPath = path.join(
        process.cwd(),
        'public/icons',
        icon.name
      );
      
      try {
        const buffer = Buffer.from(svg);
        let sharpInstance = sharp(buffer, { density: 300 });
        
        // Remove alpha channel for iOS App Store icon
        if (icon.noAlpha) {
          sharpInstance = sharpInstance.flatten({ background: { r: 255, g: 255, b: 255 } });
        }
        
        await sharpInstance
          .resize(icon.size, icon.size)
          .png()
          .toFile(outputPath);
          
        console.log(`  ✅ ${icon.name} (${icon.size}x${icon.size})`);
      } catch (error) {
        console.error(`  ❌ Failed to generate ${icon.name}: ${error.message}`);
      }
    }
  }
  
  // Create favicon
  console.log('\n🌟 Generating favicon...');
  const faviconSvg = createIconSVG(32);
  await sharp(Buffer.from(faviconSvg), { density: 300 })
    .resize(32, 32)
    .toFile(path.join(process.cwd(), 'public/favicon.ico'));
  console.log('  ✅ favicon.ico (32x32)');
  
  console.log('\n✨ Icon generation complete!');
}

// Run the generator
generateIcons().catch(console.error);