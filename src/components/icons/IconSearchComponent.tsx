/**
 * Comprehensive Icon Search Component
 * Advanced icon search interface with filters, categories, and preview
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  MagnifyingGlassIcon, 
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  StarIcon,
  ClockIcon,
  TagIcon,
  FunnelIcon,
  ArrowPathIcon,
  EyeIcon,
  ChevronDownIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { Card } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { useIconSearch, useIconCategories, useIconTheme, usePopularIcons } from '@/hooks/useIcons';
import { IconCategory, IconSortOption, ServiceIcon, IconTheme } from '@/types/icon';

interface IconSearchComponentProps {
  /** Called when an icon is selected */
  onIconSelect: (icon: ServiceIcon) => void;
  
  /** Called when search is closed */
  onClose?: () => void;
  
  /** Current selected icon ID */
  selectedIconId?: string;
  
  /** Initial search query */
  initialQuery?: string;
  
  /** Show popular icons when search is empty */
  showPopularIcons?: boolean;
  
  /** Enable advanced filters */
  enableFilters?: boolean;
  
  /** Maximum number of results to show */
  maxResults?: number;
  
  /** Component size */
  size?: 'sm' | 'md' | 'lg';
  
  /** Theme override */
  themeOverride?: IconTheme;
}

interface FilterState {
  category: IconCategory | 'all';
  sort: IconSortOption;
  minQuality: number;
  showFilters: boolean;
}

export const IconSearchComponent: React.FC<IconSearchComponentProps> = ({
  onIconSelect,
  onClose,
  selectedIconId,
  initialQuery = '',
  showPopularIcons = true,
  enableFilters = true,
  maxResults = 50,
  size = 'md',
  themeOverride
}) => {
  const { theme, setIconTheme } = useIconTheme();
  const categories = useIconCategories();
  const { icons: popularIcons, isLoading: popularLoading } = usePopularIcons(12);
  
  const [filters, setFilters] = useState<FilterState>({
    category: 'all',
    sort: 'relevance',
    minQuality: 0,
    showFilters: false
  });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewIcon, setPreviewIcon] = useState<ServiceIcon | null>(null);

  const {
    query,
    search,
    results,
    suggestions,
    isLoading,
    error,
    total,
    executionTime,
    hasResults,
    clearSearch
  } = useIconSearch(initialQuery, {
    category: filters.category !== 'all' ? filters.category : undefined,
    minQuality: filters.minQuality,
    limit: maxResults,
    autoSearch: true,
    debounceMs: 300
  });

  // Size configurations
  const sizeConfig = {
    sm: {
      iconSize: 'w-8 h-8',
      gridCols: 'grid-cols-6 sm:grid-cols-8',
      cardPadding: 'p-3',
      textSize: 'text-sm'
    },
    md: {
      iconSize: 'w-12 h-12',
      gridCols: 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8',
      cardPadding: 'p-4',
      textSize: 'text-base'
    },
    lg: {
      iconSize: 'w-16 h-16',
      gridCols: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6',
      cardPadding: 'p-5',
      textSize: 'text-lg'
    }
  };

  const config = sizeConfig[size];
  const currentTheme = themeOverride || theme;

  // Sort options
  const sortOptions: { value: IconSortOption; label: string }[] = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'popularity', label: 'Popularity' },
    { value: 'name', label: 'Name' },
    { value: 'recently-added', label: 'Recently Added' },
    { value: 'recently-updated', label: 'Recently Updated' },
    { value: 'quality-score', label: 'Quality Score' }
  ];

  // Quality options
  const qualityOptions = [
    { value: 0, label: 'All Quality' },
    { value: 70, label: 'Good (70+)' },
    { value: 80, label: 'Great (80+)' },
    { value: 90, label: 'Excellent (90+)' }
  ];

  // Handle filter changes
  const updateFilter = useCallback((key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Handle icon selection
  const handleIconSelect = useCallback((icon: ServiceIcon) => {
    onIconSelect(icon);
  }, [onIconSelect]);

  // Handle icon preview
  const handleIconPreview = useCallback((icon: ServiceIcon) => {
    setPreviewIcon(icon);
  }, []);

  // Clear preview
  const clearPreview = useCallback(() => {
    setPreviewIcon(null);
  }, []);

  // Display icons (search results or popular icons)
  const displayIcons = useMemo(() => {
    if (query.trim() && hasResults) {
      return results;
    }
    
    if (!query.trim() && showPopularIcons) {
      return popularIcons;
    }
    
    return [];
  }, [query, hasResults, results, showPopularIcons, popularIcons]);

  // Render icon item
  const renderIconItem = useCallback((icon: ServiceIcon) => {
    const isSelected = selectedIconId === icon.id;
    const variant = icon.variants.find(v => v.theme === currentTheme) || icon.variants[0];
    
    return (
      <div
        key={icon.id}
        className={`relative group cursor-pointer rounded-lg border-2 transition-all duration-200 ${
          isSelected 
            ? 'border-primary bg-primary/10 shadow-md' 
            : 'border-transparent hover:border-primary/50 hover:bg-primary/5'
        }`}
        onClick={() => handleIconSelect(icon)}
        onMouseEnter={() => handleIconPreview(icon)}
        onMouseLeave={clearPreview}
      >
        <div className={`${config.cardPadding} flex flex-col items-center text-center`}>
          {/* Icon */}
          <div className={`${config.iconSize} mb-2 flex items-center justify-center overflow-hidden rounded-md`}>
            {variant ? (
              <img
                src={variant.url}
                alt={icon.metadata.altText}
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback to initials
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLDivElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            
            {/* Fallback initials */}
            <div
              className={`${config.iconSize} rounded-md flex items-center justify-center text-white font-semibold hidden`}
              style={{ 
                backgroundColor: icon.brand?.primaryColor || '#6B7280',
                fontSize: size === 'sm' ? '12px' : size === 'md' ? '14px' : '18px'
              }}
            >
              {icon.name.charAt(0).toUpperCase()}
            </div>
          </div>
          
          {/* Name */}
          <p className={`${config.textSize} font-medium text-foreground truncate max-w-full`}>
            {icon.name}
          </p>
          
          {/* Quality indicator */}
          {icon.quality.score >= 90 && (
            <div className="absolute top-1 right-1">
              <StarSolidIcon className="w-3 h-3 text-yellow-500" />
            </div>
          )}
          
          {/* Usage count (on hover) */}
          <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/75 text-white text-xs px-1.5 py-0.5 rounded">
              {icon.analytics.usageCount}
            </div>
          </div>
        </div>
      </div>
    );
  }, [selectedIconId, currentTheme, config, size, handleIconSelect, handleIconPreview, clearPreview]);

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold">Choose Icon</h2>
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIconTheme(currentTheme === 'dark' ? 'light' : 'dark')}
            className="w-8 h-8 p-0"
          >
            {currentTheme === 'dark' ? '🌙' : '☀️'}
          </Button>
          
          {/* View mode toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="w-8 h-8 p-0"
          >
            {viewMode === 'grid' ? '☰' : '⊞'}
          </Button>
          
          {/* Close button */}
          {onClose && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="w-8 h-8 p-0"
            >
              <XMarkIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 border-b space-y-4">
        {/* Search input */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => search(e.target.value)}
            placeholder="Search icons..."
            className="w-full pl-10 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search suggestions */}
        {suggestions.length > 0 && query && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => search(suggestion)}
                className="px-3 py-1 text-sm bg-muted hover:bg-muted/80 rounded-full transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Filters */}
        {enableFilters && (
          <div className="space-y-3">
            <button
              onClick={() => updateFilter('showFilters', !filters.showFilters)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <AdjustmentsHorizontalIcon className="w-4 h-4" />
              Filters
              <ChevronDownIcon 
                className={`w-4 h-4 transition-transform ${filters.showFilters ? 'rotate-180' : ''}`} 
              />
            </button>

            {filters.showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Category filter */}
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={filters.category}
                    onChange={(e) => updateFilter('category', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort filter */}
                <div>
                  <label className="block text-sm font-medium mb-1">Sort by</label>
                  <select
                    value={filters.sort}
                    onChange={(e) => updateFilter('sort', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {sortOptions.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quality filter */}
                <div>
                  <label className="block text-sm font-medium mb-1">Quality</label>
                  <select
                    value={filters.minQuality}
                    onChange={(e) => updateFilter('minQuality', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {qualityOptions.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search stats */}
        {(hasResults || isLoading) && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {isLoading 
                ? 'Searching...' 
                : `${total} icons found ${executionTime ? `(${executionTime}ms)` : ''}`
              }
            </span>
            {isLoading && (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="p-4 text-center text-red-600">
            <p>Error: {error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => search(query)}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}

        {!error && !isLoading && displayIcons.length === 0 && query && (
          <div className="p-8 text-center text-muted-foreground">
            <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No icons found</p>
            <p>Try adjusting your search terms or filters</p>
          </div>
        )}

        {!error && !isLoading && displayIcons.length === 0 && !query && !showPopularIcons && (
          <div className="p-8 text-center text-muted-foreground">
            <TagIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Start searching</p>
            <p>Enter a service name to find icons</p>
          </div>
        )}

        {displayIcons.length > 0 && (
          <div className="p-4">
            {/* Section header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-muted-foreground">
                {query.trim() ? 'Search Results' : 'Popular Icons'}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <EyeIcon className="w-4 h-4" />
                {displayIcons.length} icons
              </div>
            </div>

            {/* Icons grid */}
            <div className={`${config.gridCols} gap-3`}>
              {displayIcons.map(renderIconItem)}
            </div>

            {/* Load more (if needed) */}
            {hasResults && results.length >= maxResults && (
              <div className="text-center mt-6">
                <Button variant="outline" size="sm">
                  Load More Icons
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Icon Preview (if any) */}
      {previewIcon && (
        <div className="border-t p-4 bg-muted/30">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 flex items-center justify-center bg-background rounded-lg border overflow-hidden">
              <img
                src={previewIcon.variants[0]?.url}
                alt={previewIcon.metadata.altText}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate">{previewIcon.name}</h4>
              <p className="text-sm text-muted-foreground">
                {previewIcon.category} • Quality: {previewIcon.quality.score}/100
              </p>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <EyeIcon className="w-3 h-3" />
                  {previewIcon.analytics.usageCount} uses
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <StarIcon className="w-3 h-3" />
                  {previewIcon.analytics.averageRating.toFixed(1)} rating
                </span>
              </div>
            </div>
            <Button
              onClick={() => handleIconSelect(previewIcon)}
              size="sm"
            >
              Select
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IconSearchComponent;