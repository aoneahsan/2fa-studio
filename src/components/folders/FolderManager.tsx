/**
 * Folder manager modal for creating and managing folders
 * @module components/folders/FolderManager
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@store/index';
import { 
  createFolder, 
  updateFolder, 
  deleteFolder,
  selectFolders,
  selectFolderTree,
  clearFoldersError,
  selectFoldersError
} from '@store/slices/foldersSlice';
import { Folder, FOLDER_COLORS } from '@app-types/folder';
import FolderTree from './FolderTree';
import { 
  XMarkIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  FolderIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface FolderManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FolderFormData {
  name: string;
  parentId: string | null;
  color: string;
  icon?: string;
}

/**
 * Modal for managing folders
 */
const FolderManager: React.FC<FolderManagerProps> = ({ isOpen, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state._auth);
  const folders = useSelector(selectFolders);
  const folderTree = useSelector(selectFolderTree);
  const error = useSelector(selectFoldersError);
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FolderFormData>({
    name: '',
    parentId: null,
    color: FOLDER_COLORS[0],
    icon: 'folder',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    folderId: string;
    moveContentsTo: string | null;
  } | null>(null);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearFoldersError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [_error, dispatch]);

  const handleCreate = async () => {
    if (!user || !formData.name.trim()) return;

    try {
      await dispatch(createFolder({
        userId: user.id,
        folder: {
          name: formData.name.trim(),
          parentId: formData.parentId,
          color: formData.color,
          icon: formData.icon,
        },
      })).unwrap();

      // Reset form
      setIsCreating(false);
      setFormData({
        name: '',
        parentId: null,
        color: FOLDER_COLORS[0],
        icon: 'folder',
      });
    } catch (err) {
      // Error is handled by Redux
    }
  };

  const handleUpdate = async () => {
    if (!user || !editingFolder || !formData.name.trim()) return;

    try {
      await dispatch(updateFolder({
        userId: user.id,
        folderId: editingFolder.id,
        updates: {
          name: formData.name.trim(),
          color: formData.color,
          icon: formData.icon,
        },
      })).unwrap();

      // Reset form
      setEditingFolder(null);
      setFormData({
        name: '',
        parentId: null,
        color: FOLDER_COLORS[0],
        icon: 'folder',
      });
    } catch (err) {
      // Error is handled by Redux
    }
  };

  const handleDelete = async () => {
    if (!user || !deleteConfirm) return;

    try {
      await dispatch(deleteFolder({
        userId: user.id,
        folderId: deleteConfirm.folderId,
        moveContentsTo: deleteConfirm.moveContentsTo,
      })).unwrap();

      setDeleteConfirm(null);
      setSelectedFolderId(null);
    } catch (err) {
      // Error is handled by Redux
    }
  };

  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolderId(folderId);
    if (folderId) {
      const folder = folders.find(f => f.id === folderId);
      if (folder) {
        setFormData({
          name: folder.name,
          parentId: folder.parentId,
          color: folder.color || FOLDER_COLORS[0],
          icon: folder.icon || 'folder',
        });
      }
    }
  };

  const handleStartEdit = () => {
    if (!selectedFolderId) return;
    const folder = folders.find(f => f.id === selectedFolderId);
    if (folder) {
      setEditingFolder(folder);
      setFormData({
        name: folder.name,
        parentId: folder.parentId,
        color: folder.color || FOLDER_COLORS[0],
        icon: folder.icon || 'folder',
      });
    }
  };

  const selectedFolder = selectedFolderId ? folders.find(f => f.id === selectedFolderId) : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold">Manage Folders</h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-icon"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-4 h-4" />
              {error}
            </p>
          </div>
        )}

        <div className="flex-1 overflow-hidden flex">
          {/* Folder Tree */}
          <div className="w-1/2 border-r border-border p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Folders</h3>
              <button
                onClick={() => setIsCreating(true)}
                className="btn btn-primary btn-sm"
                disabled={isCreating || editingFolder !== null}
              >
                <PlusIcon className="w-4 h-4" />
                New Folder
              </button>
            </div>
            
            <FolderTree
              folders={folderTree}
              selectedFolderId={selectedFolderId}
              onFolderSelect={handleFolderSelect}
            />
          </div>

          {/* Folder Details/Form */}
          <div className="w-1/2 p-4 overflow-y-auto">
            {isCreating || editingFolder ? (
              <div className="space-y-4">
                <h3 className="font-medium">
                  {isCreating ? 'Create New Folder' : 'Edit Folder'}
                </h3>

                {/* Name Input */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Folder Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input input-bordered w-full"
                    placeholder="Enter folder name"
                    autoFocus
                  />
                </div>

                {/* Parent Folder (only for new folders) */}
                {isCreating && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Parent Folder
                    </label>
                    <select
                      value={formData.parentId || ''}
                      onChange={(e) => setFormData({ ...formData, parentId: e.target.value || null })}
                      className="select select-bordered w-full"
                    >
                      <option value="">Root Level</option>
                      {folders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {folder.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Color Picker */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Folder Color
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {FOLDER_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setFormData({ ...formData, color })}
                        className={`
                          w-8 h-8 rounded-md border-2 transition-all
                          ${formData.color === color 
                            ? 'border-foreground scale-110' 
                            : 'border-transparent'
                          }
                        `}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={isCreating ? handleCreate : handleUpdate}
                    className="btn btn-primary"
                    disabled={!formData.name.trim()}
                  >
                    {isCreating ? 'Create' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setEditingFolder(null);
                      setFormData({
                        name: '',
                        parentId: null,
                        color: FOLDER_COLORS[0],
                        icon: 'folder',
                      });
                    }}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : selectedFolder ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium flex items-center gap-2">
                    <FolderIcon 
                      className="w-5 h-5" 
                      style={{ color: selectedFolder.color || undefined }}
                    />
                    {selectedFolder.name}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleStartEdit}
                      className="btn btn-outline btn-sm"
                    >
                      <PencilIcon className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ 
                        folderId: selectedFolder.id, 
                        moveContentsTo: null 
                      })}
                      className="btn btn-outline btn-sm text-error"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Accounts:</span>{' '}
                    <span className="font-medium">{selectedFolder.accountCount || 0}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Subfolders:</span>{' '}
                    <span className="font-medium">{selectedFolder.subfolderCount || 0}</span>
                  </p>
                  {selectedFolder.parentId && (
                    <p>
                      <span className="text-muted-foreground">Parent:</span>{' '}
                      <span className="font-medium">
                        {folders.find(f => f.id === selectedFolder.parentId)?.name || 'Unknown'}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a folder to view details
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {deleteConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Delete Folder</h3>
              <p className="text-sm text-muted-foreground mb-4">
                What would you like to do with the contents of this folder?
              </p>
              
              <div className="space-y-2 mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="deleteOption"
                    checked={deleteConfirm.moveContentsTo === null}
                    onChange={() => setDeleteConfirm({ ...deleteConfirm, moveContentsTo: null })}
                    className="radio"
                  />
                  <span className="text-sm">Delete folder and all its contents</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="deleteOption"
                    checked={deleteConfirm.moveContentsTo !== null}
                    onChange={() => setDeleteConfirm({ ...deleteConfirm, moveContentsTo: '' })}
                    className="radio"
                  />
                  <span className="text-sm">Move contents to another folder</span>
                </label>
              </div>

              {deleteConfirm.moveContentsTo !== null && (
                <select
                  value={deleteConfirm.moveContentsTo}
                  onChange={(e) => setDeleteConfirm({ ...deleteConfirm, moveContentsTo: e.target.value || null })}
                  className="select select-bordered w-full mb-4"
                >
                  <option value="">Root Level</option>
                  {folders
                    .filter(f => f.id !== deleteConfirm.folderId)
                    .map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                </select>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="btn btn-error"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FolderManager;