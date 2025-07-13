/**
 * TagSelector Component
 * @module components/tags/TagSelector
 */

import React, { useState, useRef, useEffect } from 'react';
import { Combobox } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon, PlusIcon } from '@heroicons/react/20/solid';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { useAppSelector } from '@hooks/useAppSelector';
import { selectTags, createTag } from '@store/slices/tagsSlice';
import { store } from '@store/index';
import { Tag, TAG_COLORS } from '@types/tag';
import TagPill from './TagPill';

interface TagSelectorProps {
  selectedTags: string[];
  onChange: (tagIds: string[]) => void;
  placeholder?: string;
  allowCreate?: boolean;
  multiple?: boolean;
  className?: string;
}

const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  onChange,
  placeholder = 'Select tags...',
  allowCreate = true,
  multiple = true,
  className = '',
}) => {
  const dispatch = useAppDispatch();
  const tags = useAppSelector(selectTags);
  const [query, setQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredTags = query === ''
    ? tags
    : tags.filter(tag =>
        tag.name.toLowerCase().includes(query.toLowerCase())
      );

  const selectedTagObjects = tags.filter(tag => selectedTags.includes(tag.id));

  const handleSelect = (value: string | string[] | null) => {
    if (!value) return;
    
    if (value === '__create__') {
      handleCreateTag();
      return;
    }

    if (multiple) {
      onChange(Array.isArray(value) ? value : [value]);
    } else {
      onChange(Array.isArray(value) ? value : [value]);
    }
    setQuery('');
  };

  const handleCreateTag = async () => {
    if (!query.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const user = store.getState().auth.user;
      if (!user) return;

      // Pick a random color
      const randomColor = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
      
      const result = await dispatch(createTag({
        userId: user.id,
        tag: {
          name: query.trim(),
          color: randomColor,
        },
      })).unwrap();

      // Add the new tag to selection
      if (multiple) {
        onChange([...selectedTags, result.id]);
      } else {
        onChange([result.id]);
      }
      setQuery('');
    } catch (error) {
      console.error('Failed to create tag:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    onChange(selectedTags.filter(id => id !== tagId));
  };

  const showCreateOption = allowCreate && 
    query.trim() !== '' && 
    !tags.some(tag => tag.name.toLowerCase() === query.toLowerCase().trim());

  return (
    <div className={className}>
      <Combobox
        value={multiple ? selectedTags : selectedTags[0] || null}
        onChange={handleSelect}
        multiple={multiple as any}
      >
        <div className="relative">
          <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-300 sm:text-sm">
            <Combobox.Input
              ref={inputRef}
              className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 dark:text-gray-100 bg-transparent focus:ring-0"
              placeholder={placeholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </Combobox.Button>
          </div>
          
          <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {showCreateOption && (
              <Combobox.Option
                value="__create__"
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                    active ? 'bg-blue-600 text-white' : 'text-gray-900 dark:text-gray-100'
                  }`
                }
              >
                <span className="flex items-center">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create "{query.trim()}"
                </span>
              </Combobox.Option>
            )}
            
            {filteredTags.map((tag) => (
              <Combobox.Option
                key={tag.id}
                value={tag.id}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                    active ? 'bg-blue-600 text-white' : 'text-gray-900 dark:text-gray-100'
                  }`
                }
                disabled={!multiple && selectedTags.includes(tag.id)}
              >
                {({ selected, active }) => (
                  <>
                    <span className="flex items-center">
                      <span
                        className="inline-block w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span
                        className={`block truncate ${
                          selected ? 'font-medium' : 'font-normal'
                        }`}
                      >
                        {tag.name}
                      </span>
                      {tag.accountCount !== undefined && (
                        <span className="ml-auto text-xs opacity-60">
                          {tag.accountCount}
                        </span>
                      )}
                    </span>
                    {selected ? (
                      <span
                        className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                          active ? 'text-white' : 'text-blue-600'
                        }`}
                      >
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Combobox.Option>
            ))}
            
            {filteredTags.length === 0 && !showCreateOption && (
              <div className="relative cursor-default select-none py-2 px-4 text-gray-700 dark:text-gray-300">
                No tags found
              </div>
            )}
          </Combobox.Options>
        </div>
      </Combobox>

      {/* Selected tags display */}
      {selectedTagObjects.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {selectedTagObjects.map(tag => (
            <TagPill
              key={tag.id}
              tag={tag}
              removable
              onRemove={() => handleRemoveTag(tag.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TagSelector;