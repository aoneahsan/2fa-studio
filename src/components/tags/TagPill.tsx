/**
 * TagPill Component
 * @module components/tags/TagPill
 */

import React from 'react';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { Tag } from '@types/tag';

interface TagPillProps {
  tag: Tag;
  size?: 'sm' | 'md' | 'lg';
  removable?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
}

const TagPill: React.FC<TagPillProps> = ({
  tag,
  size = 'sm',
  removable = false,
  onClick,
  onRemove,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick();
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]} ${
        onClick ? 'cursor-pointer hover:opacity-80' : ''
      } ${className}`}
      style={{
        backgroundColor: `${tag.color}20`,
        color: tag.color,
        border: `1px solid ${tag.color}40`,
      }}
      onClick={handleClick}
    >
      {tag.icon && (
        <span className="flex-shrink-0">
          {/* Icon placeholder - implement icon rendering based on your icon system */}
          <span className={`inline-block ${iconSizes[size]}`}>•</span>
        </span>
      )}
      <span className="truncate">{tag.name}</span>
      {removable && (
        <button
          type="button"
          onClick={handleRemove}
          className={`flex-shrink-0 rounded-full hover:bg-black/10 ${iconSizes[size]}`}
          aria-label={`Remove ${tag.name} tag`}
        >
          <XMarkIcon className={iconSizes[size]} />
        </button>
      )}
    </span>
  );
};

export default TagPill;