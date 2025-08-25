import { SUPPORTED_LANGUAGES, SupportedLanguage } from '@/i18n';

/**
 * RTL (Right-to-Left) language support utilities
 */

/**
 * Check if a language uses RTL text direction
 */
export function isRTLLanguage(language: string): boolean {
  const langConfig = SUPPORTED_LANGUAGES[language as SupportedLanguage];
  return langConfig?.rtl || false;
}

/**
 * Get text direction for CSS
 */
export function getTextDirection(language: string): 'ltr' | 'rtl' {
  return isRTLLanguage(language) ? 'rtl' : 'ltr';
}

/**
 * RTL-aware class names for Tailwind CSS
 */
export const rtlClasses = {
  // Margin and Padding
  marginLeft: 'ml-2 rtl:mr-2 rtl:ml-0',
  marginRight: 'mr-2 rtl:ml-2 rtl:mr-0',
  paddingLeft: 'pl-4 rtl:pr-4 rtl:pl-0',
  paddingRight: 'pr-4 rtl:pl-4 rtl:pr-0',
  
  // Positioning
  left: 'left-0 rtl:right-0 rtl:left-auto',
  right: 'right-0 rtl:left-0 rtl:right-auto',
  
  // Text alignment
  textLeft: 'text-left rtl:text-right',
  textRight: 'text-right rtl:text-left',
  
  // Flexbox
  flexRowReverse: 'flex-row rtl:flex-row-reverse',
  
  // Borders
  borderLeft: 'border-l rtl:border-r rtl:border-l-0',
  borderRight: 'border-r rtl:border-l rtl:border-r-0',
  
  // Rounded corners
  roundedLeft: 'rounded-l rtl:rounded-r rtl:rounded-l-none',
  roundedRight: 'rounded-r rtl:rounded-l rtl:rounded-r-none',
  
  // Transform
  scaleX: 'rtl:scale-x-[-1]',
  
  // Common UI patterns
  dropdownLeft: 'left-0 rtl:right-0 rtl:left-auto',
  dropdownRight: 'right-0 rtl:left-0 rtl:right-auto',
  
  // Icons that should flip in RTL
  iconFlip: 'rtl:scale-x-[-1]',
  
  // Form elements
  inputPaddingLeft: 'pl-3 rtl:pr-3 rtl:pl-2',
  inputPaddingRight: 'pr-10 rtl:pl-10 rtl:pr-3',
  
  // Navigation
  navItemMargin: 'ml-4 rtl:mr-4 rtl:ml-0',
  
  // Cards and containers
  cardPadding: 'pl-6 pr-4 rtl:pl-4 rtl:pr-6'
};

/**
 * Create RTL-aware CSS class string
 */
export function createRTLClass(baseClass: string, rtlClass?: string): string {
  if (!rtlClass) {
    return baseClass;
  }
  return `${baseClass} rtl:${rtlClass}`;
}

/**
 * Get appropriate CSS transforms for RTL
 */
export function getRTLTransform(transforms: {
  translateX?: string;
  scaleX?: number;
  rotate?: string;
}): string {
  const { translateX, scaleX, rotate } = transforms;
  const transformParts = [];
  
  if (translateX) {
    transformParts.push(`translateX(${translateX})`);
  }
  
  if (scaleX !== undefined) {
    transformParts.push(`scaleX(${scaleX})`);
  }
  
  if (rotate) {
    transformParts.push(`rotate(${rotate})`);
  }
  
  return transformParts.join(' ');
}

/**
 * RTL-aware positioning helper
 */
export function getRTLPosition(
  position: 'left' | 'right',
  value: string,
  isRTL: boolean
): Record<string, string> {
  if (!isRTL) {
    return { [position]: value };
  }
  
  // Flip left/right for RTL
  const flippedPosition = position === 'left' ? 'right' : 'left';
  return { [flippedPosition]: value };
}

/**
 * RTL-aware margin/padding helper
 */
export function getRTLSpacing(
  side: 'left' | 'right' | 'top' | 'bottom',
  value: string,
  isRTL: boolean
): Record<string, string> {
  if (side === 'top' || side === 'bottom' || !isRTL) {
    return { [`margin${side.charAt(0).toUpperCase() + side.slice(1)}`]: value };
  }
  
  // Flip left/right margins for RTL
  const flippedSide = side === 'left' ? 'right' : 'left';
  const property = `margin${flippedSide.charAt(0).toUpperCase() + flippedSide.slice(1)}`;
  return { [property]: value };
}

/**
 * Common RTL style patterns
 */
export const rtlStyles = {
  // Container styles
  container: (isRTL: boolean) => ({
    direction: isRTL ? 'rtl' : 'ltr',
    textAlign: isRTL ? 'right' : 'left'
  }),
  
  // Flex container
  flexContainer: (isRTL: boolean) => ({
    direction: isRTL ? 'rtl' : 'ltr',
    flexDirection: isRTL ? 'row-reverse' : 'row'
  }),
  
  // Input field
  inputField: (isRTL: boolean) => ({
    direction: isRTL ? 'rtl' : 'ltr',
    textAlign: isRTL ? 'right' : 'left',
    paddingLeft: isRTL ? '12px' : '16px',
    paddingRight: isRTL ? '16px' : '12px'
  }),
  
  // Modal or dialog
  modal: (isRTL: boolean) => ({
    direction: isRTL ? 'rtl' : 'ltr'
  }),
  
  // Tooltip positioning
  tooltip: (isRTL: boolean, position: 'left' | 'right') => {
    if (position === 'left') {
      return isRTL ? { right: '100%', left: 'auto' } : { left: '100%', right: 'auto' };
    } else {
      return isRTL ? { left: '100%', right: 'auto' } : { right: '100%', left: 'auto' };
    }
  }
};

/**
 * Icons that should be flipped in RTL languages
 */
export const iconsToFlipInRTL = [
  'arrow-left',
  'arrow-right',
  'chevron-left',
  'chevron-right',
  'arrow-narrow-left',
  'arrow-narrow-right',
  'arrow-sm-left',
  'arrow-sm-right',
  'reply',
  'external-link',
  'logout',
  'login'
];

/**
 * Check if an icon should be flipped in RTL
 */
export function shouldFlipIconInRTL(iconName: string): boolean {
  return iconsToFlipInRTL.some(name => iconName.toLowerCase().includes(name));
}

/**
 * Format number for RTL languages with proper digit direction
 */
export function formatNumberForRTL(
  number: number | string,
  locale: string,
  options?: Intl.NumberFormatOptions
): string {
  try {
    const numValue = typeof number === 'string' ? parseFloat(number) : number;
    return new Intl.NumberFormat(locale, options).format(numValue);
  } catch (error) {
    console.warn('Number formatting failed:', error);
    return number.toString();
  }
}

/**
 * Format date for RTL languages
 */
export function formatDateForRTL(
  date: Date | string,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const dateValue = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, options).format(dateValue);
  } catch (error) {
    console.warn('Date formatting failed:', error);
    return date.toString();
  }
}

/**
 * Keyboard navigation helper for RTL
 */
export function getNavigationKey(key: string, isRTL: boolean): string {
  if (!isRTL) return key;
  
  // Flip arrow keys for RTL
  switch (key) {
    case 'ArrowLeft':
      return 'ArrowRight';
    case 'ArrowRight':
      return 'ArrowLeft';
    default:
      return key;
  }
}

/**
 * Animation direction helper for RTL
 */
export function getAnimationDirection(
  direction: 'left' | 'right' | 'up' | 'down',
  isRTL: boolean
): 'left' | 'right' | 'up' | 'down' {
  if (!isRTL || (direction !== 'left' && direction !== 'right')) {
    return direction;
  }
  
  return direction === 'left' ? 'right' : 'left';
}

export default {
  isRTLLanguage,
  getTextDirection,
  rtlClasses,
  createRTLClass,
  getRTLTransform,
  getRTLPosition,
  getRTLSpacing,
  rtlStyles,
  shouldFlipIconInRTL,
  formatNumberForRTL,
  formatDateForRTL,
  getNavigationKey,
  getAnimationDirection
};