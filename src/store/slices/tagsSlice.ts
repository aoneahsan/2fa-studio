/**
 * Tags Redux slice
 * @module store/slices/tags
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Tag, TagFilter } from '@types/tag';
import { TagService } from '@services/tag.service';
import { RootState } from '@store/index';

interface TagsState {
  tags: Tag[];
  activeTags: string[]; // Currently selected filter tags
  filterMode: 'AND' | 'OR';
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
}

const initialState: TagsState = {
  tags: [],
  activeTags: [],
  filterMode: 'OR',
  isLoading: false,
  error: null,
  lastFetch: null,
};

// Thunks
export const fetchTags = createAsyncThunk(
  'tags/fetchTags',
  async (userId: string) => {
    return await TagService.getUserTags(userId);
  }
);

export const createTag = createAsyncThunk(
  'tags/createTag',
  async ({ userId, tag }: { userId: string; tag: Omit<Tag, 'id' | 'userId' | 'createdAt' | 'updatedAt'> }) => {
    return await TagService.createTag(userId, tag);
  }
);

export const updateTag = createAsyncThunk(
  'tags/updateTag',
  async ({ userId, tagId, updates }: { userId: string; tagId: string; updates: Partial<Tag> }) => {
    await TagService.updateTag(userId, tagId, updates);
    return { tagId, updates };
  }
);

export const deleteTag = createAsyncThunk(
  'tags/deleteTag',
  async ({ userId, tagId }: { userId: string; tagId: string }) => {
    await TagService.deleteTag(userId, tagId);
    return tagId;
  }
);

export const addTagsToAccount = createAsyncThunk(
  'tags/addTagsToAccount',
  async ({ userId, accountId, tagIds }: { userId: string; accountId: string; tagIds: string[] }) => {
    await TagService.addTagsToAccount(userId, accountId, tagIds);
    return { accountId, tagIds };
  }
);

export const removeTagsFromAccount = createAsyncThunk(
  'tags/removeTagsFromAccount',
  async ({ userId, accountId, tagIds }: { userId: string; accountId: string; tagIds: string[] }) => {
    await TagService.removeTagsFromAccount(userId, accountId, tagIds);
    return { accountId, tagIds };
  }
);

export const bulkAddTags = createAsyncThunk(
  'tags/bulkAddTags',
  async ({ userId, accountIds, tagIds }: { userId: string; accountIds: string[]; tagIds: string[] }) => {
    await TagService.bulkAddTags(userId, accountIds, tagIds);
    return { accountIds, tagIds };
  }
);

export const initializeDefaultTags = createAsyncThunk(
  'tags/initializeDefaultTags',
  async (userId: string) => {
    await TagService.initializeDefaultTags(userId);
    return await TagService.getUserTags(userId);
  }
);

// Slice
const tagsSlice = createSlice({
  name: 'tags',
  initialState,
  reducers: {
    setActiveTags: (state, action: PayloadAction<string[]>) => {
      state.activeTags = action.payload;
    },
    toggleTag: (state, action: PayloadAction<string>) => {
      const tagId = action.payload;
      const index = state.activeTags.indexOf(tagId);
      
      if (index >= 0) {
        state.activeTags.splice(index, 1);
      } else {
        state.activeTags.push(tagId);
      }
    },
    clearActiveTags: (state) => {
      state.activeTags = [];
    },
    setFilterMode: (state, action: PayloadAction<'AND' | 'OR'>) => {
      state.filterMode = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch tags
    builder
      .addCase(fetchTags.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTags.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tags = action.payload;
        state.lastFetch = Date.now();
      })
      .addCase(fetchTags.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch tags';
      });

    // Create tag
    builder
      .addCase(createTag.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createTag.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tags.push(action.payload);
      })
      .addCase(createTag.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to create tag';
      });

    // Update tag
    builder
      .addCase(updateTag.fulfilled, (state, action) => {
        const { tagId, updates } = action.payload;
        const index = state.tags.findIndex(tag => tag.id === tagId);
        if (index >= 0) {
          state.tags[index] = { ...state.tags[index], ...updates };
        }
      })
      .addCase(updateTag.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update tag';
      });

    // Delete tag
    builder
      .addCase(deleteTag.fulfilled, (state, action) => {
        state.tags = state.tags.filter(tag => tag.id !== action.payload);
        state.activeTags = state.activeTags.filter(id => id !== action.payload);
      })
      .addCase(deleteTag.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to delete tag';
      });

    // Initialize default tags
    builder
      .addCase(initializeDefaultTags.fulfilled, (state, action) => {
        state.tags = action.payload;
        state.lastFetch = Date.now();
      });

    // Add tags to account - update account counts
    builder
      .addCase(addTagsToAccount.fulfilled, (state, action) => {
        const { tagIds } = action.payload;
        tagIds.forEach(tagId => {
          const tag = state.tags.find(t => t.id === tagId);
          if (tag) {
            tag.accountCount = (tag.accountCount || 0) + 1;
          }
        });
      });

    // Remove tags from account - update account counts
    builder
      .addCase(removeTagsFromAccount.fulfilled, (state, action) => {
        const { tagIds } = action.payload;
        tagIds.forEach(tagId => {
          const tag = state.tags.find(t => t.id === tagId);
          if (tag && tag.accountCount) {
            tag.accountCount = Math.max(0, tag.accountCount - 1);
          }
        });
      });
  },
});

// Actions
export const {
  setActiveTags,
  toggleTag,
  clearActiveTags,
  setFilterMode,
  clearError,
} = tagsSlice.actions;

// Selectors
export const selectTags = (state: RootState) => state.tags.tags;
export const selectActiveTags = (state: RootState) => state.tags.activeTags;
export const selectFilterMode = (state: RootState) => state.tags.filterMode;
export const selectTagsLoading = (state: RootState) => state.tags.isLoading;
export const selectTagsError = (state: RootState) => state.tags.error;

export const selectTagById = (tagId: string) => (state: RootState) =>
  state.tags.tags.find(tag => tag.id === tagId);

export const selectActiveTagObjects = (state: RootState) =>
  state.tags.activeTags.map(id => state.tags.tags.find(tag => tag.id === id)).filter(Boolean) as Tag[];

export const selectTagFilter = (state: RootState): TagFilter => ({
  tagIds: state.tags.activeTags,
  mode: state.tags.filterMode,
});

// Reducer
export default tagsSlice.reducer;