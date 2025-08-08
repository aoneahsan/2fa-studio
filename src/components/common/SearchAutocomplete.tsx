import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MagnifyingGlassIcon, 
  ClockIcon,
  XMarkIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { Input } from '@components/ui/input';
import { Card } from '@components/ui/card';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'account' | 'issuer' | 'recent' | 'suggestion';
  metadata?: any;
}

interface SearchAutocompleteProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  onSuggestionClick?: (suggestion: SearchSuggestion) => void;
  getSuggestions?: (query: string) => Promise<SearchSuggestion[]>;
  recentSearches?: string[];
  maxSuggestions?: number;
  debounceMs?: number;
  className?: string;
}

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  placeholder = "Search accounts...",
  onSearch,
  onSuggestionClick,
  getSuggestions,
  recentSearches = [],
  maxSuggestions = 5,
  debounceMs = 300,
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (!getSuggestions || searchQuery.trim().length === 0) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const results = await getSuggestions(searchQuery);
      setSuggestions(results.slice(0, maxSuggestions));
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [getSuggestions, maxSuggestions]);

  // Handle input change with debounce
  const handleInputChange = (value: string) => {
    setQuery(value);
    setSelectedIndex(-1);
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (value.trim()) {
      setShowSuggestions(true);
      debounceTimer.current = setTimeout(() => {
        fetchSuggestions(value);
      }, debounceMs);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  // Handle search submission
  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (finalQuery.trim()) {
      onSearch(finalQuery);
      setShowSuggestions(false);
      setQuery('');
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (onSuggestionClick) {
      onSuggestionClick(suggestion);
    } else {
      setQuery(suggestion.text);
      handleSearch(suggestion.text);
    }
    setShowSuggestions(false);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Get icon for suggestion type
  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'recent':
        return <ClockIcon className="w-4 h-4 text-muted-foreground" />;
      default:
        return <MagnifyingGlassIcon className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query && setShowSuggestions(true)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setSuggestions([]);
              setShowSuggestions(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 overflow-hidden">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : suggestions.length > 0 ? (
            <ul className="py-2">
              {suggestions.map((suggestion, index) => (
                <li key={suggestion.id}>
                  <button
                    onClick={() => handleSuggestionClick(suggestion)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-muted transition-colors ${
                      selectedIndex === index ? 'bg-muted' : ''
                    }`}
                  >
                    {getSuggestionIcon(suggestion.type)}
                    <span className="flex-1 truncate">{suggestion.text}</span>
                    {suggestion.type === 'account' && (
                      <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : query.length > 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : recentSearches.length > 0 ? (
            <div>
              <p className="px-4 py-2 text-sm font-medium text-muted-foreground">
                Recent Searches
              </p>
              <ul className="pb-2">
                {recentSearches.slice(0, maxSuggestions).map((search, index) => (
                  <li key={index}>
                    <button
                      onClick={() => {
                        setQuery(search);
                        handleSearch(search);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-muted transition-colors"
                    >
                      <ClockIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="flex-1 truncate">{search}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
};

// Minimal search input without autocomplete
export const SearchInput: React.FC<{
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (query: string) => void;
  className?: string;
}> = ({
  placeholder = "Search...",
  value = '',
  onChange,
  onSearch,
  className = ''
}) => {
  const [localValue, setLocalValue] = useState(value);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    onChange?.(newValue);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(localValue);
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
      <Input
        type="text"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10"
      />
    </form>
  );
};