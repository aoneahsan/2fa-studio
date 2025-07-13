/**
 * Bulk Operations Service
 */

import categoriesService from './categories-service.js';
import tagsService from './tags-service.js';
import backupCodesService from './backup-codes.js';

class BulkOperationsService {
  constructor() {
    this.selectedAccounts = new Set();
    this.operationHistory = [];
    this.maxHistorySize = 10;
  }

  /**
   * Select/deselect account
   */
  toggleAccountSelection(accountId) {
    if (this.selectedAccounts.has(accountId)) {
      this.selectedAccounts.delete(accountId);
    } else {
      this.selectedAccounts.add(accountId);
    }
    
    return {
      selected: this.selectedAccounts.has(accountId),
      totalSelected: this.selectedAccounts.size
    };
  }

  /**
   * Select all accounts
   */
  selectAll(accountIds) {
    accountIds.forEach(id => this.selectedAccounts.add(id));
    return this.selectedAccounts.size;
  }

  /**
   * Deselect all accounts
   */
  deselectAll() {
    this.selectedAccounts.clear();
    return 0;
  }

  /**
   * Get selected account IDs
   */
  getSelectedAccountIds() {
    return Array.from(this.selectedAccounts);
  }

  /**
   * Bulk delete accounts
   */
  async bulkDelete(accountIds = null) {
    const ids = accountIds || this.getSelectedAccountIds();
    
    if (ids.length === 0) {
      throw new Error('No accounts selected');
    }
    
    try {
      const storage = await chrome.storage.local.get(['accounts']);
      const accounts = storage.accounts || [];
      
      // Store deleted accounts for undo
      const deletedAccounts = accounts.filter(acc => ids.includes(acc.id));
      
      // Filter out deleted accounts
      const remainingAccounts = accounts.filter(acc => !ids.includes(acc.id));
      
      await chrome.storage.local.set({ accounts: remainingAccounts });
      
      // Clear selection
      this.deselectAll();
      
      // Add to history
      this.addToHistory({
        type: 'delete',
        accounts: deletedAccounts,
        timestamp: Date.now()
      });
      
      return {
        deleted: ids.length,
        remaining: remainingAccounts.length
      };
    } catch (error) {
      console.error('Bulk delete failed:', error);
      throw error;
    }
  }

  /**
   * Bulk assign category
   */
  async bulkAssignCategory(categoryId, accountIds = null) {
    const ids = accountIds || this.getSelectedAccountIds();
    
    if (ids.length === 0) {
      throw new Error('No accounts selected');
    }
    
    try {
      const storage = await chrome.storage.local.get(['accounts']);
      const accounts = storage.accounts || [];
      
      let updated = 0;
      const previousStates = [];
      
      accounts.forEach(account => {
        if (ids.includes(account.id)) {
          previousStates.push({
            id: account.id,
            category: account.category
          });
          
          account.category = categoryId;
          account.updatedAt = Date.now();
          updated++;
        }
      });
      
      await chrome.storage.local.set({ accounts });
      
      // Add to history
      this.addToHistory({
        type: 'category',
        categoryId,
        previousStates,
        timestamp: Date.now()
      });
      
      return { updated };
    } catch (error) {
      console.error('Bulk category assignment failed:', error);
      throw error;
    }
  }

  /**
   * Bulk add tags
   */
  async bulkAddTags(tags, accountIds = null) {
    const ids = accountIds || this.getSelectedAccountIds();
    
    if (ids.length === 0) {
      throw new Error('No accounts selected');
    }
    
    if (!tags || tags.length === 0) {
      throw new Error('No tags specified');
    }
    
    try {
      let updated = 0;
      
      for (const accountId of ids) {
        await tagsService.addTagsToAccount(accountId, tags);
        updated++;
      }
      
      return { updated };
    } catch (error) {
      console.error('Bulk tag addition failed:', error);
      throw error;
    }
  }

  /**
   * Bulk remove tags
   */
  async bulkRemoveTags(tags, accountIds = null) {
    const ids = accountIds || this.getSelectedAccountIds();
    
    if (ids.length === 0) {
      throw new Error('No accounts selected');
    }
    
    try {
      const storage = await chrome.storage.local.get(['accounts']);
      const accounts = storage.accounts || [];
      
      let updated = 0;
      
      accounts.forEach(account => {
        if (ids.includes(account.id) && account.tags) {
          const originalLength = account.tags.length;
          account.tags = account.tags.filter(tag => !tags.includes(tag));
          
          if (account.tags.length !== originalLength) {
            account.updatedAt = Date.now();
            updated++;
          }
        }
      });
      
      await chrome.storage.local.set({ accounts });
      
      return { updated };
    } catch (error) {
      console.error('Bulk tag removal failed:', error);
      throw error;
    }
  }

  /**
   * Bulk toggle favorite
   */
  async bulkToggleFavorite(makeFavorite, accountIds = null) {
    const ids = accountIds || this.getSelectedAccountIds();
    
    if (ids.length === 0) {
      throw new Error('No accounts selected');
    }
    
    try {
      const storage = await chrome.storage.local.get(['accounts']);
      const accounts = storage.accounts || [];
      
      let updated = 0;
      
      accounts.forEach(account => {
        if (ids.includes(account.id)) {
          account.isFavorite = makeFavorite;
          account.updatedAt = Date.now();
          updated++;
        }
      });
      
      await chrome.storage.local.set({ accounts });
      
      return { updated };
    } catch (error) {
      console.error('Bulk favorite toggle failed:', error);
      throw error;
    }
  }

  /**
   * Bulk generate backup codes
   */
  async bulkGenerateBackupCodes(accountIds = null) {
    const ids = accountIds || this.getSelectedAccountIds();
    
    if (ids.length === 0) {
      throw new Error('No accounts selected');
    }
    
    try {
      let generated = 0;
      
      for (const accountId of ids) {
        const codes = backupCodesService.generateBackupCodes();
        await backupCodesService.storeBackupCodes(accountId, codes);
        generated++;
      }
      
      return { generated };
    } catch (error) {
      console.error('Bulk backup code generation failed:', error);
      throw error;
    }
  }

  /**
   * Bulk export accounts
   */
  async bulkExport(format = 'json', accountIds = null) {
    const ids = accountIds || this.getSelectedAccountIds();
    
    if (ids.length === 0) {
      throw new Error('No accounts selected');
    }
    
    try {
      const storage = await chrome.storage.local.get(['accounts']);
      const accounts = storage.accounts || [];
      
      const selectedAccounts = accounts.filter(acc => ids.includes(acc.id));
      
      switch (format) {
        case 'json':
          return this.exportAsJSON(selectedAccounts);
        case 'csv':
          return this.exportAsCSV(selectedAccounts);
        case 'qr':
          return this.exportAsQR(selectedAccounts);
        default:
          throw new Error('Unknown export format');
      }
    } catch (error) {
      console.error('Bulk export failed:', error);
      throw error;
    }
  }

  /**
   * Export as JSON
   */
  exportAsJSON(accounts) {
    const exportData = {
      version: 1,
      exported: new Date().toISOString(),
      accounts: accounts.map(acc => ({
        issuer: acc.issuer,
        accountName: acc.accountName,
        type: acc.type,
        secret: acc.secret,
        algorithm: acc.algorithm,
        digits: acc.digits,
        period: acc.period,
        counter: acc.counter,
        category: acc.category,
        tags: acc.tags,
        isFavorite: acc.isFavorite
      }))
    };
    
    return {
      type: 'json',
      data: JSON.stringify(exportData, null, 2),
      filename: `2fa-accounts-${Date.now()}.json`
    };
  }

  /**
   * Export as CSV
   */
  exportAsCSV(accounts) {
    const headers = [
      'Issuer',
      'Account',
      'Type',
      'Secret',
      'Algorithm',
      'Digits',
      'Period',
      'Category',
      'Tags',
      'Favorite'
    ];
    
    const rows = accounts.map(acc => [
      acc.issuer,
      acc.accountName,
      acc.type,
      acc.secret,
      acc.algorithm || 'SHA1',
      acc.digits || 6,
      acc.period || 30,
      acc.category || '',
      (acc.tags || []).join(';'),
      acc.isFavorite ? 'Yes' : 'No'
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    return {
      type: 'csv',
      data: csv,
      filename: `2fa-accounts-${Date.now()}.csv`
    };
  }

  /**
   * Export as QR codes
   */
  async exportAsQR(accounts) {
    // This would generate a PDF or HTML with QR codes
    // For now, return otpauth URIs
    const uris = accounts.map(acc => {
      const params = new URLSearchParams({
        secret: acc.secret,
        issuer: acc.issuer,
        algorithm: acc.algorithm || 'SHA1',
        digits: acc.digits || 6
      });
      
      if (acc.type === 'totp') {
        params.append('period', acc.period || 30);
      } else {
        params.append('counter', acc.counter || 0);
      }
      
      const label = `${acc.issuer}:${acc.accountName}`;
      return `otpauth://${acc.type}/${encodeURIComponent(label)}?${params}`;
    });
    
    return {
      type: 'qr',
      data: uris,
      filename: `2fa-qrcodes-${Date.now()}.txt`
    };
  }

  /**
   * Undo last operation
   */
  async undoLastOperation() {
    if (this.operationHistory.length === 0) {
      throw new Error('No operations to undo');
    }
    
    const lastOperation = this.operationHistory.pop();
    
    switch (lastOperation.type) {
      case 'delete':
        return this.undoDelete(lastOperation);
      case 'category':
        return this.undoCategory(lastOperation);
      default:
        throw new Error('Cannot undo this operation');
    }
  }

  /**
   * Undo delete operation
   */
  async undoDelete(operation) {
    try {
      const storage = await chrome.storage.local.get(['accounts']);
      const accounts = storage.accounts || [];
      
      // Restore deleted accounts
      const restoredAccounts = [...accounts, ...operation.accounts];
      
      await chrome.storage.local.set({ accounts: restoredAccounts });
      
      return {
        restored: operation.accounts.length,
        total: restoredAccounts.length
      };
    } catch (error) {
      console.error('Undo delete failed:', error);
      throw error;
    }
  }

  /**
   * Undo category operation
   */
  async undoCategory(operation) {
    try {
      const storage = await chrome.storage.local.get(['accounts']);
      const accounts = storage.accounts || [];
      
      let restored = 0;
      
      accounts.forEach(account => {
        const previousState = operation.previousStates.find(
          state => state.id === account.id
        );
        
        if (previousState) {
          account.category = previousState.category;
          account.updatedAt = Date.now();
          restored++;
        }
      });
      
      await chrome.storage.local.set({ accounts });
      
      return { restored };
    } catch (error) {
      console.error('Undo category failed:', error);
      throw error;
    }
  }

  /**
   * Add operation to history
   */
  addToHistory(operation) {
    this.operationHistory.push(operation);
    
    // Limit history size
    if (this.operationHistory.length > this.maxHistorySize) {
      this.operationHistory.shift();
    }
  }

  /**
   * Clear operation history
   */
  clearHistory() {
    this.operationHistory = [];
  }
}

export default new BulkOperationsService();