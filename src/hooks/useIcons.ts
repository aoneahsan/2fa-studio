/**
 * React Hooks for Icon Management
 * Provides easy-to-use hooks for icon operations in React components
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ServiceIcon, 
  CustomIcon, 
  IconSearchQuery, 
  IconSearchResult,
  IconTheme,
  IconSize,
  IconFormat,
  IconCategory
} from '@/types/icon';
import { iconService } from '@/services/icon.service';
import { useAuth } from './useAuth';

/**
 * Hook for getting a single icon for a service
 */
export function useServiceIcon(
  serviceName: string,
  options: {
    size?: IconSize;
    format?: IconFormat;
    theme?: IconTheme;
    preferCustom?: boolean;
    enabled?: boolean;
  } = {}
) {
  const { user } = useAuth();
  const [state, setState] = useState<{
    iconUrl: string | null;
    source: 'database' | 'custom' | 'external' | 'fallback' | null;
    loading: boolean;
    error: string | null;
    cached: boolean;
  }>({
    iconUrl: null,
    source: null,
    loading: false,
    error: null,
    cached: false
  });

  const {
    size = '64x64',
    format = 'png',
    theme = 'auto',
    preferCustom = false,
    enabled = true
  } = options;

  const fetchIcon = useCallback(async () => {
    if (!enabled || !serviceName.trim()) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await iconService.getIconForService(serviceName, {
        size,
        format,
        theme,
        userId: user?.uid,
        preferCustom
      });

      setState({
        iconUrl: result.iconUrl,
        source: result.source,
        loading: false,
        error: null,
        cached: result.cached
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load icon'
      }));
    }
  }, [serviceName, size, format, theme, user?.uid, preferCustom, enabled]);

  useEffect(() => {
    fetchIcon();
  }, [fetchIcon]);

  const refetch = useCallback(() => {
    fetchIcon();
  }, [fetchIcon]);

  return {
    ...state,
    refetch,
    isLoading: state.loading
  };
}

/**
 * Hook for searching icons
 */
export function useIconSearch(
  initialQuery: string = '',
  options: {
    category?: IconCategory;
    minQuality?: number;
    limit?: number;
    autoSearch?: boolean;
    debounceMs?: number;
  } = {}
) {
  const { user } = useAuth();
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [state, setState] = useState<{
    results: ServiceIcon[];
    suggestions: string[];
    loading: boolean;
    error: string | null;
    total: number;
    executionTime: number;
  }>({
    results: [],
    suggestions: [],
    loading: false,
    error: null,
    total: 0,
    executionTime: 0
  });

  const {
    category,
    minQuality = 0,
    limit = 20,
    autoSearch = true,
    debounceMs = 300
  } = options;

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  const searchIcons = useCallback(async (searchQuery: string = debouncedQuery) => {
    if (!autoSearch && !searchQuery.trim()) {
      setState({
        results: [],
        suggestions: [],
        loading: false,
        error: null,
        total: 0,
        executionTime: 0
      });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const searchParams: IconSearchQuery = {
        query: searchQuery,
        category,
        minQuality,
        limit,
        sort: 'relevance',
        userId: user?.uid
      };

      const result = await iconService.searchIcons(searchParams, user?.uid);

      setState({
        results: result.results,
        suggestions: result.suggestions,
        loading: false,
        error: null,
        total: result.total,
        executionTime: result.executionTime
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Search failed'
      }));
    }
  }, [debouncedQuery, category, minQuality, limit, autoSearch, user?.uid]);

  useEffect(() => {
    if (autoSearch) {
      searchIcons();
    }
  }, [searchIcons, autoSearch]);

  const search = useCallback((newQuery: string) => {
    setQuery(newQuery);
    if (!autoSearch) {
      searchIcons(newQuery);
    }
  }, [searchIcons, autoSearch]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setState({
      results: [],
      suggestions: [],
      loading: false,
      error: null,
      total: 0,
      executionTime: 0
    });
  }, []);

  return {
    query,
    setQuery,
    search,
    clearSearch,
    ...state,
    isLoading: state.loading,
    hasResults: state.results.length > 0
  };
}

/**
 * Hook for managing custom icons
 */
export function useCustomIcons() {
  const { user } = useAuth();
  const [state, setState] = useState<{
    icons: CustomIcon[];
    loading: boolean;
    error: string | null;
  }>({
    icons: [],
    loading: false,
    error: null
  });

  const fetchCustomIcons = useCallback(async () => {
    if (!user?.uid) {
      setState({ icons: [], loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const icons = await iconService.getUserCustomIcons(user.uid);
      setState({ icons, loading: false, error: null });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load custom icons'
      }));
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchCustomIcons();
  }, [fetchCustomIcons]);

  const uploadIcon = useCallback(async (file: File, serviceName: string) => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const newIcon = await iconService.uploadCustomIcon(file, serviceName, user.uid);
      setState(prev => ({
        ...prev,
        icons: [...prev.icons, newIcon],
        loading: false,
        error: null
      }));
      return newIcon;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      }));
      throw error;
    }
  }, [user?.uid]);

  const deleteIcon = useCallback(async (iconId: string) => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const success = await iconService.deleteCustomIcon(iconId, user.uid);
      if (success) {
        setState(prev => ({
          ...prev,
          icons: prev.icons.filter(icon => icon.id !== iconId),
          loading: false,
          error: null
        }));
      } else {
        throw new Error('Failed to delete icon');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Delete failed'
      }));
      throw error;
    }
  }, [user?.uid]);

  const getIconByService = useCallback((serviceName: string) => {
    return state.icons.find(icon => 
      icon.serviceName.toLowerCase() === serviceName.toLowerCase()
    );
  }, [state.icons]);

  return {
    ...state,
    uploadIcon,
    deleteIcon,
    getIconByService,
    refetch: fetchCustomIcons,
    isLoading: state.loading,
    hasIcons: state.icons.length > 0
  };
}

/**
 * Hook for icon analytics
 */
export function useIconAnalytics(iconId?: string, period: 'day' | 'week' | 'month' = 'week') {
  const [state, setState] = useState<{
    stats: {
      views: number;
      selections: number;
      downloads: number;
      searches: number;
      period: string;
    } | null;
    loading: boolean;
    error: string | null;
  }>({
    stats: null,
    loading: false,
    error: null
  });

  const fetchAnalytics = useCallback(async () => {
    if (!iconId) {
      setState({ stats: null, loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const stats = await iconService.getIconAnalytics(iconId, period);
      setState({ stats, loading: false, error: null });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load analytics'
      }));
    }
  }, [iconId, period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    ...state,
    refetch: fetchAnalytics,
    isLoading: state.loading
  };
}

/**
 * Hook for popular icons
 */
export function usePopularIcons(limit: number = 10) {
  const [state, setState] = useState<{
    icons: ServiceIcon[];
    loading: boolean;
    error: string | null;
  }>({
    icons: [],
    loading: true,
    error: null
  });

  const fetchPopularIcons = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const icons = await iconService.getPopularIcons(limit);
      setState({ icons, loading: false, error: null });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load popular icons'
      }));
    }
  }, [limit]);

  useEffect(() => {
    fetchPopularIcons();
  }, [fetchPopularIcons]);

  return {
    ...state,
    refetch: fetchPopularIcons,
    isLoading: state.loading,
    hasIcons: state.icons.length > 0
  };
}

/**
 * Hook for icon theme management
 */
export function useIconTheme() {
  const [theme, setTheme] = useState<IconTheme>('auto');

  // Get theme from system or user preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('icon-theme') as IconTheme;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Use system preference
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      setTheme(systemTheme);
    }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('icon-theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setIconTheme = useCallback((newTheme: IconTheme) => {
    setTheme(newTheme);
    if (newTheme === 'auto' || newTheme === 'system') {
      localStorage.removeItem('icon-theme');
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      setTheme(systemTheme);
    } else {
      localStorage.setItem('icon-theme', newTheme);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setIconTheme(newTheme);
  }, [theme, setIconTheme]);

  return {
    theme,
    setIconTheme,
    toggleTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    isAuto: theme === 'auto' || theme === 'system'
  };
}

/**
 * Hook for fallback icon generation
 */
export function useFallbackIcon(
  serviceName: string,
  options: {
    size?: number;
    format?: 'svg' | 'canvas';
    theme?: IconTheme;
    style?: 'initials' | 'geometric' | 'branded';
  } = {}
) {
  const { theme: currentTheme } = useIconTheme();
  
  const fallbackIcon = useMemo(() => {
    if (!serviceName.trim()) return null;

    return iconService.generateFallbackIcon(serviceName, {
      size: options.size || 64,
      format: options.format || 'svg',
      theme: options.theme || currentTheme,
      style: options.style || 'initials'
    });
  }, [serviceName, options.size, options.format, options.theme, options.style, currentTheme]);

  return fallbackIcon;
}

/**
 * Hook for icon cache management
 */
export function useIconCache() {
  const [stats, setStats] = useState(iconService.getCacheStats());

  const refreshStats = useCallback(() => {
    setStats(iconService.getCacheStats());
  }, []);

  const clearCache = useCallback(async () => {
    await iconService.clearCache();
    refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    // Refresh stats periodically
    const interval = setInterval(refreshStats, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [refreshStats]);

  return {
    stats,
    clearCache,
    refreshStats,
    cacheHitRate: stats.hitRate,
    cacheSize: stats.totalSize,
    itemCount: stats.itemCount
  };
}

/**
 * Hook for icon categories
 */
export function useIconCategories() {
  const categories = useMemo(() => {
    const categoryLabels: Record<IconCategory, string> = {
      'social-media': 'Social Media',
      'technology': 'Technology',
      'finance': 'Finance',
      'productivity': 'Productivity',
      'entertainment': 'Entertainment',
      'education': 'Education',
      'healthcare': 'Healthcare',
      'ecommerce': 'E-commerce',
      'gaming': 'Gaming',
      'communication': 'Communication',
      'developer-tools': 'Developer Tools',
      'cloud-services': 'Cloud Services',
      'security': 'Security',
      'cryptocurrency': 'Cryptocurrency',
      'other': 'Other'
    };

    return Object.entries(categoryLabels).map(([value, label]) => ({
      value: value as IconCategory,
      label
    }));
  }, []);

  return categories;
}

/**
 * Compound hook for complete icon management
 */
export function useIconManager(serviceName: string, options: {
  size?: IconSize;
  format?: IconFormat;
  theme?: IconTheme;
  preferCustom?: boolean;
  enableSearch?: boolean;
  enableCustom?: boolean;
  enableAnalytics?: boolean;
} = {}) {
  const {
    size = '64x64',
    format = 'png',
    theme = 'auto',
    preferCustom = false,
    enableSearch = true,
    enableCustom = true,
    enableAnalytics = false
  } = options;

  const serviceIcon = useServiceIcon(serviceName, { size, format, theme, preferCustom });
  const iconSearch = useIconSearch('', { autoSearch: enableSearch });
  const customIcons = useCustomIcons();
  const iconTheme = useIconTheme();
  const analytics = useIconAnalytics(
    enableAnalytics ? serviceIcon.source === 'database' ? serviceName : undefined : undefined
  );

  return {
    // Service icon
    icon: serviceIcon,
    
    // Search functionality
    search: enableSearch ? iconSearch : null,
    
    // Custom icons
    custom: enableCustom ? customIcons : null,
    
    // Theme management
    theme: iconTheme,
    
    // Analytics
    analytics: enableAnalytics ? analytics : null,
    
    // Combined loading state
    isLoading: serviceIcon.loading || 
               (enableSearch && iconSearch.loading) || 
               (enableCustom && customIcons.loading) ||
               (enableAnalytics && analytics.loading),
    
    // Combined error state
    error: serviceIcon.error || 
           (enableSearch && iconSearch.error) || 
           (enableCustom && customIcons.error) ||
           (enableAnalytics && analytics.error)
  };
}