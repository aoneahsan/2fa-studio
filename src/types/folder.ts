/**
 * Folder-related type definitions
 * @module types/folder
 */

export interface Folder {
  id: string;
  name: string;
  parentId: string | null; // null for root folders
  userId: string;
  color?: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
  accountCount?: number;
  subfolderCount?: number;
  path?: string[]; // Array of parent folder IDs for breadcrumb
}

export interface FolderTree extends Folder {
  children: FolderTree[];
  level: number;
}

export interface FolderMove {
  folderId: string;
  newParentId: string | null;
}

export interface FolderWithAccounts extends Folder {
  accounts: string[]; // Account IDs in this folder
}

// Predefined folder colors
export const FOLDER_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#14B8A6', // teal
  '#6366F1', // indigo
  '#F97316', // orange
  '#84CC16', // lime
] as const;

// Default system folders
export const DEFAULT_FOLDERS: Partial<Folder>[] = [
  {
    name: 'Work',
    color: '#3B82F6',
    icon: 'folder',
    parentId: null,
  },
  {
    name: 'Personal',
    color: '#10B981',
    icon: 'folder',
    parentId: null,
  },
];