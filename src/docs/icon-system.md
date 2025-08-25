# 2FA Studio Icon System Documentation

## Overview

The 2FA Studio Icon System is a comprehensive solution for managing, displaying, and customizing icons for two-factor authentication accounts. It provides automatic icon detection, custom icon uploads, theme support, caching, analytics, and cross-platform compatibility.

## Architecture

### Core Components

1. **IconService** - Main service orchestrating all icon operations
2. **IconDatabase** - Comprehensive database of service icons with metadata
3. **IconCacheService** - Performance optimization through intelligent caching
4. **IconFetchingService** - Automatic icon detection from multiple sources
5. **IconUploadService** - Custom icon upload and management
6. **IconThemeService** - Theme management and transformations
7. **IconAnalyticsService** - Usage tracking and optimization
8. **FallbackIconGenerator** - Automatic fallback icon generation

### React Integration

- **useIcons** hooks for easy React integration
- **AccountIconManager** - Advanced icon selection component
- **IconSearchComponent** - Comprehensive icon search interface
- **AccountIcon** - Enhanced icon display component

## Quick Start

### Basic Icon Display

```tsx
import { AccountIcon } from '@/components/accounts/AccountIconManager';

// Simple usage with auto-detection
<AccountIcon issuer="Google" />

// With custom icon
<AccountIcon 
  issuer="MyService" 
  icon="/custom-icon.png"
  size="lg"
/>

// With theme and hover effects
<AccountIcon 
  issuer="GitHub"
  size="md"
  applyTheme={true}
  enableHover={true}
  onClick={() => console.log('Icon clicked')}
/>
```

### Icon Management

```tsx
import { useServiceIcon, useCustomIcons } from '@/hooks/useIcons';

function MyComponent() {
  // Auto-detect icon for service
  const { iconUrl, source, isLoading } = useServiceIcon('Google');
  
  // Manage custom icons
  const { icons, uploadIcon, deleteIcon } = useCustomIcons();
  
  const handleFileUpload = async (file: File) => {
    try {
      const customIcon = await uploadIcon(file, 'MyService');
      console.log('Uploaded:', customIcon);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };
  
  return (
    <div>
      {isLoading ? 'Loading...' : (
        <img src={iconUrl} alt="Service icon" />
      )}
    </div>
  );
}
```

### Icon Search

```tsx
import { IconSearchComponent } from '@/components/icons/IconSearchComponent';

function IconPicker() {
  const handleIconSelect = (icon: ServiceIcon) => {
    console.log('Selected icon:', icon);
  };

  return (
    <IconSearchComponent
      onIconSelect={handleIconSelect}
      initialQuery="Google"
      showPopularIcons={true}
      enableFilters={true}
      size="md"
    />
  );
}
```

## Advanced Usage

### Theme Management

```tsx
import { useIconTheme } from '@/hooks/useIcons';
import { iconThemeService } from '@/services/icon-theme.service';

function ThemeSettings() {
  const { theme, setIconTheme, toggleTheme } = useIconTheme();
  
  // Apply theme to specific icon
  const themedIcon = iconThemeService.applyThemeToIcon('/icon.png', 'dark');
  
  return (
    <div>
      <button onClick={toggleTheme}>
        Toggle Theme (Current: {theme})
      </button>
      
      <img 
        src={themedIcon.url} 
        style={themedIcon.style}
        alt="Themed icon" 
      />
    </div>
  );
}
```

### Custom Icon Upload

```tsx
import { iconService } from '@/services/icon.service';

async function uploadCustomIcon(file: File, serviceName: string, userId: string) {
  try {
    const customIcon = await iconService.uploadCustomIcon(file, serviceName, userId);
    
    console.log('Upload successful:', {
      id: customIcon.id,
      size: customIcon.size,
      format: customIcon.format,
      processing: customIcon.processing
    });
    
    return customIcon;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}
```

### Icon Analytics

```tsx
import { useIconAnalytics } from '@/hooks/useIcons';

function IconStats({ iconId }: { iconId: string }) {
  const { stats, isLoading } = useIconAnalytics(iconId, 'week');
  
  if (isLoading) return <div>Loading stats...</div>;
  
  return (
    <div>
      <h3>Icon Usage Statistics</h3>
      <p>Views: {stats?.views}</p>
      <p>Selections: {stats?.selections}</p>
      <p>Downloads: {stats?.downloads}</p>
    </div>
  );
}
```

## Configuration

### Icon System Configuration

```tsx
import { IconService } from '@/services/icon.service';

const iconService = IconService.getInstance({
  enableAnalytics: true,
  enableCaching: true,
  cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
  maxCacheSize: 100 * 1024 * 1024, // 100MB
  enableAutoDetection: true,
  defaultTheme: 'auto',
  uploadLimits: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedFormats: ['svg', 'png', 'jpg', 'webp'],
    maxUploadsPerDay: 50,
    maxDimensions: { width: 1024, height: 1024 }
  }
});
```

### Theme Configuration

```tsx
import { iconThemeService } from '@/services/icon-theme.service';

// Create custom theme
await iconThemeService.createCustomTheme('myTheme', {
  displayName: 'My Custom Theme',
  description: 'A custom theme for my app',
  colors: {
    primary: '#ff6b6b',
    secondary: '#4ecdc4',
    background: '#ffffff',
    text: '#2c3e50',
    border: '#bdc3c7',
    accents: ['#ff6b6b', '#4ecdc4', '#45b7d1']
  },
  transformations: [
    {
      type: 'filter',
      parameters: { saturation: 1.2, brightness: 1.05 },
      applyToFormats: ['png', 'jpg', 'webp'],
      cssFilter: 'saturate(1.2) brightness(1.05)'
    }
  ]
});
```

## API Reference

### IconService

#### Methods

- `getIconForService(serviceName, options)` - Get icon for a service with auto-detection
- `searchIcons(query, userId?)` - Search available icons
- `uploadCustomIcon(file, serviceName, userId)` - Upload custom icon
- `getUserCustomIcons(userId)` - Get user's custom icons
- `deleteCustomIcon(iconId, userId)` - Delete custom icon
- `generateFallbackIcon(serviceName, options?)` - Generate fallback icon
- `clearCache()` - Clear icon cache
- `getCacheStats()` - Get cache statistics

#### Options

```tsx
interface IconServiceOptions {
  size?: IconSize; // '16x16' | '24x24' | ... | '512x512' | 'vector'
  format?: IconFormat; // 'svg' | 'png' | 'jpg' | 'webp' | 'ico' | 'gif'
  theme?: IconTheme; // 'auto' | 'light' | 'dark' | 'colorful' | 'monochrome' | 'high-contrast' | 'system'
  userId?: string;
  preferCustom?: boolean;
}
```

### React Hooks

#### useServiceIcon(serviceName, options)

Returns icon information for a service with auto-detection.

```tsx
const {
  iconUrl,      // Icon URL or null
  source,       // 'database' | 'custom' | 'external' | 'fallback'
  loading,      // Loading state
  error,        // Error message
  cached,       // Whether icon is cached
  refetch       // Function to refetch icon
} = useServiceIcon('Google', { preferCustom: true });
```

#### useIconSearch(initialQuery, options)

Provides icon search functionality.

```tsx
const {
  query,        // Current search query
  search,       // Function to search
  results,      // Search results
  suggestions,  // Search suggestions
  isLoading,    // Loading state
  error,        // Error message
  hasResults,   // Whether there are results
  clearSearch   // Function to clear search
} = useIconSearch('', { autoSearch: true });
```

#### useCustomIcons()

Manages user's custom icons.

```tsx
const {
  icons,        // User's custom icons
  uploadIcon,   // Function to upload icon
  deleteIcon,   // Function to delete icon
  isLoading,    // Loading state
  error,        // Error message
  hasIcons      // Whether user has custom icons
} = useCustomIcons();
```

#### useIconTheme()

Manages icon themes.

```tsx
const {
  theme,        // Current theme
  setIconTheme, // Function to set theme
  toggleTheme,  // Function to toggle theme
  isDark,       // Whether current theme is dark
  isLight,      // Whether current theme is light
  isAuto        // Whether theme is auto
} = useIconTheme();
```

### Components

#### AccountIcon

Enhanced icon display component.

```tsx
interface AccountIconProps {
  icon?: string;
  issuer: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  autoDetect?: boolean;
  applyTheme?: boolean;
  theme?: IconTheme;
  showLoading?: boolean;
  enableHover?: boolean;
  onClick?: () => void;
}
```

#### IconSearchComponent

Comprehensive icon search interface.

```tsx
interface IconSearchComponentProps {
  onIconSelect: (icon: ServiceIcon) => void;
  onClose?: () => void;
  selectedIconId?: string;
  initialQuery?: string;
  showPopularIcons?: boolean;
  enableFilters?: boolean;
  maxResults?: number;
  size?: 'sm' | 'md' | 'lg';
  themeOverride?: IconTheme;
}
```

#### AccountIconManager

Advanced icon selection modal.

```tsx
interface AccountIconManagerProps {
  currentIcon?: string;
  issuer: string;
  onIconChange: (iconUrl: string, source?) => void;
  onClose?: () => void;
  enableAdvanced?: boolean;
  enableThemes?: boolean;
  maxFileSize?: number;
}
```

## Icon Database

### Service Coverage

The icon database includes icons for popular services across categories:

- **Technology**: Google, Microsoft, GitHub, Amazon AWS
- **Social Media**: Facebook, Twitter/X, Instagram, LinkedIn
- **Communication**: Discord, Slack, Zoom, Teams
- **Finance**: PayPal, Stripe, Banking services
- **Cryptocurrency**: Coinbase, Binance, crypto wallets
- **Gaming**: Steam, Epic Games, PlayStation, Xbox
- **Cloud Services**: Dropbox, OneDrive, Google Drive
- **Security**: LastPass, 1Password, Authy
- **Developer Tools**: GitLab, Bitbucket, Jira
- **E-commerce**: Shopify, WooCommerce, Magento

### Icon Metadata

Each icon includes comprehensive metadata:

```tsx
interface ServiceIcon {
  id: string;
  name: string;
  aliases: string[];
  category: IconCategory;
  variants: IconVariant[];
  brand: BrandInfo;
  metadata: IconMetadata;
  analytics: IconAnalytics;
  quality: IconQuality;
  createdAt: number;
  updatedAt: number;
}
```

### Quality Scores

Icons are rated on multiple factors:
- **Format Quality** (30%): Vector format availability, multiple sizes
- **Brand Compliance** (40%): Official brand guidelines adherence  
- **User Rating** (20%): Community ratings and feedback
- **Accessibility** (10%): WCAG compliance, contrast ratios

## Performance Optimization

### Caching Strategy

- **Memory Cache**: Frequently accessed icons
- **Local Storage**: Persistent caching across sessions
- **CDN Integration**: Global content delivery
- **Intelligent Preloading**: Predictive icon loading

### Bundle Optimization

- **Tree Shaking**: Only import needed components
- **Code Splitting**: Lazy load icon search components
- **Compression**: Optimized icon formats (WebP, AVIF)
- **Progressive Loading**: Critical icons first

### Network Optimization

- **Connection Pooling**: Reuse HTTP connections
- **Request Batching**: Combine multiple icon requests
- **Offline Support**: Service worker caching
- **Background Sync**: Queue uploads when offline

## Security & Privacy

### Data Protection

- **Encryption**: Custom icons encrypted at rest
- **Access Control**: User-specific icon isolation
- **Audit Logging**: Track icon access and modifications
- **GDPR Compliance**: Right to erasure, data portability

### Content Security

- **Input Validation**: Comprehensive file validation
- **Malware Scanning**: Uploaded icon security checks
- **Rate Limiting**: Prevent abuse
- **Content Filtering**: Block inappropriate content

## Accessibility

### WCAG Compliance

- **Alt Text**: Comprehensive alternative text
- **Contrast Ratios**: Minimum 4.5:1 contrast
- **Screen Readers**: Full screen reader support
- **Keyboard Navigation**: Complete keyboard accessibility

### Inclusive Design

- **High Contrast Mode**: Enhanced visibility
- **Color Blind Support**: Color-independent design
- **Reduced Motion**: Respect motion preferences
- **Font Scaling**: Support system font scaling

## Cross-Platform Support

### Web Browsers

- Chrome, Firefox, Safari, Edge
- Progressive Web App support
- Service Worker integration
- WebP and AVIF format support

### Mobile Platforms

- **Android**: Capacitor native integration
- **iOS**: Capacitor native integration
- **React Native**: Compatible components
- **PWA**: Mobile-optimized experience

### Desktop Applications

- **Electron**: Desktop app support
- **Tauri**: Rust-based desktop apps
- **Native**: Platform-specific optimizations

## Migration Guide

### From Basic Icon System

1. **Update Imports**:
   ```tsx
   // Old
   import { AccountIcon } from './AccountIcon';
   
   // New
   import { AccountIcon } from '@/components/accounts/AccountIconManager';
   ```

2. **Update Props**:
   ```tsx
   // Old
   <AccountIcon icon="/icon.png" name="Google" />
   
   // New
   <AccountIcon icon="/icon.png" issuer="Google" autoDetect={true} />
   ```

3. **Add Theme Support**:
   ```tsx
   <AccountIcon 
     issuer="Google" 
     applyTheme={true}
     enableHover={true}
   />
   ```

### Breaking Changes

- `name` prop renamed to `issuer`
- Icon detection now async by default
- Theme application requires explicit opt-in
- Custom upload requires authentication

## Contributing

### Adding New Icons

1. **Icon Requirements**:
   - SVG format preferred
   - Minimum 64x64 pixels
   - Follow brand guidelines
   - Include metadata

2. **Submission Process**:
   - Fork repository
   - Add icon to database
   - Update metadata
   - Submit pull request

3. **Quality Guidelines**:
   - High contrast ratios
   - Clean vector paths
   - Proper attribution
   - Cross-browser testing

### Reporting Issues

- Use GitHub issues
- Include browser/platform info
- Provide reproduction steps
- Attach screenshots if relevant

## Troubleshooting

### Common Issues

**Icon Not Loading**
```tsx
// Check if service is in database
const icon = IconDatabase.findIconByName('ServiceName');
if (!icon) {
  console.log('Service not in database');
}

// Enable auto-detection
<AccountIcon issuer="ServiceName" autoDetect={true} />
```

**Theme Not Applied**
```tsx
// Ensure theme application is enabled
<AccountIcon issuer="Google" applyTheme={true} />

// Check theme service status
console.log('Current theme:', iconThemeService.getCurrentTheme());
```

**Upload Failing**
```tsx
// Check file validation
const validation = await IconValidator.validateFile(file);
if (!validation.valid) {
  console.log('Validation errors:', validation.errors);
}
```

**Cache Issues**
```tsx
// Clear icon cache
await iconService.clearCache();

// Check cache stats
const stats = iconService.getCacheStats();
console.log('Cache stats:', stats);
```

### Debug Mode

Enable debug mode for detailed logging:

```tsx
// Enable in development
if (process.env.NODE_ENV === 'development') {
  window.iconSystemDebug = true;
}
```

### Performance Monitoring

Monitor icon system performance:

```tsx
import { iconService } from '@/services/icon.service';

// Get performance stats
const stats = iconService.getCacheStats();
console.log('Performance stats:', {
  cacheHitRate: stats.hitRate,
  cacheSize: stats.totalSize,
  itemCount: stats.itemCount
});
```

## Changelog

### v2.0.0 (Current)
- Complete system redesign
- Theme support
- Advanced search
- Custom uploads
- Analytics integration
- Performance optimizations

### v1.0.0 (Legacy)
- Basic icon display
- Static icon database
- Simple fallbacks

## License

This icon system is part of 2FA Studio and follows the project's licensing terms. Individual icons may have separate licensing requirements from their respective brands.