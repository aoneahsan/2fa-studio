import { SUPPORTED_LANGUAGES, SupportedLanguage } from '@/i18n';

/**
 * Locale-specific formatting utilities for dates, numbers, and currencies
 */

export interface FormatOptions {
  locale?: string;
  currency?: string;
  timeZone?: string;
}

/**
 * Number formatting utilities
 */
export class NumberFormatter {
  private locale: string;
  private numberFormat: string;

  constructor(locale: SupportedLanguage = 'en') {
    this.locale = locale;
    this.numberFormat = SUPPORTED_LANGUAGES[locale]?.numberFormat || 'en-US';
  }

  /**
   * Format a number with locale-specific formatting
   */
  format(
    number: number,
    options: Intl.NumberFormatOptions = {}
  ): string {
    try {
      return new Intl.NumberFormat(this.numberFormat, options).format(number);
    } catch (error) {
      console.warn('Number formatting failed:', error);
      return number.toString();
    }
  }

  /**
   * Format as currency
   */
  formatCurrency(
    amount: number,
    currency?: string,
    options: Intl.NumberFormatOptions = {}
  ): string {
    const currencyCode = currency || SUPPORTED_LANGUAGES[this.locale as SupportedLanguage]?.currencyFormat || 'USD';
    
    return this.format(amount, {
      style: 'currency',
      currency: currencyCode,
      ...options
    });
  }

  /**
   * Format as percentage
   */
  formatPercentage(
    value: number,
    options: Intl.NumberFormatOptions = {}
  ): string {
    return this.format(value, {
      style: 'percent',
      ...options
    });
  }

  /**
   * Format with units (e.g., KB, MB, GB)
   */
  formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${this.format(parseFloat((bytes / Math.pow(k, i)).toFixed(dm)))} ${sizes[i]}`;
  }

  /**
   * Format large numbers with abbreviations
   */
  formatCompact(
    number: number,
    options: Intl.NumberFormatOptions = {}
  ): string {
    return this.format(number, {
      notation: 'compact',
      compactDisplay: 'short',
      ...options
    });
  }

  /**
   * Format ordinal numbers (1st, 2nd, 3rd, etc.)
   */
  formatOrdinal(number: number): string {
    try {
      const pr = new Intl.PluralRules(this.numberFormat, { type: 'ordinal' });
      const rule = pr.select(number);
      
      const suffixes: Record<string, string> = {
        one: 'st',
        two: 'nd',
        few: 'rd',
        other: 'th'
      };
      
      return `${number}${suffixes[rule] || 'th'}`;
    } catch (error) {
      console.warn('Ordinal formatting failed:', error);
      return `${number}th`;
    }
  }
}

/**
 * Date and time formatting utilities
 */
export class DateFormatter {
  private locale: string;
  private numberFormat: string;
  private timeZone: string;

  constructor(locale: SupportedLanguage = 'en', timeZone?: string) {
    this.locale = locale;
    this.numberFormat = SUPPORTED_LANGUAGES[locale]?.numberFormat || 'en-US';
    this.timeZone = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  /**
   * Format date with locale-specific formatting
   */
  formatDate(
    date: Date | string | number,
    options: Intl.DateTimeFormatOptions = {}
  ): string {
    try {
      const dateObj = new Date(date);
      return new Intl.DateTimeFormat(this.numberFormat, {
        timeZone: this.timeZone,
        ...options
      }).format(dateObj);
    } catch (error) {
      console.warn('Date formatting failed:', error);
      return new Date(date).toLocaleDateString();
    }
  }

  /**
   * Format time with locale-specific formatting
   */
  formatTime(
    date: Date | string | number,
    options: Intl.DateTimeFormatOptions = {}
  ): string {
    return this.formatDate(date, {
      hour: '2-digit',
      minute: '2-digit',
      ...options
    });
  }

  /**
   * Format date and time together
   */
  formatDateTime(
    date: Date | string | number,
    options: Intl.DateTimeFormatOptions = {}
  ): string {
    return this.formatDate(date, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    });
  }

  /**
   * Format relative time (e.g., "2 hours ago", "in 3 days")
   */
  formatRelativeTime(
    date: Date | string | number,
    options: Intl.RelativeTimeFormatOptions = {}
  ): string {
    try {
      const now = new Date();
      const target = new Date(date);
      const diffInSeconds = Math.floor((target.getTime() - now.getTime()) / 1000);
      
      const rtf = new Intl.RelativeTimeFormat(this.numberFormat, {
        numeric: 'auto',
        style: 'long',
        ...options
      });

      // Determine the appropriate unit
      const absDiff = Math.abs(diffInSeconds);
      
      if (absDiff < 60) {
        return rtf.format(diffInSeconds, 'second');
      } else if (absDiff < 3600) {
        return rtf.format(Math.round(diffInSeconds / 60), 'minute');
      } else if (absDiff < 86400) {
        return rtf.format(Math.round(diffInSeconds / 3600), 'hour');
      } else if (absDiff < 2592000) {
        return rtf.format(Math.round(diffInSeconds / 86400), 'day');
      } else if (absDiff < 31536000) {
        return rtf.format(Math.round(diffInSeconds / 2592000), 'month');
      } else {
        return rtf.format(Math.round(diffInSeconds / 31536000), 'year');
      }
    } catch (error) {
      console.warn('Relative time formatting failed:', error);
      return this.formatDate(date);
    }
  }

  /**
   * Format duration (e.g., "2h 30m", "1d 5h")
   */
  formatDuration(
    milliseconds: number,
    options: { 
      format?: 'long' | 'short' | 'narrow';
      units?: ('year' | 'month' | 'day' | 'hour' | 'minute' | 'second')[];
      maxUnits?: number;
    } = {}
  ): string {
    const { format = 'short', units = ['day', 'hour', 'minute'], maxUnits = 2 } = options;
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(months / 12);

    const values = {
      year: years,
      month: months % 12,
      day: days % 30,
      hour: hours % 24,
      minute: minutes % 60,
      second: seconds % 60
    };

    const parts: string[] = [];
    let unitCount = 0;

    for (const unit of units) {
      if (unitCount >= maxUnits) break;
      
      const value = values[unit];
      if (value > 0) {
        try {
          const formatted = new Intl.RelativeTimeFormat(this.numberFormat, { 
            numeric: 'always',
            style: format 
          }).formatToParts(value, unit);
          
          const valuePart = formatted.find(part => part.type === 'integer')?.value || value.toString();
          const unitPart = formatted.find(part => part.type === 'unit')?.value || unit;
          
          parts.push(`${valuePart}${unitPart}`);
          unitCount++;
        } catch (error) {
          console.warn(`Duration formatting failed for ${unit}:`, error);
          parts.push(`${value}${unit.charAt(0)}`);
          unitCount++;
        }
      }
    }

    return parts.length > 0 ? parts.join(' ') : '0s';
  }

  /**
   * Get calendar info for locale
   */
  getCalendarInfo(): {
    firstDayOfWeek: number;
    weekendDays: number[];
    monthNames: string[];
    weekdayNames: string[];
  } {
    try {
      const monthNames = Array.from({ length: 12 }, (_, i) => 
        this.formatDate(new Date(2023, i, 1), { month: 'long' })
      );
      
      const weekdayNames = Array.from({ length: 7 }, (_, i) => 
        this.formatDate(new Date(2023, 0, i + 1), { weekday: 'long' })
      );

      // Simplified weekend detection (most locales use Saturday/Sunday)
      const weekendDays = [0, 6]; // Sunday, Saturday
      
      // Simplified first day of week (Monday for most European locales, Sunday for US)
      const firstDayOfWeek = this.numberFormat.startsWith('en-US') ? 0 : 1;

      return {
        firstDayOfWeek,
        weekendDays,
        monthNames,
        weekdayNames
      };
    } catch (error) {
      console.warn('Calendar info generation failed:', error);
      return {
        firstDayOfWeek: 0,
        weekendDays: [0, 6],
        monthNames: ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'],
        weekdayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      };
    }
  }
}

/**
 * List formatting utilities
 */
export class ListFormatter {
  private locale: string;
  private numberFormat: string;

  constructor(locale: SupportedLanguage = 'en') {
    this.locale = locale;
    this.numberFormat = SUPPORTED_LANGUAGES[locale]?.numberFormat || 'en-US';
  }

  /**
   * Format list with locale-specific conjunctions
   */
  format(
    list: string[],
    options: Intl.ListFormatOptions = {}
  ): string {
    try {
      return new Intl.ListFormat(this.numberFormat, {
        style: 'long',
        type: 'conjunction',
        ...options
      }).format(list);
    } catch (error) {
      console.warn('List formatting failed:', error);
      return list.join(', ');
    }
  }

  /**
   * Format list with "or" conjunction
   */
  formatOr(list: string[]): string {
    return this.format(list, { type: 'disjunction' });
  }

  /**
   * Format list with units (e.g., "1 hour, 30 minutes, and 45 seconds")
   */
  formatUnits(list: string[]): string {
    return this.format(list, { type: 'unit' });
  }
}

/**
 * Pluralization utilities
 */
export class PluralizationFormatter {
  private locale: string;
  private numberFormat: string;

  constructor(locale: SupportedLanguage = 'en') {
    this.locale = locale;
    this.numberFormat = SUPPORTED_LANGUAGES[locale]?.numberFormat || 'en-US';
  }

  /**
   * Get plural rule for a number
   */
  getPluralRule(
    count: number,
    type: 'cardinal' | 'ordinal' = 'cardinal'
  ): Intl.LDMLPluralRule {
    try {
      const pr = new Intl.PluralRules(this.numberFormat, { type });
      return pr.select(count);
    } catch (error) {
      console.warn('Plural rule detection failed:', error);
      return count === 1 ? 'one' : 'other';
    }
  }

  /**
   * Format with plural-aware template
   */
  formatPlural(
    count: number,
    templates: Partial<Record<Intl.LDMLPluralRule, string>>,
    showCount: boolean = true
  ): string {
    const rule = this.getPluralRule(count);
    const template = templates[rule] || templates.other || templates.one || '';
    
    if (showCount) {
      return template.replace('{{count}}', count.toString());
    }
    
    return template;
  }
}

/**
 * Main formatter class that combines all formatting utilities
 */
export class LocaleFormatter {
  public readonly numbers: NumberFormatter;
  public readonly dates: DateFormatter;
  public readonly lists: ListFormatter;
  public readonly plurals: PluralizationFormatter;
  
  private locale: SupportedLanguage;

  constructor(locale: SupportedLanguage = 'en', timeZone?: string) {
    this.locale = locale;
    this.numbers = new NumberFormatter(locale);
    this.dates = new DateFormatter(locale, timeZone);
    this.lists = new ListFormatter(locale);
    this.plurals = new PluralizationFormatter(locale);
  }

  /**
   * Change locale for all formatters
   */
  changeLocale(locale: SupportedLanguage, timeZone?: string): void {
    this.locale = locale;
    (this.numbers as any).locale = locale;
    (this.numbers as any).numberFormat = SUPPORTED_LANGUAGES[locale]?.numberFormat || 'en-US';
    (this.dates as any).locale = locale;
    (this.dates as any).numberFormat = SUPPORTED_LANGUAGES[locale]?.numberFormat || 'en-US';
    if (timeZone) {
      (this.dates as any).timeZone = timeZone;
    }
    (this.lists as any).locale = locale;
    (this.lists as any).numberFormat = SUPPORTED_LANGUAGES[locale]?.numberFormat || 'en-US';
    (this.plurals as any).locale = locale;
    (this.plurals as any).numberFormat = SUPPORTED_LANGUAGES[locale]?.numberFormat || 'en-US';
  }

  /**
   * Get current locale
   */
  getLocale(): SupportedLanguage {
    return this.locale;
  }

  /**
   * Format file size with appropriate units
   */
  formatFileSize(bytes: number): string {
    return this.numbers.formatBytes(bytes);
  }

  /**
   * Format time ago (relative time)
   */
  formatTimeAgo(date: Date | string | number): string {
    return this.dates.formatRelativeTime(date);
  }

  /**
   * Format account count with pluralization
   */
  formatAccountCount(count: number): string {
    return this.plurals.formatPlural(count, {
      one: '{{count}} account',
      other: '{{count}} accounts'
    });
  }

  /**
   * Format device list
   */
  formatDeviceList(devices: string[]): string {
    return this.lists.format(devices);
  }
}

// Export singleton instance
let globalFormatter = new LocaleFormatter();

export const formatter = {
  getInstance: () => globalFormatter,
  setLocale: (locale: SupportedLanguage, timeZone?: string) => {
    globalFormatter.changeLocale(locale, timeZone);
  },
  createInstance: (locale: SupportedLanguage, timeZone?: string) => 
    new LocaleFormatter(locale, timeZone)
};

export default LocaleFormatter;