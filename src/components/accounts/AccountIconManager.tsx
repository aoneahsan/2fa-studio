import React, { useState, useRef } from 'react';
import { Card } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { 
  PhotoIcon, 
  LinkIcon, 
  MagnifyingGlassIcon,
  ArrowUpTrayIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

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
            Apply Icon
          </Button>
        </div>
      </Card>
    </div>
  );
};

// Simple icon display component
export const AccountIcon: React.FC<{
  icon?: string;
  issuer: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ icon, issuer, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
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
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 50%)`;
  };

  return (
    <div 
      className={`${sizeClasses[size]} rounded-lg flex items-center justify-center overflow-hidden ${className}`}
      style={{ backgroundColor: icon ? 'transparent' : getColorFromString(issuer) + '20' }}
    >
      {icon ? (
        <img 
          src={icon} 
          alt={issuer}
          className="w-full h-full object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <span 
          className="font-semibold"
          style={{ color: getColorFromString(issuer) }}
        >
          {getInitials(issuer)}
        </span>
      )}
    </div>
  );
};