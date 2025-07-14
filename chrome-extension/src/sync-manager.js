/**
 * Browser Sync Manager
 * Handles syncing extension settings across browsers using Chrome sync storage
 * @module sync-manager
 */

class SyncManager {
  constructor() {
    // Settings that should be synced
    this.syncableSettings = [
      'autoFillEnabled',
      'keyboardShortcuts',
      'phishingProtection',
      'domainWhitelist',
      'theme',
      'defaultTimeout',
      'showNotifications',
      'quickFillEnabled',
      'passwordManagerSettings',
      'extensionPinEnabled',
      'autoLockTimeout'
    ];
    
    // Sync state
    this.syncEnabled = false;
    this.lastSyncTime = null;
    this.syncInProgress = false;
    this.conflictResolutionStrategy = 'latest'; // 'latest', 'local', 'remote'
    
    this.init();
  }

  async init() {
    // Check if sync is available and enabled
    if (chrome.storage.sync) {
      const syncStatus = await this.getSyncStatus();
      this.syncEnabled = syncStatus.enabled;
      
      if (this.syncEnabled) {
        // Set up sync listeners
        this.setupSyncListeners();
        
        // Perform initial sync
        await this.performInitialSync();
      }
    }
  }

  setupSyncListeners() {
    // Listen for changes in sync storage
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && !this.syncInProgress) {
        this.handleRemoteChanges(changes);
      }
    });

    // Listen for local storage changes to sync them
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && this.syncEnabled && !this.syncInProgress) {
        this.handleLocalChanges(changes);
      }
    });
  }

  async getSyncStatus() {
    try {
      const result = await chrome.storage.sync.get(['syncEnabled', 'lastSyncTime']);
      return {
        enabled: result.syncEnabled !== false, // Default to true
        lastSyncTime: result.lastSyncTime || null
      };
    } catch (_error) {
      console.error('Failed to get sync status:', _error);
      return { enabled: false, lastSyncTime: null };
    }
  }

  async enableSync() {
    try {
      this.syncEnabled = true;
      await chrome.storage.sync.set({ 
        syncEnabled: true,
        lastSyncTime: Date.now()
      });
      
      // Set up listeners if not already done
      this.setupSyncListeners();
      
      // Perform initial sync
      await this.performInitialSync();
      
      return { success: true };
    } catch (_error) {
      console.error('Failed to enable sync:', _error);
      return { success: false, error: _error.message };
    }
  }

  async disableSync() {
    try {
      this.syncEnabled = false;
      await chrome.storage.sync.set({ syncEnabled: false });
      
      // Optionally clear sync data
      // await this.clearSyncData();
      
      return { success: true };
    } catch (_error) {
      console.error('Failed to disable sync:', _error);
      return { success: false, error: _error.message };
    }
  }

  async performInitialSync() {
    if (this.syncInProgress) return;
    
    this.syncInProgress = true;
    try {
      // Get both local and sync data
      const localData = await chrome.storage.local.get(this.syncableSettings);
      const syncData = await chrome.storage.sync.get(this.syncableSettings);
      
      // Get metadata
      const localMeta = await chrome.storage.local.get(['settingsLastModified']);
      const syncMeta = await chrome.storage.sync.get(['settingsLastModified']);
      
      // Determine which data is newer
      const localTime = localMeta.settingsLastModified || 0;
      const syncTime = syncMeta.settingsLastModified || 0;
      
      if (localTime > syncTime) {
        // Local is newer, push to sync
        await this.pushToSync(localData);
      } else if (syncTime > localTime) {
        // Sync is newer, pull from sync
        await this.pullFromSync(syncData);
      } else if (Object.keys(syncData).length > 0) {
        // Same time but sync has data, use conflict resolution
        await this.resolveConflicts(localData, syncData);
      } else {
        // No sync data, push local
        await this.pushToSync(localData);
      }
      
      this.lastSyncTime = Date.now();
      await chrome.storage.sync.set({ lastSyncTime: this.lastSyncTime });
    } catch (_error) {
      console.error('Initial sync failed:', _error);
    } finally {
      this.syncInProgress = false;
    }
  }

  async pushToSync(data) {
    try {
      // Filter out undefined values
      const filteredData = {};
      for (const key of Object.keys(data)) {
        if (data[key] !== undefined) {
          filteredData[key] = data[key];
        }
      }
      
      // Add metadata
      filteredData.settingsLastModified = Date.now();
      
      // Check storage quota
      const quotaCheck = await this.checkSyncQuota(filteredData);
      if (!quotaCheck.canStore) {
        throw new Error(`Sync storage quota exceeded. Used: ${quotaCheck.used}, Limit: ${quotaCheck.limit}`);
      }
      
      // Push to sync storage
      await chrome.storage.sync.set(filteredData);
      
      console.log('Settings pushed to sync storage');
    } catch (_error) {
      console.error('Failed to push to sync:', _error);
      throw _error;
    }
  }

  async pullFromSync(data) {
    try {
      // Filter sync data to only include valid settings
      const filteredData = {};
      for (const key of this.syncableSettings) {
        if (data[key] !== undefined) {
          filteredData[key] = data[key];
        }
      }
      
      // Add metadata
      filteredData.settingsLastModified = Date.now();
      
      // Save to local storage
      await chrome.storage.local.set(filteredData);
      
      console.log('Settings pulled from sync storage');
    } catch (_error) {
      console.error('Failed to pull from sync:', _error);
      throw _error;
    }
  }

  async handleLocalChanges(changes) {
    // Check if any syncable settings changed
    const changedSyncableSettings = {};
    let hasChanges = false;
    
    for (const key of Object.keys(changes)) {
      if (this.syncableSettings.includes(key)) {
        changedSyncableSettings[key] = changes[key].newValue;
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      // Debounce sync to avoid too frequent updates
      if (this.syncDebounceTimer) {
        clearTimeout(this.syncDebounceTimer);
      }
      
      this.syncDebounceTimer = setTimeout(async () => {
        await this.pushToSync(changedSyncableSettings);
      }, 1000); // Wait 1 second before syncing
    }
  }

  async handleRemoteChanges(changes) {
    // Check if any syncable settings changed
    const changedSettings = {};
    let hasChanges = false;
    
    for (const key of Object.keys(changes)) {
      if (this.syncableSettings.includes(key)) {
        changedSettings[key] = changes[key].newValue;
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      this.syncInProgress = true;
      try {
        // Apply remote changes to local storage
        await chrome.storage.local.set(changedSettings);
        
        // Notify UI about sync updates
        chrome.runtime.sendMessage({
          action: 'settingsSynced',
          settings: changedSettings
        });
      } finally {
        this.syncInProgress = false;
      }
    }
  }

  async resolveConflicts(localData, syncData) {
    let _dataToUse;
    
    switch (this.conflictResolutionStrategy) {
      case 'local':
        _dataToUse = localData;
        await this.pushToSync(localData);
        break;
        
      case 'remote':
        _dataToUse = syncData;
        await this.pullFromSync(syncData);
        break;
        
      case 'latest':
      default:
        // Already handled in performInitialSync
        break;
    }
  }

  async checkSyncQuota(data) {
    try {
      // Chrome sync storage limits:
      // - QUOTA_BYTES: 102,400 bytes total
      // - QUOTA_BYTES_PER_ITEM: 8,192 bytes per item
      // - MAX_ITEMS: 512 items
      
      const dataSize = new Blob([JSON.stringify(data)]).size;
      const quota = chrome.storage.sync.QUOTA_BYTES || 102400;
      const usedBytes = await this.getSyncStorageUsed();
      
      return {
        canStore: (usedBytes + dataSize) < quota,
        used: usedBytes,
        toStore: dataSize,
        limit: quota
      };
    } catch (_error) {
      console.error('Failed to check sync quota:', _error);
      return { canStore: true, used: 0, limit: 102400 };
    }
  }

  async getSyncStorageUsed() {
    try {
      const allData = await chrome.storage.sync.get(null);
      return new Blob([JSON.stringify(allData)]).size;
    } catch (_error) {
      return 0;
    }
  }

  async clearSyncData() {
    try {
      await chrome.storage.sync.clear();
      console.log('Sync storage cleared');
    } catch (_error) {
      console.error('Failed to clear sync storage:', _error);
    }
  }

  async exportSyncData() {
    try {
      const syncData = await chrome.storage.sync.get(null);
      return {
        success: true,
        data: syncData,
        exportTime: Date.now()
      };
    } catch (_error) {
      console.error('Failed to export sync data:', _error);
      return { success: false, error: _error.message };
    }
  }

  async importSyncData(data) {
    try {
      // Validate data
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid sync data format');
      }
      
      // Filter to only include syncable settings
      const filteredData = {};
      for (const key of this.syncableSettings) {
        if (data[key] !== undefined) {
          filteredData[key] = data[key];
        }
      }
      
      // Import to both local and sync storage
      await chrome.storage.local.set(filteredData);
      await chrome.storage.sync.set(filteredData);
      
      return { success: true };
    } catch (_error) {
      console.error('Failed to import sync data:', _error);
      return { success: false, error: _error.message };
    }
  }

  setConflictResolutionStrategy(strategy) {
    if (['latest', 'local', 'remote'].includes(strategy)) {
      this.conflictResolutionStrategy = strategy;
    }
  }
}

export default new SyncManager();