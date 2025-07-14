/**
 * TagFilter Component
 * @module components/tags/TagFilter
 */

import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { useAppSelector } from '@hooks/useAppSelector';
import {
  selectTags,
  selectActiveTags,
  selectFilterMode,
  toggleTag,
  clearActiveTags,
  setFilterMode,
} from '@store/slices/tagsSlice';
import TagPill from './TagPill';

interface TagFilterProps {
  className?: string;
}

const TagFilter: React.FC<TagFilterProps> = ({ className = '' }) => {
  const dispatch = useAppDispatch();
  const tags = useAppSelector(selectTags);
  const activeTags = useAppSelector(selectActiveTags);
  const filterMode = useAppSelector(selectFilterMode);

  const activeTagObjects = tags.filter((tag: any) => activeTags.includes(tag.id));

  const handleTagClick = (tagId: string) => {
    dispatch(toggleTag(tagId) as any);
  };

  const handleClearFilters = () => {
    dispatch(clearActiveTags() as any);
  };

  const handleModeToggle = () => {
    dispatch(setFilterMode(filterMode === 'OR' ? 'AND' : 'OR') as any);
  };

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Filter by Tags
        </h3>
        {activeTags.length > 0 && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
          >
            <XMarkIcon className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {(tags || []).map((tag: any) => {
          const isActive = activeTags.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleTagClick(tag.id)}
              className={`transition-opacity ${
                isActive ? 'opacity-100' : 'opacity-60 hover:opacity-100'
              }`}
            >
              <TagPill
                tag={tag}
                size="md"
                className={isActive ? 'ring-2 ring-blue-500' : ''}
              />
            </button>
          );
        })}
      </div>

      {activeTags.length > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Filter mode:
          </span>
          <button
            type="button"
            onClick={handleModeToggle}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Show accounts with {filterMode === 'OR' ? 'any' : 'all'} selected tags
          </button>
        </div>
      )}

      {activeTags.length > 0 && (
        <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
          Showing accounts tagged with:{' '}
          <span className="font-medium">
            {activeTagObjects.map((tag: any) => tag.name).join(filterMode === 'OR' ? ' or ' : ' and ')}
          </span>
        </div>
      )}
    </div>
  );
};

export default TagFilter;