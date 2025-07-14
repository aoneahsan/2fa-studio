/**
 * Folder tree component for hierarchical folder display
 * @module components/folders/FolderTree
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FolderTree as FolderTreeType } from '@app-types/folder';
import { 
  selectSelectedFolderId, 
  selectExpandedFolders,
  selectFolder,
  toggleFolderExpanded 
} from '@store/slices/foldersSlice';
import { 
  FolderIcon, 
  FolderOpenIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { FolderIcon as FolderSolidIcon } from '@heroicons/react/24/solid';

interface FolderTreeProps {
  folders: FolderTreeType[];
  onFolderSelect?: (folderId: string | null) => void;
  selectedFolderId?: string | null;
  className?: string;
}

interface FolderNodeProps {
  folder: FolderTreeType;
  onFolderSelect?: (folderId: string | null) => void;
  selectedFolderId?: string | null;
  expandedFolders: string[];
}

/**
 * Individual folder node in the tree
 */
const FolderNode: React.FC<FolderNodeProps> = ({ 
  folder, 
  onFolderSelect, 
  selectedFolderId,
  expandedFolders 
}) => {
  const dispatch = useDispatch();
  const isExpanded = expandedFolders.includes(folder.id);
  const isSelected = selectedFolderId === folder.id;
  const hasChildren = folder.children && folder.children.length > 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      dispatch(toggleFolderExpanded(folder.id) as any);
    }
  };

  const handleSelect = () => {
    dispatch(selectFolder(folder.id) as any);
    onFolderSelect?.(folder.id);
  };

  return (
    <div className="select-none">
      <div
        className={`
          flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer
          transition-colors duration-150
          ${isSelected 
            ? 'bg-primary/10 text-primary' 
            : 'hover:bg-muted/50'
          }
        `}
        style={{ paddingLeft: `${(folder.level || 0) * 1.5 + 0.5}rem` }}
        onClick={handleSelect}
      >
        {/* Expand/Collapse Chevron */}
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="p-0.5 hover:bg-muted rounded"
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Folder Icon */}
        <div className="flex-shrink-0">
          {isSelected ? (
            <FolderSolidIcon 
              className="w-5 h-5" 
              style={{ color: folder.color || undefined }}
            />
          ) : isExpanded ? (
            <FolderOpenIcon 
              className="w-5 h-5" 
              style={{ color: folder.color || undefined }}
            />
          ) : (
            <FolderIcon 
              className="w-5 h-5" 
              style={{ color: folder.color || undefined }}
            />
          )}
        </div>

        {/* Folder Name */}
        <span className="flex-1 text-sm font-medium truncate">
          {folder.name}
        </span>

        {/* Account Count */}
        {folder.accountCount !== undefined && folder.accountCount > 0 && (
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {folder.accountCount}
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="ml-2">
          {folder.children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              onFolderSelect={onFolderSelect}
              selectedFolderId={selectedFolderId}
              expandedFolders={expandedFolders}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Hierarchical folder tree display
 */
const FolderTree: React.FC<FolderTreeProps> = ({ 
  folders, 
  onFolderSelect,
  selectedFolderId: propSelectedFolderId,
  className = '' 
}) => {
  const dispatch = useDispatch();
  const storeSelectedFolderId = useSelector(selectSelectedFolderId);
  const expandedFolders = useSelector(selectExpandedFolders);
  
  const selectedFolderId = propSelectedFolderId !== undefined 
    ? propSelectedFolderId 
    : storeSelectedFolderId;

  const handleRootSelect = () => {
    dispatch(selectFolder(null) as any);
    onFolderSelect?.(null);
  };

  return (
    <div className={`${className}`}>
      {/* Root folder (All Accounts) */}
      <div
        className={`
          flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer
          transition-colors duration-150
          ${selectedFolderId === null 
            ? 'bg-primary/10 text-primary' 
            : 'hover:bg-muted/50'
          }
        `}
        onClick={handleRootSelect}
      >
        <div className="w-5" />
        <FolderIcon className="w-5 h-5" />
        <span className="flex-1 text-sm font-medium">All Accounts</span>
      </div>

      {/* Folder Tree */}
      {(folders || []).map((folder) => (
        <FolderNode
          key={folder.id}
          folder={folder}
          onFolderSelect={onFolderSelect}
          selectedFolderId={selectedFolderId}
          expandedFolders={expandedFolders}
        />
      ))}
    </div>
  );
};

export default FolderTree;