/**
 * Redux slice for folder management
 * @module store/slices/foldersSlice
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { FolderService } from '@services/folder.service';
import { Folder, FolderTree } from '@types/folder';
import { RootState } from '@store/index';

interface FoldersState {
  folders: Folder[];
  folderTree: FolderTree[];
  selectedFolderId: string | null;
  expandedFolders: string[];
  isLoading: boolean;
  error: string | null;
}

const initialState: FoldersState = {
  folders: [],
  folderTree: [],
  selectedFolderId: null,
  expandedFolders: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchFolders = createAsyncThunk(
  'folders/fetchFolders',
  async (userId: string) => {
    const folders = await FolderService.getUserFolders(userId);
    const folderTree = await FolderService.getFolderTree(userId);
    return { folders, folderTree };
  }
);

export const createFolder = createAsyncThunk(
  'folders/createFolder',
  async ({ userId, folder }: { userId: string; folder: Omit<Folder, 'id' | 'userId' | 'createdAt' | 'updatedAt'> }) => {
    return await FolderService.createFolder(userId, folder);
  }
);

export const updateFolder = createAsyncThunk(
  'folders/updateFolder',
  async ({ userId, folderId, updates }: { userId: string; folderId: string; updates: Partial<Omit<Folder, 'id' | 'userId' | 'createdAt'>> }) => {
    await FolderService.updateFolder(userId, folderId, updates);
    return { folderId, updates };
  }
);

export const moveFolder = createAsyncThunk(
  'folders/moveFolder',
  async ({ userId, folderId, newParentId }: { userId: string; folderId: string; newParentId: string | null }) => {
    await FolderService.moveFolder(userId, folderId, newParentId);
    const folders = await FolderService.getUserFolders(userId);
    const folderTree = await FolderService.getFolderTree(userId);
    return { folders, folderTree };
  }
);

export const deleteFolder = createAsyncThunk(
  'folders/deleteFolder',
  async ({ userId, folderId, moveContentsTo }: { userId: string; folderId: string; moveContentsTo: string | null }) => {
    await FolderService.deleteFolder(userId, folderId, moveContentsTo);
    const folders = await FolderService.getUserFolders(userId);
    const folderTree = await FolderService.getFolderTree(userId);
    return { folders, folderTree };
  }
);

export const moveAccountsToFolder = createAsyncThunk(
  'folders/moveAccountsToFolder',
  async ({ userId, accountIds, folderId }: { userId: string; accountIds: string[]; folderId: string | null }) => {
    await FolderService.moveAccountsToFolder(userId, accountIds, folderId);
    await FolderService.updateAccountCounts(userId);
    const folders = await FolderService.getUserFolders(userId);
    return folders;
  }
);

export const initializeDefaultFolders = createAsyncThunk(
  'folders/initializeDefaultFolders',
  async (userId: string) => {
    await FolderService.initializeDefaultFolders(userId);
    const folders = await FolderService.getUserFolders(userId);
    const folderTree = await FolderService.getFolderTree(userId);
    return { folders, folderTree };
  }
);

// Slice
const foldersSlice = createSlice({
  name: 'folders',
  initialState,
  reducers: {
    selectFolder: (state, action: PayloadAction<string | null>) => {
      state.selectedFolderId = action.payload;
    },
    toggleFolderExpanded: (state, action: PayloadAction<string>) => {
      const folderId = action.payload;
      const index = state.expandedFolders.indexOf(folderId);
      if (index > -1) {
        state.expandedFolders.splice(index, 1);
      } else {
        state.expandedFolders.push(folderId);
      }
    },
    expandAllFolders: (state) => {
      state.expandedFolders = state.folders.map(f => f.id);
    },
    collapseAllFolders: (state) => {
      state.expandedFolders = [];
    },
    clearFoldersError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch folders
      .addCase(fetchFolders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFolders.fulfilled, (state, action) => {
        state.isLoading = false;
        state.folders = action.payload.folders;
        state.folderTree = action.payload.folderTree;
      })
      .addCase(fetchFolders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch folders';
      })
      // Create folder
      .addCase(createFolder.pending, (state) => {
        state.error = null;
      })
      .addCase(createFolder.fulfilled, (state, action) => {
        state.folders.push(action.payload);
        // Re-fetch to update tree
      })
      .addCase(createFolder.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to create folder';
      })
      // Update folder
      .addCase(updateFolder.fulfilled, (state, action) => {
        const { folderId, updates } = action.payload;
        const folderIndex = state.folders.findIndex(f => f.id === folderId);
        if (folderIndex > -1) {
          state.folders[folderIndex] = {
            ...state.folders[folderIndex],
            ...updates,
          };
        }
      })
      .addCase(updateFolder.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update folder';
      })
      // Move folder
      .addCase(moveFolder.fulfilled, (state, action) => {
        state.folders = action.payload.folders;
        state.folderTree = action.payload.folderTree;
      })
      .addCase(moveFolder.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to move folder';
      })
      // Delete folder
      .addCase(deleteFolder.fulfilled, (state, action) => {
        state.folders = action.payload.folders;
        state.folderTree = action.payload.folderTree;
        // Clear selection if deleted folder was selected
        if (state.selectedFolderId && !action.payload.folders.find(f => f.id === state.selectedFolderId)) {
          state.selectedFolderId = null;
        }
      })
      .addCase(deleteFolder.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to delete folder';
      })
      // Move accounts to folder
      .addCase(moveAccountsToFolder.fulfilled, (state, action) => {
        state.folders = action.payload;
      })
      .addCase(moveAccountsToFolder.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to move accounts';
      })
      // Initialize default folders
      .addCase(initializeDefaultFolders.fulfilled, (state, action) => {
        state.folders = action.payload.folders;
        state.folderTree = action.payload.folderTree;
      })
      .addCase(initializeDefaultFolders.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to initialize default folders';
      });
  },
});

// Actions
export const {
  selectFolder,
  toggleFolderExpanded,
  expandAllFolders,
  collapseAllFolders,
  clearFoldersError,
} = foldersSlice.actions;

// Selectors
export const selectFolders = (state: RootState) => state.folders.folders;
export const selectFolderTree = (state: RootState) => state.folders.folderTree;
export const selectSelectedFolderId = (state: RootState) => state.folders.selectedFolderId;
export const selectExpandedFolders = (state: RootState) => state.folders.expandedFolders;
export const selectFoldersLoading = (state: RootState) => state.folders.isLoading;
export const selectFoldersError = (state: RootState) => state.folders.error;

export const selectFolderById = (state: RootState, folderId: string) =>
  state.folders.folders.find(f => f.id === folderId);

export const selectFolderPath = (state: RootState, folderId: string): Folder[] => {
  const folders = state.folders.folders;
  const path: Folder[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const folder = folders.find(f => f.id === currentId);
    if (!folder) break;
    path.unshift(folder);
    currentId = folder.parentId;
  }

  return path;
};

export default foldersSlice.reducer;