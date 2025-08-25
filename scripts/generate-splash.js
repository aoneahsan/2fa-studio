#!/usr/bin/env node

/**
 * Comprehensive Splash Screen Generator Script for 2FA Studio
 * Generates all required splash screen sizes for iOS and Android platforms
 * 
 * Features:
 * - iOS splash screens for all devices and orientations
 * - Android splash screens for all densities and orientations  
 * - Adaptive splash screens with safe areas
 * - Brand-consistent design with 2FA Studio branding
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// Comprehensive splash screen dimensions for all platforms
const splashSizes = {
  android: {
    portrait: [
      { width: 320, height: 480, folder: 'drawable-port-mdpi', filename: 'splash.png' },
      { width: 480, height: 800, folder: 'drawable-port-hdpi', filename: 'splash.png' },
      { width: 720, height: 1280, folder: 'drawable-port-xhdpi', filename: 'splash.png' },
      { width: 960, height: 1600, folder: 'drawable-port-xxhdpi', filename: 'splash.png' },
      { width: 1280, height: 1920, folder: 'drawable-port-xxxhdpi', filename: 'splash.png' }
    ],
    landscape: [
      { width: 480, height: 320, folder: 'drawable-land-mdpi', filename: 'splash.png' },
      { width: 800, height: 480, folder: 'drawable-land-hdpi', filename: 'splash.png' },
      { width: 1280, height: 720, folder: 'drawable-land-xhdpi', filename: 'splash.png' },
      { width: 1600, height: 960, folder: 'drawable-land-xxhdpi', filename: 'splash.png' },
      { width: 1920, height: 1280, folder: 'drawable-land-xxxhdpi', filename: 'splash.png' }
    ],
    // Default splash (square-ish for adaptive)
    default: [
      { width: 2732, height: 2732, folder: 'drawable', filename: 'splash.png' }
    ]
  },
  ios: {
    universal: [
      { width: 2732, height: 2732, filename: 'splash-2732x2732.png' },
      { width: 2732, height: 2732, filename: 'splash-2732x2732-1.png' },
      { width: 2732, height: 2732, filename: 'splash-2732x2732-2.png' }
    ]
  }
};

// Create comprehensive 2FA Studio splash screen SVG
const createSplashSVG = (width, height, options = {}) => {
  const { darkMode = false } = options;
  
  // Color scheme
  const backgroundColor = darkMode ? '#1F2937' : '#FFFFFF';
  const primaryColor = '#0EA5E9';
  const textColor = darkMode ? '#FFFFFF' : '#1F2937';
  const subtleColor = darkMode ? '#9CA3AF' : '#6B7280';
  
  // Calculate responsive dimensions
  const minDimension = Math.min(width, height);
  const isLandscape = width > height;
  
  // Logo and text sizing
  const logoSize = Math.min(minDimension * 0.25, 150);
  const titleFontSize = Math.min(minDimension * 0.08, 48);
  const subtitleFontSize = Math.min(minDimension * 0.04, 24);
  const taglineFontSize = Math.min(minDimension * 0.025, 16);
  
  // Layout positioning
  const centerX = width / 2;
  const centerY = height / 2;
  const logoY = centerY - logoSize * 0.6;
  const titleY = logoY + logoSize * 1.2;
  const subtitleY = titleY + titleFontSize * 1.2;
  const taglineY = subtitleY + subtitleFontSize * 1.5;
  
  // Safe area considerations for notched devices
  const safeAreaBottom = isLandscape ? 21 : 34;
  
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="${backgroundColor}"/>
      
      <!-- Subtle background pattern -->
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${subtleColor}" stroke-width="0.5" opacity="0.1"/>
        </pattern>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#grid)" opacity="0.3"/>
      
      <!-- Main logo/brand container -->
      <g transform="translate(${centerX}, ${logoY})">
        <!-- Shield background -->
        <path d="M 0 ${-logoSize * 0.4}
                 L ${-logoSize * 0.35} ${-logoSize * 0.25}
                 L ${-logoSize * 0.35} ${logoSize * 0.1}
                 C ${-logoSize * 0.35} ${logoSize * 0.35}
                   0 ${logoSize * 0.5}
                   0 ${logoSize * 0.5}
                 C 0 ${logoSize * 0.5}
                   ${logoSize * 0.35} ${logoSize * 0.35}
                   ${logoSize * 0.35} ${logoSize * 0.1}
                 L ${logoSize * 0.35} ${-logoSize * 0.25}
                 Z"
              fill="${primaryColor}"
              opacity="0.9"/>
        
        <!-- Lock/Security symbol -->
        <g transform="translate(0, ${logoSize * 0.05})">
          <!-- Lock body -->
          <rect x="${-logoSize * 0.12}" y="${-logoSize * 0.08}" 
                width="${logoSize * 0.24}" height="${logoSize * 0.16}" 
                rx="${logoSize * 0.03}" 
                fill="white"/>
          
          <!-- Lock shackle -->
          <path d="M ${-logoSize * 0.08} ${-logoSize * 0.08}
                   L ${-logoSize * 0.08} ${-logoSize * 0.18}
                   C ${-logoSize * 0.08} ${-logoSize * 0.24}
                     ${-logoSize * 0.04} ${-logoSize * 0.28}
                     0 ${-logoSize * 0.28}
                   C ${logoSize * 0.04} ${-logoSize * 0.28}
                     ${logoSize * 0.08} ${-logoSize * 0.24}
                     ${logoSize * 0.08} ${-logoSize * 0.18}
                   L ${logoSize * 0.08} ${-logoSize * 0.08}"
                stroke="white" 
                stroke-width="${logoSize * 0.02}" 
                fill="none"/>
          
          <!-- Key hole -->
          <circle r="${logoSize * 0.025}" fill="${primaryColor}"/>
        </g>
      </g>
      
      <!-- Brand text -->
      <text x="${centerX}" y="${titleY}" 
            font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
            font-size="${titleFontSize}" 
            font-weight="700" 
            fill="${textColor}" 
            text-anchor="middle">2FA Studio</text>
      
      <!-- Subtitle -->
      <text x="${centerX}" y="${subtitleY}" 
            font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
            font-size="${subtitleFontSize}" 
            font-weight="500" 
            fill="${subtleColor}" 
            text-anchor="middle">Secure Authentication</text>
      
      <!-- Tagline -->
      <text x="${centerX}" y="${taglineY}" 
            font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
            font-size="${taglineFontSize}" 
            font-weight="400" 
            fill="${subtleColor}" 
            text-anchor="middle" 
            opacity="0.8">Your trusted two-factor authentication companion</text>
      
      <!-- Loading indicator -->
      <g transform="translate(${centerX}, ${height - safeAreaBottom - 60})">
        <circle r="3" fill="${primaryColor}" opacity="0.3"/>
        <circle r="3" fill="${primaryColor}" opacity="0.3" cx="12"/>
        <circle r="3" fill="${primaryColor}" opacity="0.3" cx="24"/>
      </g>
      
      <!-- Version indicator -->
      <text x="${width - 20}" y="${height - safeAreaBottom - 10}" 
            font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
            font-size="10" 
            fill="${subtleColor}" 
            text-anchor="end" 
            opacity="0.5">v1.0.0</text>
    </svg>
  `;
};

async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

async function generateSplashSet(splashes, basePath, platform, category) {
  console.log(`\n🎨 Generating ${platform} ${category} splash screens...`);
  
  for (const splash of splashes) {
    const outputDir = path.join(basePath, splash.folder || '');
    await ensureDirectoryExists(outputDir);
    
    const outputPath = path.join(outputDir, splash.filename);
    
    // Create SVG for this splash screen
    const isLandscape = splash.width > splash.height;
    const isDarkMode = splash.filename.includes('dark') || splash.filename.includes('Dark');
    
    const svg = createSplashSVG(splash.width, splash.height, {
      darkMode: isDarkMode
    });
    
    try {
      await sharp(Buffer.from(svg), { density: 300 })
        .resize(splash.width, splash.height)
        .png()
        .toFile(outputPath);
      
      console.log(`  ✅ ${splash.filename} (${splash.width}x${splash.height}) ${isLandscape ? 'landscape' : 'portrait'}`);
    } catch (error) {
      console.error(`  ❌ Failed to generate ${splash.filename}: ${error.message}`);
    }
  }
}

async function generateSplashScreens() {
  console.log('🌟 Generating comprehensive splash screens for 2FA Studio...\n');
  
  const projectRoot = path.join(__dirname, '..');
  
  // Generate Android splash screens
  const androidResPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
  
  for (const [orientation, splashes] of Object.entries(splashSizes.android)) {
    await generateSplashSet(splashes, androidResPath, 'Android', orientation);
  }

  // Generate iOS splash screens
  const iosImagesDir = path.join(projectRoot, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');
  await ensureDirectoryExists(iosImagesDir);
  
  await generateSplashSet(splashSizes.ios.universal, iosImagesDir, 'iOS', 'Universal');

  // Create Contents.json for iOS splash screens
  const iosContentsJson = {
    images: [
      {
        idiom: "universal",
        filename: "splash-2732x2732.png",
        scale: "1x"
      },
      {
        idiom: "universal",
        filename: "splash-2732x2732-1.png",
        scale: "2x"
      },
      {
        idiom: "universal",
        filename: "splash-2732x2732-2.png",
        scale: "3x"
      }
    ],
    info: {
      version: 1,
      author: "xcode"
    }
  };
  
  await fs.writeFile(
    path.join(iosImagesDir, 'Contents.json'),
    JSON.stringify(iosContentsJson, null, 2)
  );
  console.log('  ✅ iOS Contents.json created');

  // Generate web splash screen for PWA
  console.log('\n🌐 Generating web splash screen...');
  const webSplashDir = path.join(projectRoot, 'public');
  const webSplashSvg = createSplashSVG(1920, 1080);
  
  await sharp(Buffer.from(webSplashSvg), { density: 300 })
    .resize(1920, 1080)
    .png()
    .toFile(path.join(webSplashDir, 'splash-screen.png'));
  
  console.log('  ✅ Web splash screen generated (1920x1080)');

  console.log('\n✅ All splash screens generated successfully!');
  console.log('\n📋 Generated assets:');
  console.log('   • Android: Portrait and landscape for all densities');
  console.log('   • iOS: Universal splash with multiple scales');
  console.log('   • Web: PWA splash screen');
  console.log('\n💡 Next steps:');
  console.log('   1. Review splash screens in android/app/src/main/res/drawable-*');
  console.log('   2. Review iOS splash in ios/App/App/Assets.xcassets/Splash.imageset/');
  console.log('   3. Test splash screens on different devices and orientations');
  console.log('   4. Customize colors and branding as needed');
}

// Run the generator
if (require.main === module) {
  generateSplashScreens().catch(console.error);
}

module.exports = { generateSplashScreens };