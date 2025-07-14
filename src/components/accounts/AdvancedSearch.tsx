/**
 * Advanced search component for accounts
 * @module components/accounts/AdvancedSearch
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@src/store';
import { setSearchQuery } from '@store/slices/accountsSlice';
import { 
  MagnifyingGlassIcon, 
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { Popover } from '@headlessui/react';

interface SearchOptions {
  searchIn: {
    issuer: boolean;
    label: boolean;
    tags: boolean;
    notes: boolean;
  };
  caseSensitive: boolean;
  exactMatch: boolean;
  regex: boolean;
}

const defaultOptions: SearchOptions = {
  searchIn: {
    issuer: true,
    label: true,
    tags: true,
    notes: false,
  },
  caseSensitive: false,
  exactMatch: false,
  regex: false,
};

/**
 * Advanced search bar with configurable search options
 */
const AdvancedSearch: React.FC = () => {
  const dispatch = useDispatch();
  const searchQuery = useSelector((state: RootState) => (state as any).accounts.searchQuery);
  const [options, setOptions] = useState<SearchOptions>(() => {
    // Load saved options from localStorage
    const saved = localStorage.getItem('searchOptions');
    return saved ? JSON.parse(saved) : defaultOptions;
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentSearches');
    return saved ? JSON.parse(saved) : [];
  });
  const inputRef = useRef<HTMLInputElement>(null);

  // Save options to localStorage
  useEffect(() => {
    localStorage.setItem('searchOptions', JSON.stringify(options));
  }, [options]);

  // Save search to recent searches
  const saveRecentSearch = useCallback((query: string) => {
    if (!query.trim()) return;
    
    const updated = [query, ...recentSearches.filter((s: any) => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  }, [recentSearches]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    dispatch(setSearchQuery(value) as any);
    
    // Store enhanced search options in Redux if needed
    if (value) {
      // Encode search options in the query for the filter function
      const enhancedQuery = {
        query: value,
        options: options
      };
      dispatch(setSearchQuery(JSON.stringify(enhancedQuery) as any));
    } else {
      dispatch(setSearchQuery('') as any);
    }
  }, [dispatch, options]);

  const handleClearSearch = useCallback(() => {
    dispatch(setSearchQuery('') as any);
    inputRef.current?.focus();
  }, [dispatch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery) {
      saveRecentSearch(searchQuery);
      setShowSuggestions(false);
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }, [searchQuery, saveRecentSearch]);

  const handleRecentSearchClick = useCallback((search: string) => {
    dispatch(setSearchQuery(search) as any);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, [dispatch]);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  }, []);

  const toggleOption = (key: keyof SearchOptions['searchIn']) => {
    setOptions(prev => ({
      ...prev,
      searchIn: {
        ...prev.searchIn,
        [key]: !prev.searchIn[key]
      }
    }));
  };

  return (
    <div className="relative flex-1">
      <div className="relative flex items-center">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-muted-foreground" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Search accounts..."
          className="input pl-10 pr-20"
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="p-1 hover:bg-muted rounded"
            >
              <XMarkIcon className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          )}
          
          <Popover className="relative">
            <Popover.Button className="p-1 hover:bg-muted rounded">
              <AdjustmentsHorizontalIcon className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
            </Popover.Button>
            
            <Popover.Panel className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-border p-4 z-10">
              <h3 className="font-medium text-sm mb-3">Search Options</h3>
              
              {/* Search in options */}
              <div className="space-y-2 mb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Search in:</p>
                {Object.entries(options.searchIn).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={() => toggleOption(key as keyof SearchOptions['searchIn'])}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm capitalize">{key}</span>
                  </label>
                ))}
              </div>
              
              {/* Advanced options */}
              <div className="space-y-2 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Options:</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.caseSensitive}
                    onChange={() => setOptions(prev => ({ ...prev, caseSensitive: !prev.caseSensitive }))}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Case sensitive</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.exactMatch}
                    onChange={() => setOptions(prev => ({ ...prev, exactMatch: !prev.exactMatch }))}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Exact match</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.regex}
                    onChange={() => setOptions(prev => ({ ...prev, regex: !prev.regex }))}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Use regex</span>
                </label>
              </div>
              
              <button
                onClick={() => setOptions(defaultOptions)}
                className="mt-4 text-xs text-primary hover:text-primary/80"
              >
                Reset to defaults
              </button>
            </Popover.Panel>
          </Popover>
        </div>
      </div>
      
      {/* Recent searches dropdown */}
      {showSuggestions && recentSearches.length > 0 && !searchQuery && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-border z-10">
          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs text-muted-foreground">Recent searches</span>
              <button
                onClick={clearRecentSearches}
                className="text-xs text-primary hover:text-primary/80"
              >
                Clear
              </button>
            </div>
            {recentSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => handleRecentSearchClick(search)}
                className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded transition-colors"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearch;