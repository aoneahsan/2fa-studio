/**
 * Icon Theme Service
 * Manages icon themes, transformations, and appearance settings
 */

import {
  IconTheme,
  IconThemeConfig,
  IconTransformation,
  ThemeColors,
  ServiceIcon,
  IconVariant
} from '@/types/icon';
import { StorageService } from './storage.service';

/**
 * Predefined theme configurations
 */
const THEME_CONFIGURATIONS: Record<IconTheme, IconThemeConfig> = {
  auto: {
    name: 'auto',
    displayName: 'Auto',
    description: 'Automatically adapts to system theme',
    colors: {
      primary: 'var(--primary)',
      secondary: 'var(--secondary)',
      background: 'var(--background)',
      text: 'var(--foreground)',
      border: 'var(--border)',
      accents: ['var(--primary)', 'var(--secondary)']
    },
    transformations: []
  },

  light: {
    name: 'light',
    displayName: 'Light',
    description: 'Light theme with bright backgrounds',
    colors: {
      primary: '#000000',
      secondary: '#666666',
      background: '#ffffff',
      text: '#000000',
      border: '#e5e5e5',
      accents: ['#0066cc', '#00aa44']
    },
    transformations: [
      {
        type: 'brightness',
        parameters: { value: 1.1 },
        applyToFormats: ['png', 'jpg', 'webp'],
        cssFilter: 'brightness(1.1)'
      }
    ]
  },

  dark: {
    name: 'dark',
    displayName: 'Dark',
    description: 'Dark theme with dark backgrounds',
    colors: {
      primary: '#ffffff',
      secondary: '#cccccc',
      background: '#1a1a1a',
      text: '#ffffff',
      border: '#333333',
      accents: ['#4dabf7', '#51cf66']
    },
    transformations: [
      {
        type: 'invert',
        parameters: { value: 1 },
        applyToFormats: ['png', 'jpg', 'webp'],
        cssFilter: 'invert(1) hue-rotate(180deg)'
      },
      {
        type: 'brightness',
        parameters: { value: 0.9 },
        applyToFormats: ['png', 'jpg', 'webp'],
        cssFilter: 'brightness(0.9)'
      }
    ],
    fallbackTheme: 'light'
  },

  colorful: {
    name: 'colorful',
    displayName: 'Colorful',
    description: 'Full color icons with enhanced saturation',
    colors: {
      primary: '#ff6b6b',
      secondary: '#4ecdc4',
      background: '#ffffff',
      text: '#2c3e50',
      border: '#bdc3c7',
      accents: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7']
    },
    transformations: [
      {
        type: 'filter',
        parameters: { saturation: 1.2, brightness: 1.05 },
        applyToFormats: ['png', 'jpg', 'webp'],
        cssFilter: 'saturate(1.2) brightness(1.05)'
      }
    ]
  },

  monochrome: {
    name: 'monochrome',
    displayName: 'Monochrome',
    description: 'Single-color icons for minimal appearance',
    colors: {
      primary: '#2c3e50',
      secondary: '#7f8c8d',
      background: '#ecf0f1',
      text: '#2c3e50',
      border: '#bdc3c7',
      accents: ['#2c3e50', '#34495e', '#7f8c8d']
    },
    transformations: [
      {
        type: 'filter',
        parameters: { grayscale: 1, contrast: 1.1 },
        applyToFormats: ['png', 'jpg', 'webp'],
        cssFilter: 'grayscale(1) contrast(1.1)'
      }
    ]
  },

  'high-contrast': {
    name: 'high-contrast',
    displayName: 'High Contrast',
    description: 'Maximum contrast for accessibility',
    colors: {
      primary: '#000000',
      secondary: '#ffffff',
      background: '#ffffff',
      text: '#000000',
      border: '#000000',
      accents: ['#000000', '#ffffff']
    },
    transformations: [
      {
        type: 'filter',
        parameters: { contrast: 2, brightness: 1.2 },
        applyToFormats: ['png', 'jpg', 'webp'],
        cssFilter: 'contrast(2) brightness(1.2)'
      }
    ]
  },

  system: {
    name: 'system',
    displayName: 'System',
    description: 'Uses system theme preferences',
    colors: {
      primary: 'var(--primary)',
      secondary: 'var(--secondary)',
      background: 'var(--background)',
      text: 'var(--foreground)',
      border: 'var(--border)',
      accents: ['var(--primary)', 'var(--secondary)']
    },
    transformations: []
  }
};

/**
 * Icon Theme Service
 */
export class IconThemeService {
  private static instance: IconThemeService;
  private currentTheme: IconTheme = 'auto';
  private customThemes: Map<string, IconThemeConfig> = new Map();
  private themeChangeListeners: ((theme: IconTheme) => void)[] = [];

  private constructor() {
    this.loadThemeFromStorage();
    this.setupSystemThemeListener();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): IconThemeService {
    if (!IconThemeService.instance) {
      IconThemeService.instance = new IconThemeService();
    }
    return IconThemeService.instance;
  }

  /**
   * Get current theme
   */
  getCurrentTheme(): IconTheme {
    return this.currentTheme;
  }

  /**
   * Set current theme
   */
  async setCurrentTheme(theme: IconTheme): Promise<void> {
    this.currentTheme = theme;
    await this.saveThemeToStorage();
    this.notifyThemeChange();
  }

  /**
   * Get theme configuration
   */
  getThemeConfig(theme: IconTheme): IconThemeConfig {
    const customTheme = this.customThemes.get(theme);
    if (customTheme) {
      return customTheme;
    }

    const predefinedTheme = THEME_CONFIGURATIONS[theme];
    if (predefinedTheme) {
      return predefinedTheme;
    }

    // Fallback to auto theme
    return THEME_CONFIGURATIONS.auto;
  }

  /**
   * Get all available themes
   */
  getAvailableThemes(): IconThemeConfig[] {
    const themes = Object.values(THEME_CONFIGURATIONS);
    const customThemes = Array.from(this.customThemes.values());
    return [...themes, ...customThemes];
  }

  /**
   * Get resolved theme (resolves auto/system to actual theme)
   */
  getResolvedTheme(): IconTheme {
    if (this.currentTheme === 'auto' || this.currentTheme === 'system') {
      return this.getSystemTheme();
    }
    return this.currentTheme;
  }

  /**
   * Create custom theme
   */
  async createCustomTheme(
    name: string,
    config: Omit<IconThemeConfig, 'name'>
  ): Promise<void> {
    const customTheme: IconThemeConfig = {
      name: name as IconTheme,
      ...config
    };

    this.customThemes.set(name, customTheme);
    await this.saveCustomThemesToStorage();
  }

  /**
   * Delete custom theme
   */
  async deleteCustomTheme(name: string): Promise<boolean> {
    const deleted = this.customThemes.delete(name);
    if (deleted) {
      await this.saveCustomThemesToStorage();
      
      // Switch to auto if current theme was deleted
      if (this.currentTheme === name) {
        await this.setCurrentTheme('auto');
      }
    }
    return deleted;
  }

  /**
   * Apply theme transformations to icon
   */
  applyThemeToIcon(
    iconUrl: string,
    theme: IconTheme = this.currentTheme
  ): {
    url: string;
    cssFilter?: string;
    style?: React.CSSProperties;
  } {
    const resolvedTheme = theme === 'auto' || theme === 'system' 
      ? this.getResolvedTheme() 
      : theme;
    
    const themeConfig = this.getThemeConfig(resolvedTheme);
    const transformations = themeConfig.transformations;

    if (transformations.length === 0) {
      return { url: iconUrl };
    }

    // Combine CSS filters
    const cssFilters = transformations
      .filter(t => t.cssFilter)
      .map(t => t.cssFilter)
      .join(' ');

    const style: React.CSSProperties = {};

    // Apply transformations
    for (const transformation of transformations) {
      switch (transformation.type) {
        case 'filter':
          if (transformation.cssFilter) {
            style.filter = (style.filter || '') + ' ' + transformation.cssFilter;
          }
          break;
        case 'colorize':
          style.filter = (style.filter || '') + ` hue-rotate(${transformation.parameters.hue || 0}deg)`;
          break;
        case 'brightness':
          style.filter = (style.filter || '') + ` brightness(${transformation.parameters.value || 1})`;
          break;
        case 'contrast':
          style.filter = (style.filter || '') + ` contrast(${transformation.parameters.value || 1})`;
          break;
        case 'opacity':
          style.opacity = transformation.parameters.value || 1;
          break;
      }
    }

    return {
      url: iconUrl,
      cssFilter: cssFilters || undefined,
      style: Object.keys(style).length > 0 ? style : undefined
    };
  }

  /**
   * Get best icon variant for current theme
   */
  getBestVariantForTheme(
    variants: IconVariant[],
    theme: IconTheme = this.currentTheme
  ): IconVariant | null {
    if (variants.length === 0) return null;

    const resolvedTheme = theme === 'auto' || theme === 'system' 
      ? this.getResolvedTheme() 
      : theme;

    // Try to find exact theme match
    let variant = variants.find(v => v.theme === resolvedTheme);
    if (variant) return variant;

    // Try theme-compatible variants
    if (resolvedTheme === 'dark') {
      variant = variants.find(v => v.theme === 'monochrome' || v.theme === 'dark');
      if (variant) return variant;
    }

    if (resolvedTheme === 'light') {
      variant = variants.find(v => v.theme === 'colorful' || v.theme === 'light');
      if (variant) return variant;
    }

    // Try colorful for any theme
    variant = variants.find(v => v.theme === 'colorful');
    if (variant) return variant;

    // Return first available variant
    return variants[0];
  }

  /**
   * Get theme colors
   */
  getThemeColors(theme: IconTheme = this.currentTheme): ThemeColors {
    const resolvedTheme = theme === 'auto' || theme === 'system' 
      ? this.getResolvedTheme() 
      : theme;
    
    const themeConfig = this.getThemeConfig(resolvedTheme);
    return themeConfig.colors;
  }

  /**
   * Check if theme is dark
   */
  isDarkTheme(theme: IconTheme = this.currentTheme): boolean {
    const resolvedTheme = theme === 'auto' || theme === 'system' 
      ? this.getResolvedTheme() 
      : theme;
    
    return resolvedTheme === 'dark';
  }

  /**
   * Toggle between light and dark theme
   */
  async toggleTheme(): Promise<void> {
    const newTheme = this.isDarkTheme() ? 'light' : 'dark';
    await this.setCurrentTheme(newTheme);
  }

  /**
   * Add theme change listener
   */
  addThemeChangeListener(listener: (theme: IconTheme) => void): () => void {
    this.themeChangeListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.themeChangeListeners.indexOf(listener);
      if (index > -1) {
        this.themeChangeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Generate CSS variables for theme
   */
  generateThemeCSS(theme: IconTheme = this.currentTheme): string {
    const colors = this.getThemeColors(theme);
    
    return `
      :root {
        --icon-primary: ${colors.primary};
        --icon-secondary: ${colors.secondary};
        --icon-background: ${colors.background};
        --icon-text: ${colors.text};
        --icon-border: ${colors.border};
        ${colors.accents.map((color, index) => `--icon-accent-${index + 1}: ${color};`).join('\n        ')}
      }
    `.trim();
  }

  /**
   * Apply theme to HTML element
   */
  applyThemeToElement(element: HTMLElement, theme: IconTheme = this.currentTheme): void {
    const colors = this.getThemeColors(theme);
    
    element.style.setProperty('--icon-primary', colors.primary);
    element.style.setProperty('--icon-secondary', colors.secondary);
    element.style.setProperty('--icon-background', colors.background);
    element.style.setProperty('--icon-text', colors.text);
    element.style.setProperty('--icon-border', colors.border);
    
    colors.accents.forEach((color, index) => {
      element.style.setProperty(`--icon-accent-${index + 1}`, color);
    });
  }

  /**
   * Get theme preferences for user
   */
  async getUserThemePreferences(): Promise<{
    theme: IconTheme;
    autoSwitchEnabled: boolean;
    preferredLightTheme: IconTheme;
    preferredDarkTheme: IconTheme;
  }> {
    const prefs = await StorageService.get('theme-preferences') || {};
    
    return {
      theme: prefs.theme || this.currentTheme,
      autoSwitchEnabled: prefs.autoSwitchEnabled ?? true,
      preferredLightTheme: prefs.preferredLightTheme || 'light',
      preferredDarkTheme: prefs.preferredDarkTheme || 'dark'
    };
  }

  /**
   * Save theme preferences
   */
  async saveUserThemePreferences(preferences: {
    theme?: IconTheme;
    autoSwitchEnabled?: boolean;
    preferredLightTheme?: IconTheme;
    preferredDarkTheme?: IconTheme;
  }): Promise<void> {
    const currentPrefs = await this.getUserThemePreferences();
    const newPrefs = { ...currentPrefs, ...preferences };
    
    await StorageService.set('theme-preferences', newPrefs);
    
    if (preferences.theme) {
      await this.setCurrentTheme(preferences.theme);
    }
  }

  // Private methods

  /**
   * Get system theme
   */
  private getSystemTheme(): IconTheme {
    if (typeof window === 'undefined') {
      return 'light';
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  /**
   * Setup system theme listener
   */
  private setupSystemThemeListener(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (this.currentTheme === 'auto' || this.currentTheme === 'system') {
        this.notifyThemeChange();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
  }

  /**
   * Load theme from storage
   */
  private async loadThemeFromStorage(): Promise<void> {
    try {
      const savedTheme = await StorageService.get<IconTheme>('current-theme');
      if (savedTheme) {
        this.currentTheme = savedTheme;
      }

      const customThemes = await StorageService.get<Record<string, IconThemeConfig>>('custom-themes');
      if (customThemes) {
        this.customThemes = new Map(Object.entries(customThemes));
      }
    } catch (error) {
      console.warn('Failed to load theme from storage:', error);
    }
  }

  /**
   * Save theme to storage
   */
  private async saveThemeToStorage(): Promise<void> {
    try {
      await StorageService.set('current-theme', this.currentTheme);
    } catch (error) {
      console.warn('Failed to save theme to storage:', error);
    }
  }

  /**
   * Save custom themes to storage
   */
  private async saveCustomThemesToStorage(): Promise<void> {
    try {
      const customThemesObject = Object.fromEntries(this.customThemes.entries());
      await StorageService.set('custom-themes', customThemesObject);
    } catch (error) {
      console.warn('Failed to save custom themes to storage:', error);
    }
  }

  /**
   * Notify theme change listeners
   */
  private notifyThemeChange(): void {
    this.themeChangeListeners.forEach(listener => {
      try {
        listener(this.currentTheme);
      } catch (error) {
        console.error('Theme change listener error:', error);
      }
    });
  }
}

// Create and export singleton instance
export const iconThemeService = IconThemeService.getInstance();

// React hook integration
export function useIconThemeService() {
  return iconThemeService;
}

export default IconThemeService;