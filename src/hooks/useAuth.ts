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

  const signUp = async (email: string, password: string) => {
    try {
      dispatch(setLoading(true) as any);
      dispatch(clearError() as any);
      const user = await AuthService.signUp({ 
        email, 
        password
      });
      dispatch(setUser(user) as any);
    } catch (err: unknown) {
      dispatch(setError((err as Error).message || 'Sign up failed') as any);
      throw err;
    } finally {
      dispatch(setLoading(false) as any);
    }
  };

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

  const signInWithProvider = useCallback(async (provider: string) => {
    try {
      dispatch(setLoading(true) as any);
      dispatch(clearError() as any);
      const user = await AuthService.signInWithProvider(provider);
      return user;
    } catch (error: unknown) {
      dispatch(setError((error as Error).message || `${provider} sign in failed`) as any);
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

  const resetPassword = async (email: string) => {
    try {
      dispatch(setLoading(true) as any);
      dispatch(clearError() as any);
      await AuthService.sendPasswordResetEmail(email);
    } catch (err: unknown) {
      dispatch(setError((err as Error).message || 'Password reset failed') as any);
      throw err;
    } finally {
      dispatch(setLoading(false) as any);
    }
  };

  const updateProfile = async (displayName: string, photoURL?: string) => {
    try {
      dispatch(setLoading(true) as any);
      dispatch(clearError() as any);
      await AuthService.updateProfile(displayName, photoURL);
      // Update local user state if needed
      if (authState.user) {
        dispatch(setUser({ ...authState.user, displayName, photoURL: photoURL || authState.user.photoURL }) as any);
      }
    } catch (err: unknown) {
      dispatch(setError((err as Error).message || 'Profile update failed') as any);
      throw err;
    } finally {
      dispatch(setLoading(false) as any);
    }
  };

  const linkProvider = async (provider: string) => {
    try {
      dispatch(setLoading(true) as any);
      dispatch(clearError() as any);
      if (provider === 'google') {
        await AuthService.linkWithGoogle();
      }
    } catch (err: unknown) {
      dispatch(setError((err as Error).message || 'Account linking failed') as any);
      throw err;
    } finally {
      dispatch(setLoading(false) as any);
    }
  };

  const unlinkProvider = async (providerId: string) => {
    try {
      dispatch(setLoading(true) as any);
      dispatch(clearError() as any);
      await AuthService.unlinkProvider(providerId);
    } catch (err: unknown) {
      dispatch(setError((err as Error).message || 'Account unlinking failed') as any);
      throw err;
    } finally {
      dispatch(setLoading(false) as any);
    }
  };

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
    signUp,
    signInWithGoogle,
    signInWithApple,
    signInWithProvider,
    signOut,
    resetPassword,
    updateProfile,
    linkProvider,
    unlinkProvider,
    deleteAccount,
  };
};

export default useAuth;