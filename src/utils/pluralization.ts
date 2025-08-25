/**
 * Advanced pluralization and gender-specific translation utilities
 */

import { SUPPORTED_LANGUAGES, SupportedLanguage } from '@/i18n';

/**
 * Pluralization rules for different languages
 */
export interface PluralRules {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string; // Required fallback
}

/**
 * Gender-specific translation options
 */
export interface GenderOptions {
  masculine?: string;
  feminine?: string;
  neuter?: string;
  other?: string; // Fallback
}

/**
 * Context for pluralization and gender
 */
export interface TranslationContext {
  count?: number;
  gender?: 'masculine' | 'feminine' | 'neuter';
  ordinal?: boolean;
  context?: string;
}

/**
 * Language-specific pluralization handler
 */
export class LanguagePluralization {
  private language: SupportedLanguage;
  private pluralRules: Intl.PluralRules;
  private ordinalRules: Intl.PluralRules;

  constructor(language: SupportedLanguage = 'en') {
    this.language = language;
    const locale = SUPPORTED_LANGUAGES[language]?.numberFormat || 'en-US';
    
    try {
      this.pluralRules = new Intl.PluralRules(locale, { type: 'cardinal' });
      this.ordinalRules = new Intl.PluralRules(locale, { type: 'ordinal' });
    } catch (error) {
      console.warn(`Failed to create plural rules for ${language}:`, error);
      this.pluralRules = new Intl.PluralRules('en', { type: 'cardinal' });
      this.ordinalRules = new Intl.PluralRules('en', { type: 'ordinal' });
    }
  }

  /**
   * Get plural rule for a given count
   */
  getPluralRule(count: number, ordinal: boolean = false): Intl.LDMLPluralRule {
    try {
      const rules = ordinal ? this.ordinalRules : this.pluralRules;
      return rules.select(count);
    } catch (error) {
      console.warn('Plural rule selection failed:', error);
      return count === 1 ? 'one' : 'other';
    }
  }

  /**
   * Select appropriate plural form
   */
  selectPluralForm(count: number, forms: PluralRules, ordinal: boolean = false): string {
    const rule = this.getPluralRule(count, ordinal);
    
    // Return the form for the detected rule, or fallback to 'other'
    return forms[rule] || forms.other || '';
  }

  /**
   * Format number with plural form
   */
  formatPlural(
    count: number,
    forms: PluralRules,
    options: {
      ordinal?: boolean;
      showCount?: boolean;
      numberFormat?: Intl.NumberFormatOptions;
    } = {}
  ): string {
    const { ordinal = false, showCount = true, numberFormat = {} } = options;
    
    // Get the appropriate plural form
    const pluralForm = this.selectPluralForm(count, forms, ordinal);
    
    if (!showCount) {
      return pluralForm;
    }
    
    // Format the count according to locale
    const locale = SUPPORTED_LANGUAGES[this.language]?.numberFormat || 'en-US';
    let formattedCount: string;
    
    try {
      formattedCount = new Intl.NumberFormat(locale, numberFormat).format(count);
    } catch (error) {
      console.warn('Number formatting failed:', error);
      formattedCount = count.toString();
    }
    
    // Replace count placeholder in the plural form
    return pluralForm.replace(/\{\{count\}\}/g, formattedCount);
  }

  /**
   * Language-specific pluralization examples
   */
  static getLanguageExamples(language: SupportedLanguage): Record<Intl.LDMLPluralRule, number[]> {
    // Examples of numbers that trigger each plural rule for different languages
    const examples: Record<SupportedLanguage, Record<Intl.LDMLPluralRule, number[]>> = {
      en: {
        one: [1],
        other: [0, 2, 3, 4, 5, 10, 100]
      },
      es: {
        one: [1],
        other: [0, 2, 3, 4, 5, 10, 100]
      },
      fr: {
        one: [0, 1],
        other: [2, 3, 4, 5, 10, 100]
      },
      de: {
        one: [1],
        other: [0, 2, 3, 4, 5, 10, 100]
      },
      ru: {
        one: [1, 21, 31, 41, 51, 61],
        few: [2, 3, 4, 22, 23, 24],
        many: [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25],
        other: []
      },
      ar: {
        zero: [0],
        one: [1],
        two: [2],
        few: [3, 4, 5, 6, 7, 8, 9, 10],
        many: [11, 12, 13, 99, 100],
        other: []
      },
      he: {
        one: [1],
        two: [2],
        many: [20, 30, 40, 50, 60, 70, 80, 90, 100],
        other: [0, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21]
      },
      zh: {
        other: [0, 1, 2, 3, 4, 5, 10, 100] // Chinese doesn't distinguish plurals
      },
      ja: {
        other: [0, 1, 2, 3, 4, 5, 10, 100] // Japanese doesn't distinguish plurals
      },
      ko: {
        other: [0, 1, 2, 3, 4, 5, 10, 100] // Korean doesn't distinguish plurals
      },
      pt: {
        one: [1],
        other: [0, 2, 3, 4, 5, 10, 100]
      },
      it: {
        one: [1],
        other: [0, 2, 3, 4, 5, 10, 100]
      }
    };

    return examples[language] || examples.en;
  }
}

/**
 * Gender-specific translation handler
 */
export class GenderTranslation {
  private language: SupportedLanguage;

  constructor(language: SupportedLanguage = 'en') {
    this.language = language;
  }

  /**
   * Select appropriate gender form
   */
  selectGenderForm(gender: string | undefined, forms: GenderOptions): string {
    if (!gender || !forms) {
      return forms.other || '';
    }

    const normalizedGender = gender.toLowerCase() as keyof GenderOptions;
    return forms[normalizedGender] || forms.other || '';
  }

  /**
   * Languages that commonly use gender-specific translations
   */
  static getGenderedLanguages(): SupportedLanguage[] {
    return ['es', 'fr', 'de', 'ru', 'ar', 'he', 'pt', 'it'];
  }

  /**
   * Check if a language typically uses gender in translations
   */
  static isGenderedLanguage(language: SupportedLanguage): boolean {
    return this.getGenderedLanguages().includes(language);
  }

  /**
   * Get default gender for a language (when not specified)
   */
  static getDefaultGender(language: SupportedLanguage): 'masculine' | 'feminine' | 'neuter' {
    const defaults: Partial<Record<SupportedLanguage, 'masculine' | 'feminine' | 'neuter'>> = {
      es: 'masculine',
      fr: 'masculine',
      de: 'masculine',
      ru: 'masculine',
      ar: 'masculine',
      he: 'masculine',
      pt: 'masculine',
      it: 'masculine'
    };

    return defaults[language] || 'masculine';
  }
}

/**
 * Advanced translation formatter with pluralization and gender support
 */
export class AdvancedTranslationFormatter {
  private pluralization: LanguagePluralization;
  private genderHandler: GenderTranslation;

  constructor(language: SupportedLanguage = 'en') {
    this.pluralization = new LanguagePluralization(language);
    this.genderHandler = new GenderTranslation(language);
  }

  /**
   * Format translation with advanced features
   */
  format(
    template: string,
    context: TranslationContext = {},
    interpolations: Record<string, any> = {}
  ): string {
    let result = template;

    // Handle pluralization
    if (context.count !== undefined) {
      result = this.handlePluralization(result, context.count, context.ordinal || false);
    }

    // Handle gender-specific translations
    if (context.gender) {
      result = this.handleGenderForms(result, context.gender);
    }

    // Handle context-specific translations
    if (context.context) {
      result = this.handleContextForms(result, context.context);
    }

    // Handle regular interpolations
    result = this.handleInterpolations(result, interpolations);

    return result;
  }

  /**
   * Handle pluralization in templates
   */
  private handlePluralization(template: string, count: number, ordinal: boolean): string {
    // Match patterns like {count, plural, one {# item} other {# items}}
    const pluralPattern = /\{(\w+),\s*plural,\s*((?:\w+\s*\{[^}]*\}\s*)+)\}/g;
    
    return template.replace(pluralPattern, (match, countVar, formsStr) => {
      // Parse forms
      const forms: PluralRules = { other: '' };
      const formPattern = /(\w+)\s*\{([^}]*)\}/g;
      let formMatch;

      while ((formMatch = formPattern.exec(formsStr)) !== null) {
        const [, rule, form] = formMatch;
        if (rule in forms || rule === 'other') {
          (forms as any)[rule] = form;
        }
      }

      return this.pluralization.formatPlural(count, forms, { ordinal, showCount: true });
    });
  }

  /**
   * Handle gender-specific forms in templates
   */
  private handleGenderForms(template: string, gender: string): string {
    // Match patterns like {gender, select, masculine {el} feminine {la} other {the}}
    const genderPattern = /\{(\w+),\s*select,\s*((?:\w+\s*\{[^}]*\}\s*)+)\}/g;
    
    return template.replace(genderPattern, (match, genderVar, formsStr) => {
      // Parse forms
      const forms: GenderOptions = {};
      const formPattern = /(\w+)\s*\{([^}]*)\}/g;
      let formMatch;

      while ((formMatch = formPattern.exec(formsStr)) !== null) {
        const [, genderType, form] = formMatch;
        (forms as any)[genderType] = form;
      }

      return this.genderHandler.selectGenderForm(gender, forms);
    });
  }

  /**
   * Handle context-specific forms in templates
   */
  private handleContextForms(template: string, context: string): string {
    // Match patterns like {context, select, formal {您} informal {你} other {you}}
    const contextPattern = /\{(\w+),\s*select,\s*((?:\w+\s*\{[^}]*\}\s*)+)\}/g;
    
    return template.replace(contextPattern, (match, contextVar, formsStr) => {
      // Parse forms
      const forms: Record<string, string> = {};
      const formPattern = /(\w+)\s*\{([^}]*)\}/g;
      let formMatch;

      while ((formMatch = formPattern.exec(formsStr)) !== null) {
        const [, contextType, form] = formMatch;
        forms[contextType] = form;
      }

      return forms[context] || forms.other || '';
    });
  }

  /**
   * Handle regular interpolations
   */
  private handleInterpolations(template: string, interpolations: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return interpolations[key] !== undefined ? interpolations[key].toString() : match;
    });
  }

  /**
   * Validate translation template for correctness
   */
  validateTemplate(template: string): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for unmatched braces
    const openBraces = (template.match(/\{/g) || []).length;
    const closeBraces = (template.match(/\}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      errors.push('Unmatched braces in template');
    }

    // Check plural forms
    const pluralMatches = template.match(/\{(\w+),\s*plural,\s*((?:\w+\s*\{[^}]*\}\s*)+)\}/g);
    if (pluralMatches) {
      pluralMatches.forEach(match => {
        if (!match.includes('other {')) {
          errors.push('Plural form missing required "other" fallback');
        }
      });
    }

    // Check gender forms
    const genderMatches = template.match(/\{(\w+),\s*select,\s*((?:\w+\s*\{[^}]*\}\s*)+)\}/g);
    if (genderMatches) {
      genderMatches.forEach(match => {
        if (!match.includes('other {')) {
          warnings.push('Gender form missing "other" fallback');
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/**
 * Utility functions for common pluralization scenarios
 */
export const pluralUtils = {
  /**
   * Format account count
   */
  accounts: (count: number, language: SupportedLanguage = 'en'): string => {
    const formatter = new AdvancedTranslationFormatter(language);
    return formatter.format(
      '{count, plural, one {{{count}} account} other {{{count}} accounts}}',
      { count }
    );
  },

  /**
   * Format time duration
   */
  duration: (
    count: number,
    unit: 'second' | 'minute' | 'hour' | 'day',
    language: SupportedLanguage = 'en'
  ): string => {
    const formatter = new AdvancedTranslationFormatter(language);
    const templates = {
      second: '{count, plural, one {{{count}} second} other {{{count}} seconds}}',
      minute: '{count, plural, one {{{count}} minute} other {{{count}} minutes}}',
      hour: '{count, plural, one {{{count}} hour} other {{{count}} hours}}',
      day: '{count, plural, one {{{count}} day} other {{{count}} days}}'
    };
    
    return formatter.format(templates[unit], { count });
  },

  /**
   * Format file count
   */
  files: (count: number, language: SupportedLanguage = 'en'): string => {
    const formatter = new AdvancedTranslationFormatter(language);
    return formatter.format(
      '{count, plural, one {{{count}} file} other {{{count}} files}}',
      { count }
    );
  }
};

/**
 * Utility functions for gender-specific translations
 */
export const genderUtils = {
  /**
   * Welcome message with gender
   */
  welcome: (gender: 'masculine' | 'feminine' | 'neuter', language: SupportedLanguage = 'en'): string => {
    const formatter = new AdvancedTranslationFormatter(language);
    
    const templates: Record<SupportedLanguage, string> = {
      en: 'Welcome!',
      es: '{gender, select, masculine {Bienvenido} feminine {Bienvenida} other {Bienvenido/a}}',
      fr: '{gender, select, masculine {Bienvenu} feminine {Bienvenue} other {Bienvenu(e)}}',
      de: '{gender, select, masculine {Willkommen} feminine {Willkommen} other {Willkommen}}',
      ar: '{gender, select, masculine {مرحباً} feminine {مرحباً} other {مرحباً}}',
      he: '{gender, select, masculine {ברוך הבא} feminine {ברוכה הבאה} other {ברוך/ה הבא/ה}}',
      ru: '{gender, select, masculine {Добро пожаловать} feminine {Добро пожаловать} other {Добро пожаловать}}',
      pt: '{gender, select, masculine {Bem-vindo} feminine {Bem-vinda} other {Bem-vindo(a)}}',
      it: '{gender, select, masculine {Benvenuto} feminine {Benvenuta} other {Benvenuto/a}}',
      zh: '欢迎！',
      ja: 'いらっしゃいませ！',
      ko: '환영합니다!'
    };

    return formatter.format(templates[language] || templates.en, { gender });
  }
};

export {
  LanguagePluralization,
  GenderTranslation,
  AdvancedTranslationFormatter
};