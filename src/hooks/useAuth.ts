/**
 * Authentication hook
 * @module hooks/useAuth
 */

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@src/store';
import { setUser, setLoading, setError } from '@store/slices/authSlice';
import { AuthService } from '@services/auth.service';

/**
 * Hook for managing authentication state
 */
export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const authState = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(setLoading(true));
    
    // Initialize auth listener
    const unsubscribe = AuthService.initialize((user) => {
      dispatch(setUser(user));
      dispatch(setLoading(false));
    });

    return () => unsubscribe();
  }, [dispatch]);

  return {
    user: authState.user,
    isLoading: authState.isLoading,
    isAuthenticated: authState.isAuthenticated,
    error: authState.error,
  };
};

export default useAuth;