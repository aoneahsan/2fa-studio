/**
 * Accounts management hook
 * @module hooks/useAccounts
 */

import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@src/config/firebase';
import { RootState, AppDispatch } from '@src/store';
import { 
  setAccounts, 
  addAccount as addAccountAction, 
  updateAccount as updateAccountAction,
  deleteAccount as deleteAccountAction,
  setLoading,
  setError,
} from '@store/slices/accountsSlice';
import { addToast } from '@store/slices/uiSlice';
import { OTPAccount } from '@services/otp.service';
import { EncryptionService } from '@services/encryption.service';
import { Preferences } from '@capacitor/preferences';

/**
 * Hook for managing OTP accounts
 */
export const useAccounts = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, encryptionKey } = useSelector((state: RootState) => state.auth);
  const accountsState = useSelector((state: RootState) => state.accounts);

  // Load accounts from Firestore
  useEffect(() => {
    if (!user || !encryptionKey) return;

    dispatch(setLoading(true));

    const q = query(collection(db, 'accounts'), where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        try {
          const decryptedAccounts: OTPAccount[] = [];
          
          for (const doc of snapshot.docs) {
            const encryptedData = doc.data();
            const decryptedSecret = await EncryptionService.decrypt({
              encryptedData: encryptedData.encryptedSecret,
              password: encryptionKey,
            });
            
            const account: OTPAccount = {
              id: doc.id,
              issuer: encryptedData.issuer || 'Unknown',
              label: encryptedData.label || 'Unknown',
              secret: decryptedSecret,
              algorithm: encryptedData.algorithm || 'SHA1',
              digits: encryptedData.digits || 6,
              period: encryptedData.period || 30,
              type: encryptedData.type || 'totp',
              counter: encryptedData.counter,
              iconUrl: encryptedData.iconUrl,
              tags: encryptedData.tags || [],
              notes: encryptedData.notes,
              backupCodes: encryptedData.backupCodes || [],
              createdAt: encryptedData.createdAt?.toDate() || new Date(),
              updatedAt: encryptedData.updatedAt?.toDate() || new Date(),
            };
            
            decryptedAccounts.push(account);
          }
          
          dispatch(setAccounts(decryptedAccounts));
          
          // Cache accounts locally for offline access
          await Preferences.set({
            key: 'cached_accounts',
            value: JSON.stringify(decryptedAccounts),
          });
        } catch (error) {
          console.error('Error loading accounts:', error);
          dispatch(setError('Failed to load accounts'));
          
          // Try to load from cache
          const cached = await Preferences.get({ key: 'cached_accounts' });
          if (cached.value) {
            dispatch(setAccounts(JSON.parse(cached.value)));
          }
        } finally {
          dispatch(setLoading(false));
        }
      },
      (error) => {
        console.error('Firestore error:', error);
        dispatch(setError('Failed to sync accounts'));
        dispatch(setLoading(false));
      }
    );

    return () => unsubscribe();
  }, [user, encryptionKey, dispatch]);

  // Add account
  const addAccount = useCallback(async (account: Omit<OTPAccount, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user || !encryptionKey) {
      throw new Error('User not authenticated');
    }

    try {
      dispatch(setLoading(true));
      
      // Encrypt the secret
      const encryptedSecret = await EncryptionService.encrypt({
        data: account.secret,
        password: encryptionKey,
      });
      
      const accountData = {
        ...account,
        userId: user.uid,
        encryptedSecret: JSON.stringify(encryptedSecret),
        secret: undefined, // Don't store plain secret
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await addDoc(collection(db, 'accounts'), accountData);
      
      dispatch(addToast({
        type: 'success',
        message: 'Account added successfully',
      }));
    } catch (error) {
      console.error('Error adding account:', error);
      dispatch(addToast({
        type: 'error',
        message: 'Failed to add account',
      }));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }, [user, encryptionKey, dispatch]);

  // Update account
  const updateAccount = useCallback(async (account: OTPAccount) => {
    if (!user || !encryptionKey) {
      throw new Error('User not authenticated');
    }

    try {
      dispatch(setLoading(true));
      
      // Re-encrypt the secret if it was changed
      const encryptedSecret = await EncryptionService.encrypt({
        data: account.secret,
        password: encryptionKey,
      });
      
      const accountData = {
        ...account,
        encryptedSecret: JSON.stringify(encryptedSecret),
        secret: undefined,
        updatedAt: new Date(),
      };
      
      await updateDoc(doc(db, 'accounts', account.id), accountData);
      
      dispatch(addToast({
        type: 'success',
        message: 'Account updated successfully',
      }));
    } catch (error) {
      console.error('Error updating account:', error);
      dispatch(addToast({
        type: 'error',
        message: 'Failed to update account',
      }));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }, [user, encryptionKey, dispatch]);

  // Delete account
  const deleteAccount = useCallback(async (accountId: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      dispatch(setLoading(true));
      
      await deleteDoc(doc(db, 'accounts', accountId));
      
      dispatch(addToast({
        type: 'success',
        message: 'Account deleted successfully',
      }));
    } catch (error) {
      console.error('Error deleting account:', error);
      dispatch(addToast({
        type: 'error',
        message: 'Failed to delete account',
      }));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }, [user, dispatch]);

  // Get filtered and sorted accounts
  const getFilteredAccounts = useCallback(() => {
    let filtered = [...accountsState.accounts];
    
    // Apply search filter
    if (accountsState.searchQuery) {
      const query = accountsState.searchQuery.toLowerCase();
      filtered = filtered.filter(account => 
        account.issuer.toLowerCase().includes(query) ||
        account.label.toLowerCase().includes(query) ||
        account.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Apply tag filter
    if (accountsState.selectedTags.length > 0) {
      filtered = filtered.filter(account =>
        account.tags?.some(tag => accountsState.selectedTags.includes(tag))
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (accountsState.sortBy) {
        case 'name':
          comparison = a.label.localeCompare(b.label);
          break;
        case 'issuer':
          comparison = a.issuer.localeCompare(b.issuer);
          break;
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'lastUsed':
          comparison = (a.updatedAt?.getTime() || 0) - (b.updatedAt?.getTime() || 0);
          break;
      }
      
      return accountsState.sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [accountsState]);

  return {
    accounts: accountsState.accounts,
    filteredAccounts: getFilteredAccounts(),
    isLoading: accountsState.isLoading,
    error: accountsState.error,
    addAccount,
    updateAccount,
    deleteAccount,
  };
};

export default useAccounts;