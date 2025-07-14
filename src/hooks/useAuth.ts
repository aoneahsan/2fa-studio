/**
 * Authentication hook
 * @module hooks/useAuth
 */

import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@src/store';
import { setUser, setLoading, setError, clearError } from '@store/slices/authSlice';
import { AuthService } from '@services/auth.service';
import { RealtimeSyncService } from '@services/realtime-sync.service';
import { User } from 'firebase/auth';

/**
 * Hook for managing authentication state with enhanced Firebase integration
 */
export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const authState = useSelector((state: RootState) => state._auth);

  useEffect(() => {
    dispatch(setLoading(true));
    
    // Initialize enhanced auth listener
    const unsubscribe = AuthService.initialize(async (user) => {
      dispatch(setUser(user));
      
      // Initialize sync service when user is authenticated
      if (user) {
        try {
          await RealtimeSyncService.initialize(user.uid);
        } catch (_error) {
          console.error('Failed to initialize sync service:', error);
        }
      } else {
        // Cleanup sync service when user logs out
        RealtimeSyncService.cleanup();
      }
      
      dispatch(setLoading(false));
    });

    return () => {
      unsubscribe();
      RealtimeSyncService.cleanup();
    };
  }, [dispatch]);

  // Enhanced authentication methods
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      const user = await AuthService.signInWithEmail(email, password);
      return user;
    } catch (_error: unknown) {
      dispatch(setError(error.message || 'Sign in failed'));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const signUpWithEmail = useCallback(async (email: string, password: string, displayName?: string) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      const user = await AuthService.signUpWithEmail(email, password, displayName);
      return user;
    } catch (_error: unknown) {
      dispatch(setError(error.message || 'Sign up failed'));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const signInWithGoogle = useCallback(async () => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      const user = await AuthService.signInWithGoogle();
      return user;
    } catch (_error: unknown) {
      dispatch(setError(error.message || 'Google sign in failed'));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const signInWithApple = useCallback(async () => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      const user = await AuthService.signInWithApple();
      return user;
    } catch (_error: unknown) {
      dispatch(setError(error.message || 'Apple sign in failed'));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const signOut = useCallback(async () => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      await AuthService.signOut();
    } catch (_error: unknown) {
      dispatch(setError(error.message || 'Sign out failed'));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      await AuthService.resetPassword(email);
    } catch (_error: unknown) {
      dispatch(setError(error.message || 'Password reset failed'));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const updateProfile = useCallback(async (data: { displayName?: string; photoURL?: string }) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      const updatedUser = await AuthService.updateProfile(data);
      dispatch(setUser(updatedUser));
      return updatedUser;
    } catch (_error: unknown) {
      dispatch(setError(error.message || 'Profile update failed'));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const linkAccount = useCallback(async (provider: 'google' | 'apple') => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      const linkedUser = await AuthService.linkAccount(provider);
      dispatch(setUser(linkedUser));
      return linkedUser;
    } catch (_error: unknown) {
      dispatch(setError(error.message || 'Account linking failed'));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const unlinkAccount = useCallback(async (providerId: string) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      const updatedUser = await AuthService.unlinkAccount(providerId);
      dispatch(setUser(updatedUser));
      return updatedUser;
    } catch (_error: unknown) {
      dispatch(setError(error.message || 'Account unlinking failed'));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const deleteAccount = useCallback(async () => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      await AuthService.deleteAccount();
    } catch (_error: unknown) {
      dispatch(setError(error.message || 'Account deletion failed'));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  return {
    // State
    user: authState.user,
    isLoading: authState.isLoading,
    isAuthenticated: authState.isAuthenticated,
    _error: authState._error,
    
    // Enhanced authentication methods
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithApple,
    signOut,
    resetPassword,
    updateProfile,
    linkAccount,
    unlinkAccount,
    deleteAccount,
  };
};

export default useAuth;