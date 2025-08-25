import React, { useState, useRef, useCallback } from 'react';
import { Card } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { 
  PhotoIcon, 
  LinkIcon, 
  MagnifyingGlassIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
  CubeIcon,
  SparklesIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { IconSearchComponent } from '@components/icons/IconSearchComponent';
import { useServiceIcon, useCustomIcons, useIconTheme } from '@/hooks/useIcons';
import { ServiceIcon, IconTheme } from '@/types/icon';
import { iconService } from '@/services/icon.service';
import { iconThemeService } from '@/services/icon-theme.service';
import { IconValidator } from '@/utils/icon-utils';

interface AccountIconManagerProps {
  currentIcon?: string;
  issuer: string;
  onIconChange: (iconUrl: string) => void;
  onClose?: () => void;
}

// Popular service icons (in production, these would be hosted)
const POPULAR_ICONS = [
  { name: 'Google', url: '/icons/google.svg', color: '#4285F4' },
  { name: 'GitHub', url: '/icons/github.svg', color: '#181717' },
  { name: 'Microsoft', url: '/icons/microsoft.svg', color: '#0078D4' },
  { name: 'Amazon', url: '/icons/amazon.svg', color: '#FF9900' },
  { name: 'Facebook', url: '/icons/facebook.svg', color: '#1877F2' },
  { name: 'Twitter', url: '/icons/twitter.svg', color: '#1DA1F2' },
  { name: 'LinkedIn', url: '/icons/linkedin.svg', color: '#0A66C2' },
  { name: 'Dropbox', url: '/icons/dropbox.svg', color: '#0061FF' },
  { name: 'Slack', url: '/icons/slack.svg', color: '#4A154B' },
  { name: 'Discord', url: '/icons/discord.svg', color: '#5865F2' },
];

export const AccountIconManager: React.FC<AccountIconManagerProps> = ({
  currentIcon,
  issuer,
  onIconChange,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'popular' | 'url' | 'upload'>('popular');
  const [iconUrl, setIconUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewUrl, setPreviewUrl] = useState(currentIcon || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredIcons = POPULAR_ICONS.filter(icon =>
    icon.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreviewUrl(result);
        onIconChange(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlSubmit = () => {
    if (iconUrl) {
      setPreviewUrl(iconUrl);
      onIconChange(iconUrl);
    }
  };

  const handleIconSelect = (url: string) => {
    setPreviewUrl(url);
    onIconChange(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Choose Account Icon</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Preview */}
        <div className="mb-6 flex items-center gap-4 p-4 bg-muted rounded-lg">
          <div className="w-16 h-16 rounded-lg bg-background flex items-center justify-center overflow-hidden">
            {previewUrl ? (
              <img 
                src={previewUrl} 
                alt={issuer}
                className="w-full h-full object-contain"
                onError={() => setPreviewUrl('')}
              />
            ) : (
              <PhotoIcon className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="font-medium">{issuer}</p>
            <p className="text-sm text-muted-foreground">
              {previewUrl ? 'Custom icon selected' : 'No icon selected'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('popular')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'popular'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            Popular Icons
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'url'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            Icon URL
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'upload'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            Upload Icon
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {activeTab === 'popular' && (
            <div>
              {/* Search */}
              <div className="relative mb-4">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search icons..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
              </div>

              {/* Icon Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {filteredIcons.map((icon) => (
                  <button
                    key={icon.name}
                    onClick={() => handleIconSelect(icon.url)}
                    className={`p-3 rounded-lg border hover:border-primary transition-colors ${
                      previewUrl === icon.url ? 'border-primary bg-primary/10' : ''
                    }`}
                    title={icon.name}
                  >
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: icon.color + '20' }}
                    >
                      <div className="w-8 h-8 bg-current" style={{ color: icon.color }} />
                    </div>
                  </button>
                ))}
              </div>

              {filteredIcons.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No icons found for "{searchQuery}"
                </div>
              )}
            </div>
          )}

          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Icon URL</label>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="url"
                      value={iconUrl}
                      onChange={(e) => setIconUrl(e.target.value)}
                      placeholder="https://example.com/icon.png"
                      className="w-full pl-10 pr-4 py-2 border rounded-lg"
                    />
                  </div>
                  <Button onClick={handleUrlSubmit} disabled={!iconUrl}>
                    Apply
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Enter the URL of an icon image (PNG, SVG, or JPG)
              </p>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="text-center py-8">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <ArrowUpTrayIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
              >
                Choose File
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                Upload an icon image (PNG, SVG, or JPG, max 1MB)
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={() => onClose?.()}
            disabled={!previewUrl}
          >
            Use Selected Icon
          </Button>
        </div>
      </Card>
    </div>
  );
};

// Enhanced icon display component using the new icon system
export const AccountIcon: React.FC<{
  icon?: string;
  issuer: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /** Enable automatic icon detection */
  autoDetect?: boolean;
  /** Enable theme application */
  applyTheme?: boolean;
  /** Theme override */
  theme?: IconTheme;
  /** Show loading state */
  showLoading?: boolean;
  /** Enable hover effects */
  enableHover?: boolean;
  /** Click handler */
  onClick?: () => void;
}> = ({ 
  icon, 
  issuer, 
  size = 'md', 
  className = '',
  autoDetect = true,
  applyTheme = true,
  theme,
  showLoading = false,
  enableHover = false,
  onClick
}) => {
  const { theme: currentTheme } = useIconTheme();
  const effectiveTheme = theme || currentTheme;
  
  // Use auto-detection if no icon provided
  const { iconUrl: detectedIcon, isLoading } = useServiceIcon(
    issuer,
    { 
      enabled: autoDetect && !icon,
      theme: effectiveTheme,
      preferCustom: true
    }
  );
  
  const finalIcon = icon || detectedIcon;
  const isClickable = !!onClick;
  const isLoadingState = showLoading && isLoading;

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getColorFromString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    const saturation = 65 + (Math.abs(hash) % 20); // 65-85%
    const lightness = 45 + (Math.abs(hash) % 20);  // 45-65%
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  // Apply theme transformations if enabled
  const themeResult = applyTheme && finalIcon 
    ? iconThemeService.applyThemeToIcon(finalIcon, effectiveTheme)
    : { url: finalIcon };

  const baseClassName = `
    ${sizeClasses[size]} 
    rounded-lg 
    flex 
    items-center 
    justify-center 
    overflow-hidden 
    transition-all 
    duration-200
    ${isClickable ? 'cursor-pointer' : ''}
    ${enableHover ? 'hover:scale-105 hover:shadow-md' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const backgroundStyle = finalIcon 
    ? {} 
    : { backgroundColor: getColorFromString(issuer) + '20' };

  const combinedStyle = {
    ...backgroundStyle,
    ...themeResult.style
  };

  if (isLoadingState) {
    return (
      <div 
        className={`${baseClassName} bg-muted animate-pulse`}
        onClick={onClick}
      >
        <div className="w-1/2 h-1/2 bg-muted-foreground/20 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div 
      className={baseClassName}
      style={combinedStyle}
      onClick={onClick}
      title={issuer}
    >
      {finalIcon ? (
        <img 
          src={themeResult.url}
          alt={issuer}
          className="w-full h-full object-contain"
          style={themeResult.style}
          onError={(e) => {
            // Hide failed image and show fallback
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              const fallback = parent.querySelector('.fallback-content') as HTMLElement;
              if (fallback) {
                fallback.style.display = 'flex';
              }
            }
          }}
        />
      ) : null}
      
      {/* Fallback content */}
      <div 
        className={`fallback-content w-full h-full flex items-center justify-center ${finalIcon ? 'hidden' : ''}`}
        style={{ 
          color: getColorFromString(issuer),
          fontSize: size === 'sm' ? '12px' : size === 'md' ? '14px' : size === 'lg' ? '18px' : '22px'
        }}
      >
        <span className="font-semibold">
          {getInitials(issuer)}
        </span>
      </div>
    </div>
  );
};