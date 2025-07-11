/**
 * Settings Redux slice
 * @module store/slices/settings
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserSettings } from '../../types';

interface SettingsState extends UserSettings {
  isLoading: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  theme: 'system',
  biometricEnabled: false,
  autoLockTimeout: 5, // 5 minutes
  showNotifications: true,
  language: 'en',
  backupEnabled: false,
  backupFrequency: 'weekly',
  isLoading: false,
  error: null,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setSettings: (state, action: PayloadAction<Partial<UserSettings>>) => {
      Object.assign(state, action.payload);
    },
    setTheme: (state, action: PayloadAction<UserSettings['theme']>) => {
      state.theme = action.payload;
    },
    setBiometricEnabled: (state, action: PayloadAction<boolean>) => {
      state.biometricEnabled = action.payload;
    },
    setAutoLockTimeout: (state, action: PayloadAction<number>) => {
      state.autoLockTimeout = action.payload;
    },
    setShowNotifications: (state, action: PayloadAction<boolean>) => {
      state.showNotifications = action.payload;
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    setBackupEnabled: (state, action: PayloadAction<boolean>) => {
      state.backupEnabled = action.payload;
    },
    setBackupFrequency: (state, action: PayloadAction<UserSettings['backupFrequency']>) => {
      state.backupFrequency = action.payload;
    },
    setLastBackup: (state, action: PayloadAction<Date>) => {
      state.lastBackup = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setSettings,
  setTheme,
  setBiometricEnabled,
  setAutoLockTimeout,
  setShowNotifications,
  setLanguage,
  setBackupEnabled,
  setBackupFrequency,
  setLastBackup,
  setLoading,
  setError,
} = settingsSlice.actions;

export default settingsSlice.reducer;