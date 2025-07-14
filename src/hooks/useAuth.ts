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
    dispatch(setLoading(true) as any);
    
    // Initialize enhanced auth listener
    const unsubscribe = AuthService.initialize(async (user) => {
      dispatch(setUser(user) as any);
      
      // Initialize sync service when user is authenticated
      if (user) {
        try {
          await RealtimeSyncService.initialize(user?.uid || '');
        } catch (error) {
          console.error('Failed to initialize sync service:', error);
        }
      } else {
        // Cleanup sync service when user logs out
        RealtimeSyncService.cleanup();
      }
      
      dispatch(setLoading(false) as any);
    });

    return () => {
      unsubscribe();
      RealtimeSyncService.cleanup();
    };
  }, [dispatch]);

  // Enhanced authentication methods
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      dispatch(setLoading(true) as any);
      dispatch(clearError() as any);
      const user = await AuthService.signIn({ email, password });
      return user;
    } catch (error: unknown) {
      dispatch(setError((error as Error).message || 'Sign in failed') as any);
      throw error;
    } finally {
      dispatch(setLoading(false) as any);
    }
  }, [dispatch]);

  const signUpWithEmail = useCallback(async (email: string, password: string, displayName?: string) => {
    try {
      dispatch(setLoading(true) as any);
      dispatch(clearError() as any);
      const user = await AuthService.signUp({ email, password, displayName });
      return user;
    } catch (error: unknown) {
      dispatch(setError((error as Error).message || 'Sign up failed') as any);
      throw error;
    } finally {
      dispatch(setLoading(false) as any);
    }
  }, [dispatch]);

  const signInWithGoogle = useCallback(async () => {
    try {
      dispatch(setLoading(true) as any);
      dispatch(clearError() as any);
      const user = await AuthService.signInWithGoogle();
      return user;
    } catch (error: unknown) {
      dispatch(setError((error as Error).message || 'Google sign in failed') as any);
      throw error;
    } finally {
      dispatch(setLoading(false) as any);
    }
  }, [dispatch]);

  const signInWithApple = useCallback(async () => {
    try {
      dispatch(setLoading(true) as any);
      dispatch(clearError() as any);
      const user = await AuthService.signInWithApple();
      return user;
    } catch (error: unknown) {
      dispatch(setError((error as Error).message || 'Apple sign in failed') as any);
      throw error;
    } finally {
      dispatch(setLoading(false) as any);
    }
  }, [dispatch]);

  const signOut = useCallback(async () => {
    try {
      dispatch(setLoading(true) as any);
      dispatch(clearError() as any);
      await AuthService.signOut();
    } catch (error: unknown) {
      dispatch(setError((error as Error).message || 'Sign out failed') as any);
      throw error;
    } finally {
      dispatch(setLoading(false) as any);
    }
  }, [dispatch]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      dispatch(setLoading(true) as any);
      dispatch(clearError() as any);
      await AuthService.resetPassword(email);
    } catch (error: unknown) {
      dispatch(setError((error as Error).message || 'Password reset failed') as any);
      throw error;
    } finally {
      dispatch(setLoading(false) as any);
    }
  }, [dispatch]);

  const updateProfile = useCallback(async (data: { displayName?: string; photoURL?: string }) => {
    try {
      dispatch(setLoading(true) as any);
      dispatch(clearError() as any);
      const updatedUser = await AuthService.updateProfile(data);
      dispatch(setUser(updatedUser) as any);
      return updatedUser;
    } catch (error: unknown) {
      dispatch(setError((error as Error).message || 'Profile update failed') as any);
      throw error;
    } finally {
      dispatch(setLoading(false) as any);
    }
  }, [dispatch]);

  const linkAccount = useCallback(async (provider: 'google' | 'apple') => {
    try {
      dispatch(setLoading(true) as any);
      dispatch(clearError() as any);
      const linkedUser = await AuthService.linkAccount(provider);
      dispatch(setUser(linkedUser) as any);
      return linkedUser;
    } catch (error: unknown) {
      dispatch(setError((error as Error).message || 'Account linking failed') as any);
      throw error;
    } finally {
      dispatch(setLoading(false) as any);
    }
  }, [dispatch]);

  const unlinkAccount = useCallback(async (providerId: string) => {
    try {
      dispatch(setLoading(true) as any);
      dispatch(clearError() as any);
      const updatedUser = await AuthService.unlinkAccount(providerId);
      dispatch(setUser(updatedUser) as any);
      return updatedUser;
    } catch (error: unknown) {
      dispatch(setError((error as Error).message || 'Account unlinking failed') as any);
      throw error;
    } finally {
      dispatch(setLoading(false) as any);
    }
  }, [dispatch]);

  const deleteAccount = useCallback(async () => {
    try {
      dispatch(setLoading(true) as any);
      dispatch(clearError() as any);
      await AuthService.deleteAccount();
    } catch (error: unknown) {
      dispatch(setError((error as Error).message || 'Account deletion failed') as any);
      throw error;
    } finally {
      dispatch(setLoading(false) as any);
    }
  }, [dispatch]);

  return {
    // State
    user: authState.user,
    isLoading: authState.isLoading,
    isAuthenticated: authState.isAuthenticated,
    error: authState.error,
    
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