/**
 * Folder sidebar component for navigation
 * @module components/folders/FolderSidebar
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@store/index';
import { 
  fetchFolders,
  selectFolderTree,
  selectSelectedFolderId,
  expandAllFolders,
  collapseAllFolders,
  initializeDefaultFolders,
} from '@store/slices/foldersSlice';
import FolderTree from './FolderTree';
import { 
  FolderPlusIcon, 
  ChevronDoubleRightIcon,
  ChevronDoubleDownIcon,
  CogIcon,
} from '@heroicons/react/24/outline';

interface FolderSidebarProps {
  onFolderSelect?: (folderId: string | null) => void;
  onManageFolders: () => void;
  className?: string;
}

/**
 * Sidebar for folder navigation
 */
const FolderSidebar: React.FC<FolderSidebarProps> = ({ 
  onFolderSelect,
  onManageFolders,
  className = '' 
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state._auth);
  const folderTree = useSelector(selectFolderTree);
  const selectedFolderId = useSelector(selectSelectedFolderId);
  const isLoading = useSelector((state: RootState) => (state as any).folders.isLoading);

  useEffect(() => {
    if (user) {
      dispatch(fetchFolders(user.id) as any);
    }
  }, [user, dispatch]);

  const handleInitializeDefaults = async () => {
    if (user) {
      await dispatch(initializeDefaultFolders(user.id) as any);
    }
  };

  return (
    <div className={`bg-card border border-border rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">Folders</h3>
          <div className="flex gap-1">
            <button
              onClick={() => dispatch(expandAllFolders() as any)}
              className="btn btn-ghost btn-xs btn-icon"
              title="Expand all"
            >
              <ChevronDoubleDownIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => dispatch(collapseAllFolders() as any)}
              className="btn btn-ghost btn-xs btn-icon"
              title="Collapse all"
            >
              <ChevronDoubleRightIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onManageFolders}
              className="btn btn-ghost btn-xs btn-icon"
              title="Manage folders"
            >
              <CogIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Folder Tree */}
      <div className="p-2">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Loading folders...
          </div>
        ) : folderTree.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm mb-3">
              No folders yet
            </p>
            <button
              onClick={handleInitializeDefaults}
              className="btn btn-primary btn-sm"
            >
              <FolderPlusIcon className="w-4 h-4" />
              Create Default Folders
            </button>
          </div>
        ) : (
          <FolderTree
            folders={folderTree}
            onFolderSelect={onFolderSelect}
            selectedFolderId={selectedFolderId}
          />
        )}
      </div>

      {/* Footer Stats */}
      {folderTree.length > 0 && (
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
          {folderTree.length} folder{folderTree.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default FolderSidebar;