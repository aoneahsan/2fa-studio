/**
 * Account filters component
 * @module components/accounts/AccountFilters
 */

import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@src/store';
import { setSelectedTags, setSortBy, setSortOrder } from '@store/slices/accountsSlice';
import { 
  FunnelIcon, 
  TagIcon,
  ArrowsUpDownIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

/**
 * Filters and sorting for accounts
 */
const AccountFilters: React.FC = () => {
  const dispatch = useDispatch();
  const { accounts, selectedTags, sortBy, sortOrder } = useSelector(
    (state: RootState) => state.accounts
  );

  // Extract all unique tags
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    accounts.forEach(account => {
      account.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [accounts]);

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      dispatch(setSelectedTags(selectedTags.filter((t: any) => t !== tag) as any));
    } else {
      dispatch(setSelectedTags([...selectedTags, tag]) as any);
    }
  };

  const handleSortChange = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      // Toggle order if same sort field
      dispatch(setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc') as any);
    } else {
      dispatch(setSortBy(newSortBy) as any);
      dispatch(setSortOrder('asc') as any);
    }
  };

  const clearFilters = () => {
    dispatch(setSelectedTags([]) as any);
  };

  return (
    <div className="space-y-4">
      {/* Tag Filters */}
      {availableTags.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-1">
              <TagIcon className="w-4 h-4" />
              Filter by Tags
            </h3>
            {selectedTags.length > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs text-primary hover:text-primary/80"
              >
                Clear all
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={`
                    inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm
                    transition-colors border
                    ${isSelected 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-transparent text-muted-foreground border-border hover:border-primary hover:text-primary'
                    }
                  `}
                >
                  {isSelected && <CheckIcon className="w-3 h-3" />}
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sort Options */}
      <div>
        <h3 className="text-sm font-medium text-foreground flex items-center gap-1 mb-2">
          <ArrowsUpDownIcon className="w-4 h-4" />
          Sort By
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => handleSortChange('name')}
            className={`
              px-3 py-2 rounded-md text-sm font-medium transition-colors
              ${sortBy === 'name' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }
            `}
          >
            Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          
          <button
            onClick={() => handleSortChange('issuer')}
            className={`
              px-3 py-2 rounded-md text-sm font-medium transition-colors
              ${sortBy === 'issuer' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }
            `}
          >
            Issuer {sortBy === 'issuer' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          
          <button
            onClick={() => handleSortChange('createdAt')}
            className={`
              px-3 py-2 rounded-md text-sm font-medium transition-colors
              ${sortBy === 'createdAt' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }
            `}
          >
            Added {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          
          <button
            onClick={() => handleSortChange('lastUsed')}
            className={`
              px-3 py-2 rounded-md text-sm font-medium transition-colors
              ${sortBy === 'lastUsed' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }
            `}
          >
            Used {sortBy === 'lastUsed' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountFilters;