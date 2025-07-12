#!/usr/bin/env node

/**
 * Splash Screen Generator Script for 2FA Studio
 * Generates all required splash screen sizes for iOS and Android
 */

import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

// Define splash screen sizes
const splashSizes = {
  ios: [
    // iPhone
    { width: 640, height: 1136, name: 'Default-568h@2x~iphone.png' }, // iPhone 5
    { width: 750, height: 1334, name: 'Default-667h.png' }, // iPhone 6/7/8
    { width: 1242, height: 2208, name: 'Default-736h.png' }, // iPhone 6+/7+/8+
    { width: 1125, height: 2436, name: 'Default-2436h.png' }, // iPhone X/XS
    { width: 1242, height: 2688, name: 'Default-2688h.png' }, // iPhone XS Max
    { width: 828, height: 1792, name: 'Default-1792h.png' }, // iPhone XR
    { width: 1170, height: 2532, name: 'Default-2532h.png' }, // iPhone 12/13 Pro
    { width: 1284, height: 2778, name: 'Default-2778h.png' }, // iPhone 12/13 Pro Max
    { width: 1179, height: 2556, name: 'Default-2556h.png' }, // iPhone 14/15
    { width: 1290, height: 2796, name: 'Default-2796h.png' }, // iPhone 14/15 Plus
    // iPad
    { width: 1536, height: 2048, name: 'Default-Portrait@2x~ipad.png' }, // iPad Portrait
    { width: 2048, height: 1536, name: 'Default-Landscape@2x~ipad.png' }, // iPad Landscape
    { width: 2048, height: 2732, name: 'Default-Portrait@2x~ipadpro.png' }, // iPad Pro Portrait
    { width: 2732, height: 2048, name: 'Default-Landscape@2x~ipadpro.png' } // iPad Pro Landscape
  ],
  android: [
    { width: 320, height: 480, name: 'drawable-ldpi/splash.png' },
    { width: 480, height: 800, name: 'drawable-mdpi/splash.png' },
    { width: 720, height: 1280, name: 'drawable-hdpi/splash.png' },
    { width: 960, height: 1600, name: 'drawable-xhdpi/splash.png' },
    { width: 1280, height: 1920, name: 'drawable-xxhdpi/splash.png' },
    { width: 1920, height: 2880, name: 'drawable-xxxhdpi/splash.png' }
  ]
};

// Create splash screen SVG
const createSplashSVG = (width, height) => {
  const iconSize = Math.min(width, height) * 0.25;
  const shieldSize = iconSize * 0.7;
  
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background gradient -->
      <defs>
        <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0EA5E9;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0284C7;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg-gradient)"/>
      
      <!-- Shield Icon -->
      <g transform="translate(${width/2}, ${height/2})">
        <!-- Shield -->
        <path d="M 0 ${-iconSize * 0.35}
                 L ${-shieldSize/2} ${-iconSize * 0.25}
                 L ${-shieldSize/2} ${iconSize * 0}
                 C ${-shieldSize/2} ${iconSize * 0.25}
                   0 ${iconSize * 0.35}
                   0 ${iconSize * 0.35}
                 C 0 ${iconSize * 0.35}
                   ${shieldSize/2} ${iconSize * 0.25}
                   ${shieldSize/2} ${iconSize * 0}
                 L ${shieldSize/2} ${-iconSize * 0.25}
                 Z"
              fill="white" opacity="0.95"/>
        
        <!-- Key inside shield -->
        <circle cx="0" cy="${-iconSize * 0.05}" r="${iconSize * 0.12}" fill="#0EA5E9"/>
        <rect x="-${iconSize * 0.02}" y="${-iconSize * 0.05}" width="${iconSize * 0.04}" height="${iconSize * 0.2}" fill="#0EA5E9"/>
        <rect x="${iconSize * 0.08}" y="${iconSize * 0.08}" width="${iconSize * 0.06}" height="${iconSize * 0.04}" fill="#0EA5E9"/>
        <rect x="${iconSize * 0.08}" y="${iconSize * 0.13}" width="${iconSize * 0.04}" height="${iconSize * 0.04}" fill="#0EA5E9"/>
      </g>
      
      <!-- App Name -->
      <text x="${width/2}" y="${height/2 + iconSize * 0.7}" 
            font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
            font-size="${iconSize * 0.3}" 
            font-weight="600" 
            fill="white" 
            text-anchor="middle">2FA Studio</text>
      
      <!-- Tagline -->
      <text x="${width/2}" y="${height/2 + iconSize * 0.9}" 
            font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
            font-size="${iconSize * 0.12}" 
            font-weight="400" 
            fill="white" 
            opacity="0.8"
            text-anchor="middle">Secure Two-Factor Authentication</text>
    </svg>
  `;
};

async function generateSplashScreens() {
  console.log('🎨 Generating splash screens for 2FA Studio...\n');
  
  // Create output directories
  const dirs = [
    'public/splash',
    'public/splash/ios',
    'public/splash/android/drawable-ldpi',
    'public/splash/android/drawable-mdpi',
    'public/splash/android/drawable-hdpi',
    'public/splash/android/drawable-xhdpi',
    'public/splash/android/drawable-xxhdpi',
    'public/splash/android/drawable-xxxhdpi'
  ];
  
  for (const dir of dirs) {
    await fs.mkdir(path.join(process.cwd(), dir), { recursive: true });
  }
  
  // Generate splash screens for each platform
  for (const platform of ['ios', 'android']) {
    console.log(`\n📱 Generating ${platform.toUpperCase()} splash screens...`);
    
    for (const splash of splashSizes[platform]) {
      const svg = createSplashSVG(splash.width, splash.height);
      const outputPath = path.join(
        process.cwd(),
        'public/splash',
        platform,
        splash.name
      );
      
      try {
        await sharp(Buffer.from(svg), { density: 300 })
          .resize(splash.width, splash.height)
          .png()
          .toFile(outputPath);
          
        console.log(`  ✅ ${splash.name} (${splash.width}x${splash.height})`);
      } catch (error) {
        console.error(`  ❌ Failed to generate ${splash.name}: ${error.message}`);
      }
    }
  }
  
  console.log('\n✨ Splash screen generation complete!');
}

// Run the generator
generateSplashScreens().catch(console.error);