/**
 * Comprehensive Icon Utilities
 * Provides processing, validation, optimization, and utility functions for the icon system
 */

import { 
  IconFormat, 
  IconSize, 
  IconTheme, 
  CustomIcon, 
  ServiceIcon, 
  IconProcessing, 
  ProcessingOperation,
  IconQuality,
  QualityCheck,
  QualityFactor,
  BrandInfo,
  IconTransformation
} from '@/types/icon';

// Constants
export const SUPPORTED_FORMATS: IconFormat[] = ['svg', 'png', 'jpg', 'webp', 'ico', 'gif'];
export const SUPPORTED_SIZES: IconSize[] = ['16x16', '24x24', '32x32', '48x48', '64x64', '128x128', '256x256', '512x512', 'vector'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const OPTIMAL_SIZES = {
  mobile: '48x48',
  desktop: '64x64',
  high_res: '128x128'
} as const;

// Brand Colors Database (Popular Services)
export const BRAND_COLORS: Record<string, BrandInfo> = {
  'google': {
    officialName: 'Google',
    primaryColor: '#4285F4',
    secondaryColor: '#EA4335',
    colorPalette: ['#4285F4', '#EA4335', '#FBBC05', '#34A853'],
    guidelinesCompliant: true,
    usagePermissions: {
      commercial: true,
      modifiable: false,
      attributionRequired: false,
      license: 'Google Brand Guidelines',
      restrictions: ['Cannot modify logo', 'Must maintain proper spacing']
    },
    officialResources: []
  },
  'github': {
    officialName: 'GitHub',
    primaryColor: '#181717',
    secondaryColor: '#f0f6ff',
    colorPalette: ['#181717', '#f0f6ff', '#0969da'],
    guidelinesCompliant: true,
    usagePermissions: {
      commercial: true,
      modifiable: false,
      attributionRequired: false,
      license: 'GitHub Logo Policy',
      restrictions: ['Cannot alter the Octocat or GitHub logo']
    },
    officialResources: []
  },
  'microsoft': {
    officialName: 'Microsoft',
    primaryColor: '#0078D4',
    secondaryColor: '#106ebe',
    colorPalette: ['#0078D4', '#106ebe', '#005a9e', '#004578'],
    guidelinesCompliant: true,
    usagePermissions: {
      commercial: true,
      modifiable: false,
      attributionRequired: false,
      license: 'Microsoft Brand Guidelines',
      restrictions: ['Must use official colors', 'Cannot distort logo']
    },
    officialResources: []
  },
  'amazon': {
    officialName: 'Amazon',
    primaryColor: '#FF9900',
    secondaryColor: '#146EB4',
    colorPalette: ['#FF9900', '#146EB4', '#232F3E'],
    guidelinesCompliant: true,
    usagePermissions: {
      commercial: true,
      modifiable: false,
      attributionRequired: false,
      license: 'Amazon Brand Guidelines',
      restrictions: ['Cannot modify smile logo', 'Must maintain proportions']
    },
    officialResources: []
  },
  'facebook': {
    officialName: 'Meta (Facebook)',
    primaryColor: '#1877F2',
    secondaryColor: '#42B883',
    colorPalette: ['#1877F2', '#42B883', '#E4E6EA'],
    guidelinesCompliant: true,
    usagePermissions: {
      commercial: true,
      modifiable: false,
      attributionRequired: false,
      license: 'Meta Brand Resources',
      restrictions: ['Must use current branding', 'Cannot use deprecated Facebook blue']
    },
    officialResources: []
  },
  'twitter': {
    officialName: 'X (formerly Twitter)',
    primaryColor: '#000000',
    secondaryColor: '#1DA1F2',
    colorPalette: ['#000000', '#1DA1F2', '#14171A'],
    guidelinesCompliant: true,
    usagePermissions: {
      commercial: true,
      modifiable: false,
      attributionRequired: false,
      license: 'X Brand Guidelines',
      restrictions: ['Must use new X branding where applicable']
    },
    officialResources: []
  },
  'linkedin': {
    officialName: 'LinkedIn',
    primaryColor: '#0A66C2',
    secondaryColor: '#004182',
    colorPalette: ['#0A66C2', '#004182', '#378fe9'],
    guidelinesCompliant: true,
    usagePermissions: {
      commercial: true,
      modifiable: false,
      attributionRequired: false,
      license: 'LinkedIn Brand Guidelines',
      restrictions: ['Cannot alter LinkedIn logo', 'Must maintain minimum size requirements']
    },
    officialResources: []
  },
  'dropbox': {
    officialName: 'Dropbox',
    primaryColor: '#0061FF',
    secondaryColor: '#1E1919',
    colorPalette: ['#0061FF', '#1E1919', '#F7F5F2'],
    guidelinesCompliant: true,
    usagePermissions: {
      commercial: true,
      modifiable: false,
      attributionRequired: false,
      license: 'Dropbox Brand Guidelines',
      restrictions: ['Cannot modify the Dropbox logo or brand elements']
    },
    officialResources: []
  },
  'slack': {
    officialName: 'Slack',
    primaryColor: '#4A154B',
    secondaryColor: '#ECB22E',
    colorPalette: ['#4A154B', '#ECB22E', '#E01E5A', '#36C5F0'],
    guidelinesCompliant: true,
    usagePermissions: {
      commercial: true,
      modifiable: false,
      attributionRequired: false,
      license: 'Slack Brand Guidelines',
      restrictions: ['Cannot alter the octothorpe', 'Must maintain color integrity']
    },
    officialResources: []
  },
  'discord': {
    officialName: 'Discord',
    primaryColor: '#5865F2',
    secondaryColor: '#57F287',
    colorPalette: ['#5865F2', '#57F287', '#FEE75C', '#ED4245'],
    guidelinesCompliant: true,
    usagePermissions: {
      commercial: true,
      modifiable: false,
      attributionRequired: false,
      license: 'Discord Brand Guidelines',
      restrictions: ['Cannot modify Clyde logo', 'Must use approved color combinations']
    },
    officialResources: []
  }
};

/**
 * Icon Validation Utilities
 */
export class IconValidator {
  /**
   * Validate file format
   */
  static validateFormat(file: File): boolean {
    const format = this.getFormatFromMimeType(file.type);
    return SUPPORTED_FORMATS.includes(format);
  }

  /**
   * Validate file size
   */
  static validateSize(file: File, maxSize: number = MAX_FILE_SIZE): boolean {
    return file.size <= maxSize;
  }

  /**
   * Validate image dimensions
   */
  static async validateDimensions(
    file: File, 
    maxWidth: number = 1024, 
    maxHeight: number = 1024
  ): Promise<{ valid: boolean; dimensions: { width: number; height: number } }> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        const valid = img.width <= maxWidth && img.height <= maxHeight;
        resolve({
          valid,
          dimensions: { width: img.width, height: img.height }
        });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ valid: false, dimensions: { width: 0, height: 0 } });
      };
      
      img.src = url;
    });
  }

  /**
   * Comprehensive file validation
   */
  static async validateFile(file: File): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    details: {
      format: IconFormat;
      size: number;
      dimensions: { width: number; height: number };
    };
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Format validation
    if (!this.validateFormat(file)) {
      errors.push(`Unsupported format. Supported: ${SUPPORTED_FORMATS.join(', ')}`);
    }
    
    // Size validation
    if (!this.validateSize(file)) {
      errors.push(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    
    // Dimensions validation
    const dimensionsResult = await this.validateDimensions(file);
    if (!dimensionsResult.valid) {
      errors.push('Invalid image dimensions or corrupted file');
    }
    
    // Recommendations
    if (file.size > 1024 * 1024) { // 1MB
      warnings.push('Large file size may affect performance');
    }
    
    if (dimensionsResult.dimensions.width !== dimensionsResult.dimensions.height) {
      warnings.push('Non-square images may not display optimally');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      details: {
        format: this.getFormatFromMimeType(file.type),
        size: file.size,
        dimensions: dimensionsResult.dimensions
      }
    };
  }

  /**
   * Get format from MIME type
   */
  static getFormatFromMimeType(mimeType: string): IconFormat {
    const mimeMap: Record<string, IconFormat> = {
      'image/svg+xml': 'svg',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
      'image/x-icon': 'ico',
      'image/vnd.microsoft.icon': 'ico',
      'image/gif': 'gif'
    };
    
    return mimeMap[mimeType] || 'png';
  }

  /**
   * Validate icon URL
   */
  static async validateUrl(url: string): Promise<{
    valid: boolean;
    error?: string;
    contentType?: string;
    size?: number;
  }> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      
      if (!response.ok) {
        return { valid: false, error: 'URL not accessible' };
      }
      
      const contentType = response.headers.get('content-type') || '';
      const size = parseInt(response.headers.get('content-length') || '0');
      
      if (!contentType.startsWith('image/')) {
        return { valid: false, error: 'URL does not point to an image' };
      }
      
      if (size > MAX_FILE_SIZE) {
        return { valid: false, error: 'Image too large' };
      }
      
      return { valid: true, contentType, size };
    } catch (error) {
      return { valid: false, error: 'Failed to validate URL' };
    }
  }
}

/**
 * Icon Processing Utilities
 */
export class IconProcessor {
  /**
   * Process uploaded icon
   */
  static async processIcon(file: File): Promise<{
    processed: boolean;
    result?: string;
    processing: IconProcessing;
    error?: string;
  }> {
    const operations: ProcessingOperation[] = [];
    const startTime = Date.now();
    
    try {
      // Validation
      const validation = await IconValidator.validateFile(file);
      if (!validation.valid) {
        return {
          processed: false,
          processing: {
            status: 'failed',
            operations,
            errors: validation.errors,
            originalDimensions: validation.details.dimensions,
            processedDimensions: validation.details.dimensions
          },
          error: validation.errors.join(', ')
        };
      }
      
      let result = await this.fileToDataURL(file);
      const originalSize = file.size;
      let currentSize = originalSize;
      
      // Resize if too large
      if (validation.details.dimensions.width > 512 || validation.details.dimensions.height > 512) {
        const resizeStart = Date.now();
        result = await this.resizeImage(result, 512, 512);
        const resizeEnd = Date.now();
        
        operations.push({
          type: 'resize',
          parameters: { maxWidth: 512, maxHeight: 512 },
          result: 'success',
          duration: resizeEnd - resizeStart,
          sizeBefore: currentSize,
          sizeAfter: result.length
        });
        
        currentSize = result.length;
      }
      
      // Optimize (if not SVG)
      if (validation.details.format !== 'svg') {
        const optimizeStart = Date.now();
        const optimized = await this.optimizeImage(result, validation.details.format);
        const optimizeEnd = Date.now();
        
        if (optimized.length < result.length) {
          result = optimized;
          operations.push({
            type: 'optimize',
            parameters: { quality: 0.85 },
            result: 'success',
            duration: optimizeEnd - optimizeStart,
            sizeBefore: currentSize,
            sizeAfter: result.length
          });
        }
      }
      
      return {
        processed: true,
        result,
        processing: {
          status: 'completed',
          processedAt: Date.now(),
          operations,
          errors: [],
          originalDimensions: validation.details.dimensions,
          processedDimensions: await this.getImageDimensions(result)
        }
      };
    } catch (error) {
      return {
        processed: false,
        processing: {
          status: 'failed',
          operations,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          originalDimensions: { width: 0, height: 0 },
          processedDimensions: { width: 0, height: 0 }
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Convert file to data URL
   */
  static fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Resize image
   */
  static async resizeImage(dataUrl: string, maxWidth: number, maxHeight: number): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        // Calculate new dimensions
        let { width, height } = img;
        const aspectRatio = width / height;
        
        if (width > maxWidth) {
          width = maxWidth;
          height = width / aspectRatio;
        }
        
        if (height > maxHeight) {
          height = maxHeight;
          width = height * aspectRatio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL('image/png', 0.9));
      };
      img.src = dataUrl;
    });
  }

  /**
   * Optimize image quality
   */
  static async optimizeImage(dataUrl: string, format: IconFormat): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        ctx.drawImage(img, 0, 0);
        
        // Optimize based on format
        let quality = 0.85;
        let mimeType = 'image/png';
        
        switch (format) {
          case 'jpg':
            mimeType = 'image/jpeg';
            quality = 0.8;
            break;
          case 'webp':
            mimeType = 'image/webp';
            quality = 0.8;
            break;
          case 'png':
            mimeType = 'image/png';
            quality = 0.9;
            break;
        }
        
        resolve(canvas.toDataURL(mimeType, quality));
      };
      img.src = dataUrl;
    });
  }

  /**
   * Get image dimensions from data URL
   */
  static async getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = dataUrl;
    });
  }

  /**
   * Apply theme transformations
   */
  static applyThemeTransformation(
    iconData: string, 
    theme: IconTheme, 
    transformations: IconTransformation[]
  ): string {
    if (theme === 'auto' || theme === 'colorful') {
      return iconData; // No transformation needed
    }
    
    const relevantTransformations = transformations.filter(t => 
      t.type === 'filter' && t.cssFilter
    );
    
    // For data URLs, we'd need to create a canvas and apply filters
    // This is a simplified implementation
    return iconData;
  }
}

/**
 * Icon Quality Assessment
 */
export class IconQualityAssessor {
  /**
   * Assess icon quality
   */
  static async assessQuality(icon: ServiceIcon | CustomIcon): Promise<IconQuality> {
    const factors: QualityFactor[] = [];
    const checks: QualityCheck[] = [];
    
    // Format quality
    if ('variants' in icon) {
      const formatFactor = this.assessFormatQuality(icon);
      factors.push(formatFactor);
    }
    
    // Brand compliance (for service icons)
    if ('brand' in icon) {
      const brandFactor = this.assessBrandCompliance(icon as ServiceIcon);
      factors.push(brandFactor);
    }
    
    // Accessibility
    if ('variants' in icon) {
      const accessibilityCheck = await this.checkAccessibility(icon);
      checks.push(accessibilityCheck);
    }
    
    // File size optimization
    const sizeCheck = this.checkFileSize(icon);
    checks.push(sizeCheck);
    
    // Calculate overall score
    const factorScore = factors.length > 0 
      ? factors.reduce((sum, f) => sum + (f.score * f.weight), 0) / factors.reduce((sum, f) => sum + f.weight, 0)
      : 0;
    
    const checkScore = checks.length > 0
      ? checks.reduce((sum, c) => sum + c.score, 0) / checks.length
      : 0;
    
    const overallScore = Math.round((factorScore + checkScore) / 2);
    
    return {
      score: overallScore,
      factors,
      verified: false,
      automaticChecks: checks
    };
  }

  /**
   * Assess format quality
   */
  private static assessFormatQuality(icon: ServiceIcon): QualityFactor {
    const hasVectorFormat = icon.variants.some(v => v.format === 'svg');
    const hasMultipleSizes = new Set(icon.variants.map(v => v.size)).size > 3;
    const hasWebp = icon.variants.some(v => v.format === 'webp');
    
    let score = 50; // Base score
    
    if (hasVectorFormat) score += 25;
    if (hasMultipleSizes) score += 15;
    if (hasWebp) score += 10;
    
    return {
      name: 'Format Quality',
      score: Math.min(score, 100),
      weight: 0.3,
      description: 'Availability of vector formats and multiple sizes'
    };
  }

  /**
   * Assess brand compliance
   */
  private static assessBrandCompliance(icon: ServiceIcon): QualityFactor {
    let score = 50; // Base score
    
    if (icon.brand.guidelinesCompliant) score += 30;
    if (icon.brand.primaryColor) score += 10;
    if (icon.brand.colorPalette.length > 1) score += 10;
    
    return {
      name: 'Brand Compliance',
      score: Math.min(score, 100),
      weight: 0.4,
      description: 'Adherence to official brand guidelines'
    };
  }

  /**
   * Check accessibility
   */
  private static async checkAccessibility(icon: ServiceIcon): Promise<QualityCheck> {
    let score = 50;
    const suggestions: string[] = [];
    
    // Check for alt text
    if (icon.metadata.altText) {
      score += 20;
    } else {
      suggestions.push('Add descriptive alt text');
    }
    
    // Check for high contrast variant
    const hasHighContrast = icon.variants.some(v => v.theme === 'high-contrast');
    if (hasHighContrast) {
      score += 15;
    } else {
      suggestions.push('Consider adding high contrast variant');
    }
    
    // Check for multiple themes
    const themes = new Set(icon.variants.map(v => v.theme));
    if (themes.size > 2) {
      score += 15;
    } else {
      suggestions.push('Add light and dark theme variants');
    }
    
    return {
      name: 'Accessibility Check',
      passed: score >= 70,
      score,
      timestamp: Date.now(),
      details: 'Accessibility compliance assessment',
      suggestions
    };
  }

  /**
   * Check file size optimization
   */
  private static checkFileSize(icon: ServiceIcon | CustomIcon): QualityCheck {
    let score = 50;
    const suggestions: string[] = [];
    
    if ('variants' in icon) {
      const avgSize = icon.variants.reduce((sum, v) => sum + v.fileSize, 0) / icon.variants.length;
      
      if (avgSize < 50 * 1024) { // Less than 50KB
        score += 30;
      } else if (avgSize < 100 * 1024) { // Less than 100KB
        score += 20;
      } else {
        suggestions.push('Consider optimizing file sizes');
      }
      
      const hasOptimized = icon.variants.some(v => v.optimized);
      if (hasOptimized) {
        score += 20;
      } else {
        suggestions.push('Enable image optimization');
      }
    } else {
      // Custom icon
      if (icon.size < 50 * 1024) {
        score += 30;
      } else if (icon.size < 100 * 1024) {
        score += 20;
      } else {
        suggestions.push('Consider optimizing file size');
      }
    }
    
    return {
      name: 'File Size Optimization',
      passed: score >= 70,
      score,
      timestamp: Date.now(),
      details: 'File size and optimization assessment',
      suggestions
    };
  }
}

/**
 * Icon Utility Functions
 */
export class IconUtils {
  /**
   * Generate fallback initials
   */
  static generateInitials(name: string, maxChars: number = 2): string {
    return name
      .trim()
      .split(/\s+/)
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, maxChars);
  }

  /**
   * Generate color from string
   */
  static generateColorFromString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = Math.abs(hash) % 360;
    const saturation = 65 + (Math.abs(hash) % 20); // 65-85%
    const lightness = 45 + (Math.abs(hash) % 20);  // 45-65%
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  /**
   * Get optimal size for context
   */
  static getOptimalSize(context: 'mobile' | 'desktop' | 'high_res'): IconSize {
    return OPTIMAL_SIZES[context] as IconSize;
  }

  /**
   * Calculate icon cache key
   */
  static generateCacheKey(
    iconId: string, 
    size: IconSize, 
    format: IconFormat, 
    theme: IconTheme
  ): string {
    return `icon:${iconId}:${size}:${format}:${theme}`;
  }

  /**
   * Parse icon URL for metadata
   */
  static parseIconUrl(url: string): {
    isDataUrl: boolean;
    format?: IconFormat;
    size?: number;
    isOptimized: boolean;
  } {
    const isDataUrl = url.startsWith('data:');
    
    if (isDataUrl) {
      const mimeMatch = url.match(/^data:image\/([^;]+)/);
      const format = mimeMatch ? IconValidator.getFormatFromMimeType(`image/${mimeMatch[1]}`) : undefined;
      
      // Estimate size from base64
      const base64Match = url.match(/;base64,(.+)$/);
      const size = base64Match ? Math.round((base64Match[1].length * 3) / 4) : undefined;
      
      return {
        isDataUrl: true,
        format,
        size,
        isOptimized: false
      };
    }
    
    // Parse URL for format and optimization hints
    const urlLower = url.toLowerCase();
    let format: IconFormat | undefined;
    
    if (urlLower.includes('.svg')) format = 'svg';
    else if (urlLower.includes('.png')) format = 'png';
    else if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) format = 'jpg';
    else if (urlLower.includes('.webp')) format = 'webp';
    
    const isOptimized = urlLower.includes('optimized') || urlLower.includes('compressed');
    
    return {
      isDataUrl: false,
      format,
      isOptimized
    };
  }

  /**
   * Get brand info for service
   */
  static getBrandInfo(serviceName: string): BrandInfo | null {
    const key = serviceName.toLowerCase().replace(/\s+/g, '');
    return BRAND_COLORS[key] || null;
  }

  /**
   * Normalize service name for matching
   */
  static normalizeServiceName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Calculate contrast ratio
   */
  static calculateContrastRatio(color1: string, color2: string): number {
    // Simplified contrast calculation
    // In a real implementation, you'd convert to RGB and use WCAG formula
    const getLuminance = (color: string): number => {
      // This is a simplified version
      const rgb = color.match(/\d+/g);
      if (!rgb) return 0.5;
      
      const [r, g, b] = rgb.map(x => parseInt(x) / 255);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    
    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  }

  /**
   * Check if color is dark
   */
  static isDarkColor(color: string): boolean {
    const rgb = color.match(/\d+/g);
    if (!rgb) return false;
    
    const [r, g, b] = rgb.map(x => parseInt(x));
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    return brightness < 128;
  }

  /**
   * Generate icon variants for different themes
   */
  static generateThemeVariants(
    baseIcon: string, 
    format: IconFormat
  ): Record<IconTheme, string> {
    // This would implement actual image processing
    // For now, return the base icon for all themes
    return {
      auto: baseIcon,
      light: baseIcon,
      dark: baseIcon,
      colorful: baseIcon,
      monochrome: baseIcon,
      'high-contrast': baseIcon,
      system: baseIcon
    };
  }

  /**
   * Estimate icon complexity
   */
  static estimateComplexity(iconData: string): {
    complexity: 'low' | 'medium' | 'high';
    score: number;
    factors: string[];
  } {
    const factors: string[] = [];
    let score = 0;
    
    // Data URL size factor
    if (iconData.length > 100000) {
      score += 30;
      factors.push('Large file size');
    } else if (iconData.length > 50000) {
      score += 15;
      factors.push('Medium file size');
    }
    
    // SVG complexity (if applicable)
    if (iconData.includes('svg')) {
      const pathCount = (iconData.match(/path/g) || []).length;
      if (pathCount > 10) {
        score += 25;
        factors.push('Many SVG paths');
      } else if (pathCount > 5) {
        score += 15;
        factors.push('Multiple SVG paths');
      }
      
      const gradientCount = (iconData.match(/gradient/g) || []).length;
      if (gradientCount > 0) {
        score += 10;
        factors.push('Contains gradients');
      }
    }
    
    let complexity: 'low' | 'medium' | 'high' = 'low';
    if (score > 40) complexity = 'high';
    else if (score > 20) complexity = 'medium';
    
    return { complexity, score, factors };
  }
}

/**
 * Icon Search Utilities
 */
export class IconSearchUtils {
  /**
   * Calculate search relevance score
   */
  static calculateRelevanceScore(
    icon: ServiceIcon, 
    query: string
  ): number {
    let score = 0;
    const normalizedQuery = query.toLowerCase().trim();
    
    // Exact name match
    if (icon.name.toLowerCase() === normalizedQuery) {
      score += 100;
    } else if (icon.name.toLowerCase().includes(normalizedQuery)) {
      score += 50;
    }
    
    // Alias matches
    for (const alias of icon.aliases) {
      if (alias.toLowerCase() === normalizedQuery) {
        score += 80;
      } else if (alias.toLowerCase().includes(normalizedQuery)) {
        score += 30;
      }
    }
    
    // Keyword matches
    for (const keyword of icon.metadata.keywords) {
      if (keyword.toLowerCase().includes(normalizedQuery)) {
        score += 20;
      }
    }
    
    // Tag matches
    for (const tag of icon.metadata.tags) {
      if (tag.toLowerCase().includes(normalizedQuery)) {
        score += 15;
      }
    }
    
    // Boost for popular icons
    if (icon.analytics.usageCount > 1000) {
      score += 10;
    } else if (icon.analytics.usageCount > 100) {
      score += 5;
    }
    
    // Quality boost
    score += icon.quality.score * 0.1;
    
    return score;
  }

  /**
   * Generate search suggestions
   */
  static generateSuggestions(
    query: string, 
    icons: ServiceIcon[], 
    limit: number = 5
  ): string[] {
    const suggestions = new Set<string>();
    const normalizedQuery = query.toLowerCase().trim();
    
    for (const icon of icons) {
      // Name suggestions
      if (icon.name.toLowerCase().startsWith(normalizedQuery)) {
        suggestions.add(icon.name);
      }
      
      // Alias suggestions
      for (const alias of icon.aliases) {
        if (alias.toLowerCase().startsWith(normalizedQuery)) {
          suggestions.add(alias);
        }
      }
      
      // Popular searches
      for (const search of icon.metadata.popularSearches) {
        if (search.toLowerCase().startsWith(normalizedQuery)) {
          suggestions.add(search);
        }
      }
    }
    
    return Array.from(suggestions)
      .sort((a, b) => a.length - b.length) // Prefer shorter suggestions
      .slice(0, limit);
  }
}