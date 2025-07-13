/**
 * Redux store configuration
 * @module store
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@store/slices/authSlice';
import accountsReducer from '@store/slices/accountsSlice';
import settingsReducer from '@store/slices/settingsSlice';
import uiReducer from '@store/slices/uiSlice';
import tagsReducer from '@store/slices/tagsSlice';
import foldersReducer from '@store/slices/foldersSlice';

export const store = configureStore({
  reducer: {
    _auth: authReducer,
    accounts: accountsReducer,
    settings: settingsReducer,
    ui: uiReducer,
    tags: tagsReducer,
    folders: foldersReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['auth.user.createdAt', 'auth.user.updatedAt'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;