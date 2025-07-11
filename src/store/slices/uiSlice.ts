/**
 * UI Redux slice
 * @module store/slices/ui
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Modal {
  type: 'addAccount' | 'editAccount' | 'deleteAccount' | 'backup' | 'import' | 'export' | 'settings' | null;
  data?: any;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface UIState {
  modal: Modal;
  toasts: Toast[];
  isLocked: boolean;
  isSidebarOpen: boolean;
  isLoading: boolean;
  loadingMessage: string | null;
}

const initialState: UIState = {
  modal: { type: null },
  toasts: [],
  isLocked: false,
  isSidebarOpen: false,
  isLoading: false,
  loadingMessage: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openModal: (state, action: PayloadAction<Modal>) => {
      state.modal = action.payload;
    },
    closeModal: (state) => {
      state.modal = { type: null };
    },
    addToast: (state, action: PayloadAction<Omit<Toast, 'id'>>) => {
      const toast: Toast = {
        ...action.payload,
        id: Date.now().toString(),
      };
      state.toasts.push(toast);
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(toast => toast.id !== action.payload);
    },
    clearToasts: (state) => {
      state.toasts = [];
    },
    setLocked: (state, action: PayloadAction<boolean>) => {
      state.isLocked = action.payload;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.isSidebarOpen = action.payload;
    },
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    setLoading: (state, action: PayloadAction<{ isLoading: boolean; message?: string }>) => {
      state.isLoading = action.payload.isLoading;
      state.loadingMessage = action.payload.message || null;
    },
  },
});

export const {
  openModal,
  closeModal,
  addToast,
  removeToast,
  clearToasts,
  setLocked,
  setSidebarOpen,
  toggleSidebar,
  setLoading,
} = uiSlice.actions;

export default uiSlice.reducer;