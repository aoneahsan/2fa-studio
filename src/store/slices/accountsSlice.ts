/**
 * Accounts Redux slice
 * @module store/slices/accounts
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { OTPAccount } from '@services/otp.service';

interface AccountsState {
  accounts: OTPAccount[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedTags: string[];
  selectedFolderId: string | null;
  sortBy: 'name' | 'issuer' | 'createdAt' | 'lastUsed' | 'favorite';
  sortOrder: 'asc' | 'desc';
  showFavoritesOnly: boolean;
}

const initialState: AccountsState = {
  accounts: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  selectedTags: [],
  selectedFolderId: null,
  sortBy: 'name',
  sortOrder: 'asc',
  showFavoritesOnly: false,
};

// Async thunks would go here for Firebase operations

const accountsSlice = createSlice({
  name: 'accounts',
  initialState,
  reducers: {
    setAccounts: (state, action: PayloadAction<OTPAccount[]>) => {
      state.accounts = action.payload;
    },
    addAccount: (state, action: PayloadAction<OTPAccount>) => {
      state.accounts.push(action.payload);
    },
    updateAccount: (state, action: PayloadAction<OTPAccount>) => {
      const index = state.accounts.findIndex(acc => acc.id === action.payload.id);
      if (index !== -1) {
        state.accounts[index] = action.payload;
      }
    },
    deleteAccount: (state, action: PayloadAction<string>) => {
      state.accounts = state.accounts.filter(acc => acc.id !== action.payload);
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setSelectedTags: (state, action: PayloadAction<string[]>) => {
      state.selectedTags = action.payload;
    },
    setSortBy: (state, action: PayloadAction<AccountsState['sortBy']>) => {
      state.sortBy = action.payload;
    },
    setSortOrder: (state, action: PayloadAction<AccountsState['sortOrder']>) => {
      state.sortOrder = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    incrementHOTPCounter: (state, action: PayloadAction<string>) => {
      const account = state.accounts.find(acc => acc.id === action.payload);
      if (account && account.type === 'hotp' && account.counter !== undefined) {
        account.counter += 1;
        account.updatedAt = new Date();
      }
    },
    toggleShowFavoritesOnly: (state) => {
      state.showFavoritesOnly = !state.showFavoritesOnly;
    },
    setShowFavoritesOnly: (state, action: PayloadAction<boolean>) => {
      state.showFavoritesOnly = action.payload;
    },
    setSelectedFolderId: (state, action: PayloadAction<string | null>) => {
      state.selectedFolderId = action.payload;
    },
  },
});

export const {
  setAccounts,
  addAccount,
  updateAccount,
  deleteAccount,
  setSearchQuery,
  setSelectedTags,
  setSortBy,
  setSortOrder,
  setLoading,
  setError,
  incrementHOTPCounter,
  toggleShowFavoritesOnly,
  setShowFavoritesOnly,
  setSelectedFolderId,
} = accountsSlice.actions;

// Selectors
export const selectAllAccounts = (state: { accounts: AccountsState }) => state.accounts.accounts;

export default accountsSlice.reducer;