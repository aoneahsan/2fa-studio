/**
 * Intelligent Search Component
 * AI-powered search with natural language processing and smart suggestions
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NLPService, SearchResponse } from '../../services/ai/nlp.service';
import { RecommendationService } from '../../services/ai/recommendation.service';
import { debounce } from 'lodash';
import './IntelligentSearch.css';

interface SearchProps {
  accounts: any[];
  onResultSelect: (account: any) => void;
  onSearchStateChange?: (isSearching: boolean) => void;
  placeholder?: string;
  className?: string;
}

interface SearchResultItem {
  item: any;
  score: number;
  matchedFields: string[];
  highlights: Array<{
    field: string;
    text: string;
    positions: Array<{ start: number; end: number }>;
  }>;
}

export const IntelligentSearch: React.FC<SearchProps> = ({
  accounts,
  onResultSelect,
  onSearchStateChange,
  placeholder = "Search accounts with natural language...",
  className = ""
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchIntent, setSearchIntent] = useState('');
  const [processingTime, setProcessingTime] = useState(0);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setSuggestions([]);
        setShowResults(false);
        setIsSearching(false);
        onSearchStateChange?.(false);
        return;
      }

      try {
        setIsSearching(true);
        onSearchStateChange?.(true);

        const searchResponse: SearchResponse = await NLPService.performSearch(searchQuery, accounts);
        
        setResults(searchResponse.results);
        setSuggestions(searchResponse.suggestions);
        setSearchIntent(searchResponse.intent);
        setProcessingTime(searchResponse.processingTime);
        setShowResults(true);
        setSelectedIndex(-1);

      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
        onSearchStateChange?.(false);
      }
    }, 300),
    [accounts, onSearchStateChange]
  );

  // Debounced autocomplete function
  const debouncedAutocomplete = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length >= 2) {
        try {
          const completions = NLPService.getAutocompleteSuggestions(searchQuery, accounts, 5);
          setAutocompleteSuggestions(completions);
        } catch (error) {
          console.error('Autocomplete failed:', error);
        }
      } else {
        setAutocompleteSuggestions([]);
      }
    }, 150),
    [accounts]
  );

  useEffect(() => {
    debouncedSearch(query);
    debouncedAutocomplete(query);
  }, [query, debouncedSearch, debouncedAutocomplete]);

  // Handle click outside to close results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
        setAutocompleteSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults && autocompleteSuggestions.length === 0) return;

    const totalItems = Math.max(results.length, autocompleteSuggestions.length);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < totalItems - 1 ? prev + 1 : -1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > -1 ? prev - 1 : totalItems - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          if (showResults && selectedIndex < results.length) {
            handleResultSelect(results[selectedIndex]);
          } else if (selectedIndex < autocompleteSuggestions.length) {
            handleSuggestionSelect(autocompleteSuggestions[selectedIndex]);
          }
        }
        break;
      case 'Escape':
        setShowResults(false);
        setAutocompleteSuggestions([]);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleResultSelect = (result: SearchResultItem) => {
    onResultSelect(result.item);
    setQuery('');
    setResults([]);
    setShowResults(false);
    setAutocompleteSuggestions([]);
    
    // Record successful search interaction
    // This would integrate with your analytics
    recordSearchInteraction(query, result.item.id, 'selected');
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setQuery(suggestion);
    inputRef.current?.focus();
    setAutocompleteSuggestions([]);
  };

  const handleSmartSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    inputRef.current?.focus();
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
    setShowResults(false);
    setAutocompleteSuggestions([]);
    inputRef.current?.focus();
  };

  const highlightText = (text: string, positions: Array<{ start: number; end: number }>) => {
    if (!positions.length) return text;

    const parts = [];
    let lastIndex = 0;

    positions.forEach(({ start, end }) => {
      // Add text before highlight
      if (start > lastIndex) {
        parts.push(text.substring(lastIndex, start));
      }
      // Add highlighted text
      parts.push(
        <mark key={`${start}-${end}`} className="search-highlight">
          {text.substring(start, end)}
        </mark>
      );
      lastIndex = end;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  const getIntentIcon = (intent: string) => {
    switch (intent) {
      case 'search': return '🔍';
      case 'filter': return '🔧';
      case 'action': return '⚡';
      case 'question': return '❓';
      default: return '💭';
    }
  };

  const recordSearchInteraction = (query: string, itemId: string, action: string) => {
    // This would integrate with your analytics service
    console.log(`Search interaction: ${action} - ${query} -> ${itemId}`);
  };

  return (
    <div ref={searchRef} className={`intelligent-search ${className}`}>
      <div className="search-input-container">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (query) {
                setShowResults(results.length > 0);
              }
            }}
            placeholder={placeholder}
            className="search-input"
            autoComplete="off"
          />
          {isSearching && (
            <div className="search-loading">
              <div className="loading-spinner"></div>
            </div>
          )}
          {query && (
            <button 
              className="clear-search"
              onClick={clearSearch}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Search intent indicator */}
        {searchIntent && query && (
          <div className="search-intent">
            <span className="intent-icon">{getIntentIcon(searchIntent)}</span>
            <span className="intent-text">
              {searchIntent.replace('_', ' ')} • {processingTime}ms
            </span>
          </div>
        )}
      </div>

      {/* Autocomplete Suggestions */}
      {autocompleteSuggestions.length > 0 && !showResults && (
        <div className="autocomplete-dropdown">
          <div className="autocomplete-header">Suggestions</div>
          {autocompleteSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              className={`autocomplete-item ${selectedIndex === index ? 'selected' : ''}`}
              onClick={() => handleSuggestionSelect(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="suggestion-icon">💡</span>
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Search Results */}
      {showResults && (
        <div ref={resultsRef} className="search-results">
          {results.length > 0 ? (
            <>
              <div className="results-header">
                <span>Found {results.length} result{results.length !== 1 ? 's' : ''}</span>
                {processingTime > 0 && (
                  <span className="processing-time">in {processingTime}ms</span>
                )}
              </div>
              
              <div className="results-list">
                {results.map((result, index) => (
                  <div
                    key={`${result.item.id}-${index}`}
                    className={`result-item ${selectedIndex === index ? 'selected' : ''}`}
                    onClick={() => handleResultSelect(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="result-main">
                      <div className="result-icon">
                        {result.item.icon || '🔐'}
                      </div>
                      <div className="result-content">
                        <div className="result-title">
                          {result.highlights.find(h => h.field === 'issuer')
                            ? highlightText(
                                result.item.issuer,
                                result.highlights.find(h => h.field === 'issuer')!.positions
                              )
                            : result.item.issuer
                          }
                        </div>
                        {result.item.label && (
                          <div className="result-subtitle">
                            {result.highlights.find(h => h.field === 'label')
                              ? highlightText(
                                  result.item.label,
                                  result.highlights.find(h => h.field === 'label')!.positions
                                )
                              : result.item.label
                            }
                          </div>
                        )}
                        <div className="result-meta">
                          {result.item.category && (
                            <span className="result-category">
                              {result.item.category.replace('_', ' ')}
                            </span>
                          )}
                          <span className="result-score">
                            {Math.round(result.score * 100)}% match
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {result.matchedFields.length > 0 && (
                      <div className="result-matches">
                        Matched: {result.matchedFields.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <div className="no-results-text">
                No accounts found for "{query}"
              </div>
              <div className="no-results-help">
                Try searching by service name, category, or description
              </div>
            </div>
          )}

          {/* Smart Suggestions */}
          {suggestions.length > 0 && (
            <div className="smart-suggestions">
              <div className="suggestions-header">You might also try:</div>
              <div className="suggestions-list">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`suggestion-${index}`}
                    className="suggestion-button"
                    onClick={() => handleSmartSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Attribution */}
      {(showResults || autocompleteSuggestions.length > 0) && (
        <div className="ai-attribution">
          <small>Powered by AI • Natural language search</small>
        </div>
      )}
    </div>
  );
};

export default IntelligentSearch;