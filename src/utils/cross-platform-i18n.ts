/**
 * Cross-platform i18n utilities
 */

export const detectUserLanguage = (): string => {
  if (typeof navigator !== 'undefined') {
    return navigator.language.split('-')[0];
  }
  return 'en';
};

export const formatDate = (date: Date, locale: string): string => {
  return new Intl.DateTimeFormat(locale).format(date);
};

export const formatNumber = (num: number, locale: string): string => {
  return new Intl.NumberFormat(locale).format(num);
};

export const formatCurrency = (amount: number, locale: string, currency: string): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(amount);
};