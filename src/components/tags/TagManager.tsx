/**
 * TagManager Component
 * @module components/tags/TagManager
 */

import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { useAppSelector } from '@hooks/useAppSelector';
import {
  selectTags,
  createTag,
  updateTag,
  deleteTag,
} from '@store/slices/tagsSlice';
import { Tag, TAG_COLORS } from '@app-types/tag';
import TagPill from './TagPill';
import LoadingSpinner from '@components/common/LoadingSpinner';

interface TagManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TagFormData {
  name: string;
  color: string;
  description: string;
}

const TagManager: React.FC<TagManagerProps> = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const tags = useAppSelector(selectTags);
  const user = useAppSelector(state => state.auth.user);
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState<TagFormData>({
    name: '',
    color: TAG_COLORS[0],
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({
      name: '',
      color: TAG_COLORS[0],
      description: '',
    });
    setIsCreating(false);
    setEditingTag(null);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingTag(null);
    setFormData({
      name: '',
      color: TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)],
      description: '',
    });
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setIsCreating(false);
    setFormData({
      name: tag.name,
      color: tag.color,
      description: tag.description || '',
    });
  };

  const handleSubmit = async (_e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingTag) {
        await dispatch(updateTag({
          userId: user.id,
          tagId: editingTag.id,
          updates: formData,
        })).unwrap();
      } else {
        await dispatch(createTag({
          userId: user.id,
          tag: formData,
        })).unwrap();
      }
      resetForm();
    } catch (_error) {
      console.error('Failed to save tag:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (tagId: string) => {
    if (!user) return;
    
    try {
      await dispatch(deleteTag({
        userId: user.id,
        tagId,
      })).unwrap();
      setDeleteConfirm(null);
    } catch (_error) {
      console.error('Failed to delete tag:', error);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <TagIcon className="h-5 w-5" />
              Manage Tags
            </Dialog.Title>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6">
            {/* Create/Edit Form */}
            {(isCreating || editingTag) && (
              <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
                  {editingTag ? 'Edit Tag' : 'Create New Tag'}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
                      placeholder="e.g., Work, Personal, Finance"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {TAG_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          className={`w-8 h-8 rounded-full ring-2 ring-offset-2 ${
                            formData.color === color
                              ? 'ring-blue-500'
                              : 'ring-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description (optional)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
                      rows={2}
                      placeholder="Add a description..."
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <LoadingSpinner size="sm" />
                    ) : editingTag ? (
                      'Save Changes'
                    ) : (
                      'Create Tag'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Tags List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Your Tags ({tags.length})
                </h3>
                {!isCreating && !editingTag && (
                  <button
                    type="button"
                    onClick={handleCreate}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <PlusIcon className="h-4 w-4" />
                    New Tag
                  </button>
                )}
              </div>

              {tags.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                  No tags yet. Create your first tag to start organizing your accounts.
                </p>
              ) : (
                <div className="space-y-2">
                  {tags.map(tag => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <TagPill tag={tag} size="md" />
                        <div>
                          {tag.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {tag.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {tag.accountCount || 0} accounts
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {!tag.isDefault && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEdit(tag)}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            {deleteConfirm === tag.id ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-red-600 dark:text-red-400">
                                  Delete?
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(tag.id)}
                                  className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirm(null)}
                                  className="text-xs text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(tag.id)}
                                className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default TagManager;