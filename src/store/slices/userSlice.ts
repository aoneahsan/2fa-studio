/**
 * User Redux slice
 * @module store/slices/user
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  autoLock: boolean;
  autoLockTimeout: number;
  biometricEnabled: boolean;
  notifications: boolean;
}

interface UserState {
  preferences: UserPreferences;
  onboardingCompleted: boolean;
  lastSync: string | null;
}

const initialState: UserState = {
  preferences: {
    theme: 'system',
    autoLock: true,
    autoLockTimeout: 60, // seconds
    biometricEnabled: false,
    notifications: true,
  },
  onboardingCompleted: false,
  lastSync: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setPreferences: (state, action: PayloadAction<Partial<UserPreferences>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },
    setOnboardingCompleted: (state, action: PayloadAction<boolean>) => {
      state.onboardingCompleted = action.payload;
    },
    setLastSync: (state, action: PayloadAction<string | null>) => {
      state.lastSync = action.payload;
    },
    resetUserState: () => initialState,
  },
});

export const { 
  setPreferences, 
  setOnboardingCompleted, 
  setLastSync, 
  resetUserState 
} = userSlice.actions;

export default userSlice.reducer;