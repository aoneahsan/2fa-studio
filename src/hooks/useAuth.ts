/**
 * Authentication hook
 * @module hooks/useAuth
 */

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { RootState, AppDispatch } from '../store';
import { setUser, setLoading, setError } from '../store/slices/authSlice';
import { User } from '../types';

/**
 * Hook for managing authentication state
 */
export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const authState = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      dispatch(setLoading(true));
      
      try {
        if (firebaseUser) {
          // Fetch additional user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          let userData: User;
          
          if (userDoc.exists()) {
            userData = userDoc.data() as User;
          } else {
            // Create new user document
            userData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || undefined,
              photoURL: firebaseUser.photoURL || undefined,
              phoneNumber: firebaseUser.phoneNumber || undefined,
              createdAt: new Date(),
              updatedAt: new Date(),
              subscription: {
                type: 'free',
                status: 'active',
                startDate: new Date(),
                features: ['basic_2fa', 'limited_accounts'],
                accountLimit: 10,
              },
              settings: {
                theme: 'system',
                biometricEnabled: false,
                autoLockTimeout: 5,
                showNotifications: true,
                language: 'en',
                backupEnabled: false,
                backupFrequency: 'weekly',
              },
            };
            
            await setDoc(doc(db, 'users', firebaseUser.uid), userData);
          }
          
          dispatch(setUser(userData));
        } else {
          dispatch(setUser(null));
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        dispatch(setError('Failed to load user data'));
      } finally {
        dispatch(setLoading(false));
      }
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