/**
 * Folder selector component for selecting a target folder
 * @module components/folders/FolderSelector
 */

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectFolderTree } from '@store/slices/foldersSlice';
import FolderTree from './FolderTree';
import { FolderIcon } from '@heroicons/react/24/outline';

interface FolderSelectorProps {
  value: string | null;
  onChange: (folderId: string | null) => void;
  excludeFolders?: string[];
  placeholder?: string;
  className?: string;
}

/**
 * Dropdown folder selector
 */
const FolderSelector: React.FC<FolderSelectorProps> = ({
  value,
  onChange,
  excludeFolders = [],
  placeholder = 'Select a folder',
  className = '',
}) => {
  const folderTree = useSelector(selectFolderTree);
  const [isOpen, setIsOpen] = useState(false);

  const findFolderName = (folderId: string | null): string => {
    if (!folderId) return 'Root Level';
    
    const findInTree = (folders: typeof folderTree): string | null => {
      for (const folder of folders) {
        if (folder.id === folderId) return folder.name;
        if (folder.children) {
          const found = findInTree(folder.children);
          if (found) return found;
        }
      }
      return null;
    };

    return findInTree(folderTree) || 'Unknown Folder';
  };

  const handleSelect = (folderId: string | null) => {
    onChange(folderId);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 border border-border rounded-md bg-background hover:bg-muted/50 transition-colors"
      >
        <FolderIcon className="w-4 h-4 text-muted-foreground" />
        <span className="flex-1 text-left">
          {value !== undefined ? findFolderName(value) : placeholder}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-20 max-h-64 overflow-y-auto">
            <FolderTree
              folders={folderTree.filter((f: any) => !excludeFolders.includes(f.id))}
              selectedFolderId={value}
              onFolderSelect={handleSelect}
              className="p-2"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default FolderSelector;