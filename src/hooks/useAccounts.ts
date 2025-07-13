/**
 * Accounts management hook
 * @module hooks/useAccounts
 */

import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch, store } from '@src/store';
import { 
  setAccounts, 
  addAccount as addAccountAction, 
  updateAccount as updateAccountAction,
  deleteAccount as deleteAccountAction,
  setLoading,
  setError,
} from '@store/slices/accountsSlice';
import { selectActiveTags, selectFilterMode } from '@store/slices/tagsSlice';
import { addToast } from '@store/slices/uiSlice';
import { OTPAccount } from '@services/otp.service';
import { FirestoreService } from '@services/firestore.service';
import { MobileEncryptionService } from '@services/mobile-encryption.service';
import { RealtimeSyncService } from '@services/realtime-sync.service';
import { Preferences } from '@capacitor/preferences';
import { AuditLogService } from '@services/audit-log.service';

/**
 * Hook for managing OTP accounts
 */
export const useAccounts = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, encryptionKey } = useSelector((state: RootState) => state.auth);
  const accountsState = useSelector((state: RootState) => state.accounts);
  const activeTags = useSelector(selectActiveTags);
  const filterMode = useSelector(selectFilterMode);
  const selectedFolderId = useSelector((state: RootState) => state.folders.selectedFolderId);

  // Load accounts using FirestoreService with real-time sync
  useEffect(() => {
    if (!user || !encryptionKey) return;

    dispatch(setLoading(true));

    // Subscribe to accounts collection using FirestoreService
    const unsubscribe = FirestoreService.subscribeToCollection<any>(
      `users/${user.uid}/accounts`,
      [],
      async (documents) => {
        try {
          const decryptedAccounts: OTPAccount[] = [];
          
          for (const doc of documents) {
            // Decrypt account secret using MobileEncryptionService
            const decryptedSecret = await MobileEncryptionService.decryptData(
              doc.encryptedSecret,
              user.uid
            );
            
            const account: OTPAccount = {
              id: doc.id,
              issuer: doc.issuer || 'Unknown',
              label: doc.label || 'Unknown',
              secret: decryptedSecret,
              algorithm: doc.algorithm || 'SHA1',
              digits: doc.digits || 6,
              period: doc.period || 30,
              type: doc.type || 'totp',
              counter: doc.counter,
              iconUrl: doc.iconUrl,
              tags: doc.tags || [],
              notes: doc.notes,
              backupCodes: doc.backupCodes || [],
              createdAt: doc.createdAt?.toDate() || new Date(),
              updatedAt: doc.updatedAt?.toDate() || new Date(),
              isFavorite: doc.isFavorite || false,
              folderId: doc.folderId || null,
              requiresBiometric: doc.requiresBiometric || false,
              biometricTimeout: doc.biometricTimeout,
              lastBiometricAuth: doc.lastBiometricAuth?.toDate(),
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
        console.error('Firestore subscription error:', error);
        dispatch(setError('Failed to sync accounts'));
        dispatch(setLoading(false));
      }
    );

    return () => unsubscribe();
  }, [user, encryptionKey, dispatch]);

  // Add account using FirestoreService and MobileEncryptionService
  const addAccount = useCallback(async (account: Omit<OTPAccount, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user || !encryptionKey) {
      throw new Error('User not authenticated');
    }

    try {
      dispatch(setLoading(true));
      
      // Encrypt the secret using MobileEncryptionService
      const encryptedSecret = await MobileEncryptionService.encryptData(
        account.secret,
        user.uid
      );
      
      const accountData = {
        ...account,
        userId: user.uid,
        encryptedSecret,
        secret: undefined, // Don't store plain secret
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Use FirestoreService to create document
      const documentId = await FirestoreService.createDocument(
        `users/${user.uid}/accounts`,
        accountData
      );
      
      // Queue sync operation using RealtimeSyncService
      RealtimeSyncService.queueOperation(
        documentId,
        'create',
        `users/${user.uid}/accounts`,
        accountData
      );
      
      dispatch(addToast({
        type: 'success',
        message: 'Account added successfully',
      }));
      
      // Log account creation
      await AuditLogService.log({
        userId: user.uid,
        action: 'account.created',
        resource: `account/${documentId}`,
        severity: 'info',
        success: true,
        details: {
          issuer: account.issuer,
          label: account.label,
          type: account.type,
          hasTags: (account.tags?.length || 0) > 0,
          hasFolderId: !!account.folderId,
          requiresBiometric: account.requiresBiometric || false
        }
      });
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

  // Update account using FirestoreService
  const updateAccount = useCallback(async (account: OTPAccount) => {
    if (!user || !encryptionKey) {
      throw new Error('User not authenticated');
    }

    try {
      dispatch(setLoading(true));
      
      // Re-encrypt the secret using MobileEncryptionService
      const encryptedSecret = await MobileEncryptionService.encryptData(
        account.secret,
        user.uid
      );
      
      const accountData = {
        ...account,
        encryptedSecret,
        secret: undefined,
        updatedAt: new Date(),
      };
      
      // Use FirestoreService to update document
      await FirestoreService.updateDocument(
        `users/${user.uid}/accounts`,
        account.id,
        accountData
      );
      
      // Queue sync operation using RealtimeSyncService
      RealtimeSyncService.queueOperation(
        account.id,
        'update',
        `users/${user.uid}/accounts`,
        accountData
      );
      
      dispatch(addToast({
        type: 'success',
        message: 'Account updated successfully',
      }));
      
      // Log account update
      await AuditLogService.log({
        userId: user.uid,
        action: 'account.updated',
        resource: `account/${account.id}`,
        severity: 'info',
        success: true,
        details: {
          issuer: account.issuer,
          label: account.label,
          fieldsUpdated: Object.keys(accountData).filter(key => 
            key !== 'updatedAt' && key !== 'encryptedSecret' && key !== 'secret'
          )
        }
      });
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

  // Delete account using FirestoreService
  const deleteAccount = useCallback(async (accountId: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      dispatch(setLoading(true));
      
      // Use FirestoreService to delete document
      await FirestoreService.deleteDocument(
        `users/${user.uid}/accounts`,
        accountId
      );
      
      // Queue sync operation using RealtimeSyncService
      RealtimeSyncService.queueOperation(
        accountId,
        'delete',
        `users/${user.uid}/accounts`
      );
      
      dispatch(addToast({
        type: 'success',
        message: 'Account deleted successfully',
      }));
      
      // Log account deletion
      await AuditLogService.log({
        userId: user.uid,
        action: 'account.deleted',
        resource: `account/${accountId}`,
        severity: 'warning',
        success: true,
        details: {
          permanentDeletion: true
        }
      });
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
      // Check if it's an enhanced search query
      let searchOptions: any = null;
      let query = accountsState.searchQuery;
      
      try {
        const parsed = JSON.parse(accountsState.searchQuery);
        if (parsed.query && parsed.options) {
          query = parsed.query;
          searchOptions = parsed.options;
        }
      } catch {
        // Not JSON, use as plain query
      }
      
      filtered = filtered.filter(account => {
        // Prepare search text based on options
        const searchTexts: string[] = [];
        
        if (!searchOptions || searchOptions.searchIn.issuer) {
          searchTexts.push(account.issuer);
        }
        if (!searchOptions || searchOptions.searchIn.label) {
          searchTexts.push(account.label);
        }
        if ((!searchOptions || searchOptions.searchIn.tags) && account.tags) {
          // For tags, we need to get the tag names from the tags slice
          const tagNames = account.tags.map(tagId => {
            const tag = store.getState().tags.tags.find(t => t.id === tagId);
            return tag?.name || '';
          }).filter(Boolean);
          searchTexts.push(...tagNames);
        }
        if (searchOptions?.searchIn.notes && account.notes) {
          searchTexts.push(account.notes);
        }
        
        const searchText = searchTexts.join(' ');
        
        // Apply search based on options
        if (searchOptions?.regex) {
          try {
            const regex = new RegExp(query, searchOptions.caseSensitive ? 'g' : 'gi');
            return regex.test(searchText);
          } catch {
            return false;
          }
        } else if (searchOptions?.exactMatch) {
          if (searchOptions.caseSensitive) {
            return searchTexts.some(text => text === query);
          } else {
            const lowerQuery = query.toLowerCase();
            return searchTexts.some(text => text.toLowerCase() === lowerQuery);
          }
        } else {
          // Default contains search
          if (searchOptions?.caseSensitive) {
            return searchText.includes(query);
          } else {
            return searchText.toLowerCase().includes(query.toLowerCase());
          }
        }
      });
    }
    
    // Apply favorites filter
    if (accountsState.showFavoritesOnly) {
      filtered = filtered.filter(account => account.isFavorite);
    }
    
    // Apply folder filter
    if (selectedFolderId !== null) {
      filtered = filtered.filter(account => account.folderId === selectedFolderId);
    }
    
    // Apply tag filter from tags slice
    if (activeTags.length > 0) {
      filtered = filtered.filter(account => {
        if (!account.tags || account.tags.length === 0) return false;
        
        if (filterMode === 'OR') {
          // Account must have at least one of the selected tags
          return account.tags?.some(tag => activeTags.includes(tag)) || false;
        } else {
          // Account must have all selected tags
          return activeTags.every(tag => account.tags?.includes(tag) || false);
        }
      });
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
        case 'favorite':
          // Sort favorites first
          comparison = (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
          // If both are favorites or both are not, sort by name
          if (comparison === 0) {
            comparison = a.label.localeCompare(b.label);
          }
          break;
      }
      
      return accountsState.sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [accountsState, activeTags, filterMode, selectedFolderId]);

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