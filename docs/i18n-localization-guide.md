# 2FA Studio Internationalization (i18n) System

## Overview

2FA Studio implements a comprehensive internationalization system supporting 12 languages with full cross-platform compatibility across Web, iOS, Android, and Browser Extension environments.

## Supported Languages

| Language | Code | Native Name | RTL | Currency | Completion |
|----------|------|-------------|-----|----------|------------|
| English | `en` | English | No | USD | 100% |
| Spanish | `es` | Español | No | EUR | 95% |
| French | `fr` | Français | No | EUR | 90% |
| German | `de` | Deutsch | No | EUR | 90% |
| Chinese | `zh` | 中文 | No | CNY | 85% |
| Japanese | `ja` | 日本語 | No | JPY | 85% |
| Korean | `ko` | 한국어 | No | KRW | 85% |
| Russian | `ru` | Русский | No | RUB | 80% |
| Portuguese | `pt` | Português | No | EUR | 80% |
| Italian | `it` | Italiano | No | EUR | 80% |
| Arabic | `ar` | العربية | Yes | SAR | 70% |
| Hebrew | `he` | עברית | Yes | ILS | 70% |

## Architecture

### Core Components

1. **i18next Configuration** (`src/i18n/index.ts`)
   - Platform-specific language detection
   - Dynamic resource loading
   - ICU message formatting support
   - Fallback mechanisms

2. **Translation Hooks** (`src/hooks/useLocalization.ts`)
   - `useLocalization()` - Enhanced i18n hook
   - `useLanguageSwitcher()` - Language switching with loading states
   - `useLocaleConfig()` - Locale-specific configurations
   - `usePluralization()` - Advanced pluralization

3. **Cross-Platform Utilities** (`src/utils/cross-platform-i18n.ts`)
   - Platform detection (Web, iOS, Android, Extension)
   - Cross-platform storage for preferences
   - Automatic language detection
   - Timezone handling

4. **RTL Support** (`src/utils/rtl.ts`, `src/styles/rtl.css`)
   - Right-to-left text direction
   - Layout mirroring
   - Icon flipping
   - Platform-specific adjustments

## Usage Guide

### Basic Translation

```typescript
import { useLocalization } from '@/hooks/useLocalization';

function MyComponent() {
  const { t } = useLocalization();
  
  return (
    <div>
      <h1>{t('common.appName')}</h1>
      <p>{t('common.actions.save')}</p>
    </div>
  );
}
```

### Namespaced Translations

```typescript
import { useLocalization } from '@/hooks/useLocalization';

function AuthComponent() {
  const { t } = useLocalization('auth'); // Load auth namespace
  
  return (
    <div>
      <h1>{t('login.title')}</h1>
      <button>{t('login.signIn')}</button>
    </div>
  );
}
```

### Pluralization

```typescript
import { useLocalization } from '@/hooks/useLocalization';

function AccountList({ accountCount }: { accountCount: number }) {
  const { pluralize } = useLocalization();
  
  return (
    <p>{pluralize(accountCount, 'accounts.list.accountCount')}</p>
    // Result: "1 account" or "5 accounts"
  );
}
```

### Advanced Pluralization with ICU

```typescript
// Translation file
{
  "accounts": {
    "selected": "{count, plural, =0 {No accounts selected} one {# account selected} other {# accounts selected}}"
  }
}

// Component
function AccountSelection({ selected }: { selected: number }) {
  const { t } = useLocalization();
  
  return <p>{t('accounts.selected', { count: selected })}</p>;
}
```

### Gender-Specific Translations

```typescript
import { genderUtils } from '@/utils/pluralization';

function WelcomeMessage({ gender }: { gender: 'masculine' | 'feminine' }) {
  const { currentLanguageCode } = useLocalization();
  
  return (
    <h1>{genderUtils.welcome(gender, currentLanguageCode)}</h1>
    // Spanish: "Bienvenido" (masculine) / "Bienvenida" (feminine)
  );
}
```

### Context-Aware Translations

```typescript
import { useLocalization } from '@/hooks/useLocalization';

function PoliteGreeting({ formal }: { formal: boolean }) {
  const { translateContext } = useLocalization();
  const context = formal ? 'formal' : 'informal';
  
  return (
    <p>{translateContext('greeting.hello', context)}</p>
    // Chinese: 您好 (formal) / 你好 (informal)
  );
}
```

### Number and Currency Formatting

```typescript
import { useLocalization } from '@/hooks/useLocalization';

function PricingComponent({ price }: { price: number }) {
  const { formatCurrency, formatNumber } = useLocalization();
  
  return (
    <div>
      <p>Price: {formatCurrency(price)}</p>
      <p>Users: {formatNumber(1234567)}</p>
    </div>
  );
}
```

### Date and Time Formatting

```typescript
import { useLocalization } from '@/hooks/useLocalization';

function TimestampComponent({ date }: { date: Date }) {
  const { formatDate, formatRelativeTime } = useLocalization();
  
  return (
    <div>
      <p>Created: {formatDate(date, { dateStyle: 'full' })}</p>
      <p>Last update: {formatRelativeTime(date)}</p>
    </div>
  );
}
```

### Language Switcher

```typescript
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

function SettingsPage() {
  return (
    <div>
      {/* Dropdown variant */}
      <LanguageSwitcher variant="dropdown" showFlag={true} />
      
      {/* Inline radio buttons */}
      <LanguageSwitcher variant="inline" showNativeName={true} />
      
      {/* Compact indicator */}
      <LanguageSwitcher variant="compact" />
    </div>
  );
}
```

### RTL Support

```typescript
import { useLocalization } from '@/hooks/useLocalization';
import { rtlClasses } from '@/utils/rtl';

function RTLAwareComponent() {
  const { isRTL, textDirection } = useLocalization();
  
  return (
    <div 
      className={clsx(
        'flex items-center gap-4',
        rtlClasses.flexRowReverse,
        rtlClasses.textLeft
      )}
      style={{ direction: textDirection }}
    >
      <button className={rtlClasses.marginLeft}>
        Action
      </button>
    </div>
  );
}
```

## Translation File Structure

### Directory Organization

```
src/locales/
├── en/
│   ├── common.json         # Common UI elements
│   ├── auth.json          # Authentication flows
│   ├── accounts.json      # Account management
│   ├── settings.json      # Application settings
│   ├── backup.json        # Backup and sync
│   └── errors.json        # Error messages
├── es/
│   ├── common.json
│   └── ... (same structure)
└── ... (other languages)
```

### Namespacing Convention

- `common` - General UI elements, actions, status messages
- `auth` - Authentication, login, registration, 2FA
- `accounts` - Account management, TOTP codes, folders
- `settings` - App configuration, preferences
- `backup` - Backup, restore, sync functionality
- `admin` - Admin panel specific translations
- `onboarding` - First-time user experience
- `security` - Security settings and alerts
- `errors` - Error messages and validation
- `validation` - Form validation messages

### Translation Key Format

Use dot notation with descriptive hierarchies:

```json
{
  "section": {
    "subsection": {
      "element": "Translation text",
      "elementWithContext": "Translation with {{variable}}",
      "pluralized": {
        "one": "{{count}} item",
        "other": "{{count}} items"
      }
    }
  }
}
```

## Platform-Specific Features

### Web Platform

- Automatic browser language detection
- Local storage for preferences
- Service worker integration
- Web Notifications API

### Mobile Platforms (iOS/Android)

- Capacitor Preferences API for storage
- Device language detection
- Native notification integration
- Biometric authentication prompts

### Browser Extension

- Chrome i18n API integration
- Extension storage API
- Cross-tab synchronization
- Context menu localization

## Development Tools

### Translation Extraction

Extract translation keys from source code:

```bash
yarn i18n:extract
```

This generates:
- List of all translation keys used in code
- Usage locations for each key
- Missing translation report
- Template files for new translations

### Translation Validation

Validate translation files for consistency:

```bash
yarn i18n:validate
```

Checks for:
- JSON syntax errors
- Missing translations
- Interpolation mismatches
- HTML tag consistency
- Pluralization completeness
- RTL-specific issues

### Combined Check

Run both extraction and validation:

```bash
yarn i18n:check
```

## Translation Workflow

### Adding New Languages

1. Add language to `SUPPORTED_LANGUAGES` in `src/i18n/index.ts`
2. Create language directory: `src/locales/{lang}/`
3. Copy base translations from English
4. Translate content
5. Test with language switcher
6. Run validation tools
7. Update documentation

### Adding New Translation Keys

1. Add key to English translation files
2. Use key in components with `t()` function
3. Run extraction tool to identify missing translations
4. Translate to all supported languages
5. Validate with tools
6. Test across platforms

### Updating Existing Translations

1. Modify translation in source language (English)
2. Mark other languages for review
3. Update translations in other languages
4. Run validation to ensure consistency
5. Test changes across platforms

## Best Practices

### Translation Keys

- Use descriptive, hierarchical keys
- Keep keys stable across versions
- Avoid overly long keys
- Group related translations
- Use consistent naming patterns

### Translation Content

- Keep text concise and clear
- Avoid cultural assumptions
- Use gender-neutral language when possible
- Consider text expansion in other languages
- Provide context for translators

### Technical Guidelines

- Always provide fallback translations
- Handle missing translations gracefully
- Use ICU format for complex pluralization
- Test RTL languages thoroughly
- Validate interpolation variables
- Consider performance impact

### RTL Languages

- Test layout with RTL text
- Flip directional icons appropriately
- Handle mixed LTR/RTL content
- Consider reading patterns
- Test on actual devices

## Testing

### Manual Testing

1. Switch between all supported languages
2. Test RTL languages for layout issues
3. Verify pluralization with different counts
4. Check formatting with various locales
5. Test cross-platform functionality

### Automated Testing

```typescript
// Test translation loading
describe('i18n', () => {
  it('should load translations for all languages', async () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      const i18n = await getI18n();
      await i18n.changeLanguage(lang);
      expect(i18n.t('common.appName')).toBeDefined();
    }
  });
});
```

## Performance Optimization

### Lazy Loading

- Load translations on demand
- Split by namespace
- Cache loaded translations
- Preload critical translations

### Bundle Optimization

- Tree shake unused translations
- Compress translation files
- Use build-time optimization
- Minimize runtime overhead

## Troubleshooting

### Common Issues

1. **Translation not showing**
   - Check key spelling
   - Verify namespace loading
   - Check fallback language

2. **RTL layout broken**
   - Verify CSS classes
   - Check icon flipping
   - Test with actual RTL text

3. **Pluralization not working**
   - Verify ICU format
   - Check plural rules for language
   - Test with different counts

4. **Platform-specific issues**
   - Check storage permissions
   - Verify platform detection
   - Test cross-platform sync

### Debug Mode

Enable debug logging in development:

```typescript
// In i18n configuration
debug: import.meta.env.DEV
```

## Contributing

### Translation Contributors

1. Fork the repository
2. Add/update translations in appropriate files
3. Run validation tools
4. Test changes locally
5. Submit pull request with translation updates

### Code Contributors

1. Follow existing patterns for i18n integration
2. Add translation keys for new features
3. Update documentation
4. Run tests and validation
5. Submit pull request with code and translation changes

## Roadmap

- [ ] Machine translation integration for initial drafts
- [ ] Translation management UI for non-developers
- [ ] Crowdsource translation platform integration
- [ ] Advanced context-aware translations
- [ ] Voice interface localization
- [ ] Regional dialect support

## Resources

- [i18next Documentation](https://www.i18next.com/)
- [ICU Message Format](https://formatjs.io/docs/core-concepts/icu-syntax/)
- [Unicode Bidirectional Algorithm](https://unicode.org/reports/tr9/)
- [CLDR Locale Data](https://cldr.unicode.org/)
- [BCP 47 Language Tags](https://tools.ietf.org/html/bcp47)