/**
 * Firebase ML Kit Service
 * Integration with Firebase ML Kit for vision and text processing
 */

import { Capacitor } from '@capacitor/core';

export interface MLKitLabel {
  label: string;
  confidence: number;
  entityId?: string;
}

export interface TextRecognitionResult {
  text: string;
  blocks: Array<{
    text: string;
    confidence: number;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
}

export interface BarcodeResult {
  value: string;
  format: string;
  type: 'qr_code' | 'data_matrix' | 'code_128' | 'code_39' | 'ean_13' | 'ean_8' | 'upc_a' | 'upc_e';
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
}

export class MLKitService {
  private static isInitialized = false;
  private static isAvailableOnPlatform = false;

  /**
   * Initialize ML Kit service
   */
  public static async initialize(): Promise<void> {
    if (MLKitService.isInitialized) return;

    try {
      // Check if running on a platform that supports ML Kit
      MLKitService.isAvailableOnPlatform = Capacitor.isNativePlatform();

      if (!MLKitService.isAvailableOnPlatform) {
        console.warn('ML Kit not available on web platform, using fallback implementations');
      }

      MLKitService.isInitialized = true;
      console.log('ML Kit service initialized', { 
        available: MLKitService.isAvailableOnPlatform 
      });
    } catch (error) {
      console.error('Failed to initialize ML Kit service:', error);
      throw error;
    }
  }

  /**
   * Check if ML Kit is available
   */
  public static isAvailable(): boolean {
    return MLKitService.isInitialized && MLKitService.isAvailableOnPlatform;
  }

  /**
   * Analyze image for labels (icon categorization)
   */
  public static async analyzeImage(imageUrl: string): Promise<MLKitLabel[]> {
    if (!MLKitService.isInitialized) {
      await MLKitService.initialize();
    }

    try {
      if (!MLKitService.isAvailableOnPlatform) {
        return MLKitService.fallbackImageAnalysis(imageUrl);
      }

      // On native platforms, use Firebase ML Kit
      // This would integrate with the actual ML Kit plugin
      const { MLKit } = await import('@capacitor-firebase/ml-kit');
      
      const result = await MLKit.processImage({
        path: imageUrl,
        detector: 'imageLabeling'
      });

      return result.labels.map((label: any) => ({
        label: label.text,
        confidence: label.confidence,
        entityId: label.entityId
      }));

    } catch (error) {
      console.error('Image analysis failed:', error);
      return MLKitService.fallbackImageAnalysis(imageUrl);
    }
  }

  /**
   * Extract text from image (QR code enhancement)
   */
  public static async recognizeText(imageUrl: string): Promise<TextRecognitionResult> {
    if (!MLKitService.isInitialized) {
      await MLKitService.initialize();
    }

    try {
      if (!MLKitService.isAvailableOnPlatform) {
        return MLKitService.fallbackTextRecognition(imageUrl);
      }

      // On native platforms, use Firebase ML Kit
      const { MLKit } = await import('@capacitor-firebase/ml-kit');
      
      const result = await MLKit.processImage({
        path: imageUrl,
        detector: 'textRecognition'
      });

      return {
        text: result.text,
        blocks: result.blocks.map((block: any) => ({
          text: block.text,
          confidence: block.confidence,
          boundingBox: {
            x: block.boundingBox.left,
            y: block.boundingBox.top,
            width: block.boundingBox.width,
            height: block.boundingBox.height
          }
        }))
      };

    } catch (error) {
      console.error('Text recognition failed:', error);
      return MLKitService.fallbackTextRecognition(imageUrl);
    }
  }

  /**
   * Scan barcode/QR code with enhanced detection
   */
  public static async scanBarcode(imageUrl: string): Promise<BarcodeResult[]> {
    if (!MLKitService.isInitialized) {
      await MLKitService.initialize();
    }

    try {
      if (!MLKitService.isAvailableOnPlatform) {
        return MLKitService.fallbackBarcodeScanning(imageUrl);
      }

      // On native platforms, use Firebase ML Kit
      const { MLKit } = await import('@capacitor-firebase/ml-kit');
      
      const result = await MLKit.processImage({
        path: imageUrl,
        detector: 'barcodeScanning'
      });

      return result.barcodes.map((barcode: any) => ({
        value: barcode.value,
        format: barcode.format,
        type: this.mapBarcodeType(barcode.type),
        boundingBox: barcode.boundingBox ? {
          x: barcode.boundingBox.left,
          y: barcode.boundingBox.top,
          width: barcode.boundingBox.width,
          height: barcode.boundingBox.height
        } : undefined
      }));

    } catch (error) {
      console.error('Barcode scanning failed:', error);
      return MLKitService.fallbackBarcodeScanning(imageUrl);
    }
  }

  /**
   * Detect language of text
   */
  public static async detectLanguage(text: string): Promise<LanguageDetectionResult> {
    if (!MLKitService.isInitialized) {
      await MLKitService.initialize();
    }

    try {
      if (!MLKitService.isAvailableOnPlatform) {
        return MLKitService.fallbackLanguageDetection(text);
      }

      // On native platforms, use Firebase ML Kit
      const { MLKit } = await import('@capacitor-firebase/ml-kit');
      
      const result = await MLKit.identifyLanguage({ text });

      return {
        language: result.languageCode,
        confidence: result.confidence
      };

    } catch (error) {
      console.error('Language detection failed:', error);
      return MLKitService.fallbackLanguageDetection(text);
    }
  }

  /**
   * Enhanced QR code processing with error correction
   */
  public static async processQRCode(imageUrl: string): Promise<{
    success: boolean;
    data?: string;
    confidence?: number;
    suggestions?: string[];
    errorCorrection?: boolean;
  }> {
    try {
      const barcodes = await MLKitService.scanBarcode(imageUrl);
      const qrCodes = barcodes.filter(barcode => barcode.type === 'qr_code');

      if (qrCodes.length === 0) {
        // Try text recognition as fallback
        const textResult = await MLKitService.recognizeText(imageUrl);
        const suggestions = MLKitService.extractPossibleQRData(textResult.text);

        return {
          success: false,
          suggestions
        };
      }

      const primaryQR = qrCodes[0];
      
      // Validate QR code format for 2FA
      const is2FAFormat = MLKitService.validate2FAFormat(primaryQR.value);
      
      return {
        success: true,
        data: primaryQR.value,
        confidence: 0.95, // High confidence for successful barcode scan
        errorCorrection: qrCodes.length > 1 // Multiple detections might indicate error correction
      };

    } catch (error) {
      console.error('QR code processing failed:', error);
      return {
        success: false,
        suggestions: ['Please ensure the QR code is clearly visible and well-lit']
      };
    }
  }

  /**
   * Smart icon analysis for service detection
   */
  public static async analyzeServiceIcon(iconUrl: string): Promise<{
    serviceType?: string;
    confidence: number;
    suggestedCategory?: string;
    brand?: string;
  }> {
    try {
      const labels = await MLKitService.analyzeImage(iconUrl);
      
      // Analyze labels for service type detection
      const serviceMapping = {
        'bank': { type: 'banking', category: 'banking_finance' },
        'social': { type: 'social_media', category: 'social_media' },
        'game': { type: 'gaming', category: 'gaming_entertainment' },
        'shopping': { type: 'ecommerce', category: 'shopping_ecommerce' },
        'security': { type: 'security', category: 'security_privacy' },
        'productivity': { type: 'work', category: 'work_productivity' }
      };

      let bestMatch = { confidence: 0, serviceType: '', category: '' };

      for (const label of labels) {
        for (const [keyword, mapping] of Object.entries(serviceMapping)) {
          if (label.label.toLowerCase().includes(keyword)) {
            if (label.confidence > bestMatch.confidence) {
              bestMatch = {
                confidence: label.confidence,
                serviceType: mapping.type,
                category: mapping.category
              };
            }
          }
        }
      }

      return {
        serviceType: bestMatch.serviceType || undefined,
        confidence: bestMatch.confidence,
        suggestedCategory: bestMatch.category || undefined,
        brand: MLKitService.extractBrandFromLabels(labels)
      };

    } catch (error) {
      console.error('Icon analysis failed:', error);
      return { confidence: 0 };
    }
  }

  // Private helper methods

  private static fallbackImageAnalysis(imageUrl: string): Promise<MLKitLabel[]> {
    // Basic fallback using filename/URL analysis
    const filename = imageUrl.split('/').pop()?.toLowerCase() || '';
    const labels: MLKitLabel[] = [];

    const patterns = [
      { pattern: /bank|finance|money/, label: 'bank', confidence: 0.7 },
      { pattern: /social|facebook|twitter|instagram/, label: 'social', confidence: 0.7 },
      { pattern: /game|gaming|play/, label: 'game', confidence: 0.7 },
      { pattern: /shop|store|buy/, label: 'shopping', confidence: 0.7 },
      { pattern: /security|lock|shield/, label: 'security', confidence: 0.7 }
    ];

    patterns.forEach(({ pattern, label, confidence }) => {
      if (pattern.test(filename)) {
        labels.push({ label, confidence });
      }
    });

    return Promise.resolve(labels);
  }

  private static fallbackTextRecognition(imageUrl: string): Promise<TextRecognitionResult> {
    // Fallback implementation - would need OCR library for web
    return Promise.resolve({
      text: '',
      blocks: []
    });
  }

  private static fallbackBarcodeScanning(imageUrl: string): Promise<BarcodeResult[]> {
    // Fallback implementation - would need QR code library for web
    return Promise.resolve([]);
  }

  private static fallbackLanguageDetection(text: string): Promise<LanguageDetectionResult> {
    // Simple heuristic-based language detection
    const patterns = [
      { pattern: /[a-zA-Z\s.,!?]+/, language: 'en', confidence: 0.6 },
      { pattern: /[äöüß]/, language: 'de', confidence: 0.8 },
      { pattern: /[àáâãäçèéêëìíîïñòóôõöùúûüý]/, language: 'fr', confidence: 0.8 },
      { pattern: /[àèìòù]/, language: 'it', confidence: 0.8 }
    ];

    for (const { pattern, language, confidence } of patterns) {
      if (pattern.test(text)) {
        return Promise.resolve({ language, confidence });
      }
    }

    return Promise.resolve({ language: 'en', confidence: 0.3 });
  }

  private static mapBarcodeType(nativeType: string): BarcodeResult['type'] {
    const typeMap: Record<string, BarcodeResult['type']> = {
      'QR_CODE': 'qr_code',
      'DATA_MATRIX': 'data_matrix',
      'CODE_128': 'code_128',
      'CODE_39': 'code_39',
      'EAN_13': 'ean_13',
      'EAN_8': 'ean_8',
      'UPC_A': 'upc_a',
      'UPC_E': 'upc_e'
    };

    return typeMap[nativeType] || 'qr_code';
  }

  private static extractPossibleQRData(text: string): string[] {
    const suggestions: string[] = [];
    
    // Look for TOTP URI patterns
    const totpPattern = /otpauth:\/\/totp\/[^\s]+/gi;
    const totpMatches = text.match(totpPattern);
    if (totpMatches) {
      suggestions.push(...totpMatches);
    }

    // Look for base32 secret patterns
    const base32Pattern = /[A-Z2-7]{16,}/g;
    const base32Matches = text.match(base32Pattern);
    if (base32Matches) {
      suggestions.push(...base32Matches.map(match => `Secret: ${match}`));
    }

    return suggestions;
  }

  private static validate2FAFormat(data: string): boolean {
    // Check if it's a valid TOTP URI
    if (data.startsWith('otpauth://totp/')) {
      try {
        new URL(data);
        return true;
      } catch {
        return false;
      }
    }

    // Check if it's a base32 secret
    const base32Pattern = /^[A-Z2-7]+=*$/;
    return base32Pattern.test(data) && data.length >= 16;
  }

  private static extractBrandFromLabels(labels: MLKitLabel[]): string | undefined {
    // Look for brand names in labels
    const brandPatterns = [
      'Google', 'Microsoft', 'Apple', 'Facebook', 'Amazon', 'Twitter',
      'GitHub', 'Dropbox', 'PayPal', 'Stripe', 'Steam', 'Discord'
    ];

    for (const label of labels) {
      for (const brand of brandPatterns) {
        if (label.label.toLowerCase().includes(brand.toLowerCase())) {
          return brand;
        }
      }
    }

    return undefined;
  }

  /**
   * Cleanup service resources
   */
  public static cleanup(): void {
    MLKitService.isInitialized = false;
    MLKitService.isAvailableOnPlatform = false;
  }
}