/**
 * Chrome Extension Background Service Worker
 * @module background/service-worker
 */

import { StorageService } from '../src/storage.js';
import { MessageService } from '../src/message.js';
import { NotificationService } from '../src/notification.js';

class BackgroundService {
  constructor() {
    this.init();
  }

  init() {
    // Set up message listeners
    this.setupMessageListeners();
    
    // Set up context menu
    this.setupContextMenu();
    
    // Set up alarms for notifications
    this.setupAlarms();
    
    // Initialize on install
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstall(details);
    });
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'getAccounts':
          this.handleGetAccounts(sendResponse);
          return true; // Will respond asynchronously

        case 'saveAccount':
          this.handleSaveAccount(request.data, sendResponse);
          return true;

        case 'deleteAccount':
          this.handleDeleteAccount(request.id, sendResponse);
          return true;

        case 'generateCode':
          this.handleGenerateCode(request.account, sendResponse);
          return true;

        case 'checkUrl':
          this.handleCheckUrl(sender.tab, sendResponse);
          return true;

        case 'openApp':
          this.handleOpenApp();
          break;

        default:
          sendResponse({ error: 'Unknown action' });
      }
    });
  }

  async handleGetAccounts(sendResponse) {
    try {
      const accounts = await StorageService.getAccounts();
      sendResponse({ success: true, data: accounts });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleSaveAccount(accountData, sendResponse) {
    try {
      await StorageService.saveAccount(accountData);
      sendResponse({ success: true });
      
      // Notify popup to refresh
      chrome.runtime.sendMessage({ action: 'accountsUpdated' });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleDeleteAccount(accountId, sendResponse) {
    try {
      await StorageService.deleteAccount(accountId);
      sendResponse({ success: true });
      
      // Notify popup to refresh
      chrome.runtime.sendMessage({ action: 'accountsUpdated' });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  handleGenerateCode(account, sendResponse) {
    try {
      const code = OTPService.generateCode(account);
      sendResponse({ success: true, data: code });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleCheckUrl(tab, sendResponse) {
    try {
      const accounts = await StorageService.getAccounts();
      const url = new URL(tab.url);
      const domain = url.hostname;
      
      // Find matching accounts for this domain
      const matches = accounts.filter(account => {
        const issuerLower = account.issuer.toLowerCase();
        const domainParts = domain.split('.');
        
        return domainParts.some(part => 
          issuerLower.includes(part) || part.includes(issuerLower)
        );
      });
      
      sendResponse({ success: true, matches });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  handleOpenApp() {
    chrome.tabs.create({ 
      url: chrome.runtime.getURL('../index.html') 
    });
  }

  setupContextMenu() {
    chrome.contextMenus.create({
      id: 'fill-2fa-code',
      title: 'Fill 2FA Code',
      contexts: ['editable'],
      documentUrlPatterns: ['https://*/*', 'http://*/*']
    });

    chrome.contextMenus.create({
      id: 'open-2fa-studio',
      title: 'Open 2FA Studio',
      contexts: ['all']
    });

    chrome.contextMenus.onClicked.addListener((info, tab) => {
      switch (info.menuItemId) {
        case 'fill-2fa-code':
          this.handleFillCode(tab);
          break;
        case 'open-2fa-studio':
          this.handleOpenApp();
          break;
      }
    });
  }

  async handleFillCode(tab) {
    try {
      // Get accounts
      const accounts = await StorageService.getAccounts();
      
      // Check if we have accounts for this domain
      const url = new URL(tab.url);
      const domain = url.hostname;
      
      const matches = accounts.filter(account => {
        const issuerLower = account.issuer.toLowerCase();
        return domain.includes(issuerLower) || issuerLower.includes(domain.split('.')[0]);
      });

      if (matches.length === 0) {
        // Show popup to select account
        chrome.action.openPopup();
      } else if (matches.length === 1) {
        // Auto-fill the single match
        const code = OTPService.generateCode(matches[0]);
        chrome.tabs.sendMessage(tab.id, {
          action: 'fillCode',
          code: code.code
        });
      } else {
        // Show popup to select from matches
        chrome.action.openPopup();
      }
    } catch (error) {
      console.error('Failed to fill code:', error);
    }
  }

  setupAlarms() {
    // Set up periodic sync alarm
    chrome.alarms.create('sync-accounts', {
      periodInMinutes: 30
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
      switch (alarm.name) {
        case 'sync-accounts':
          this.syncAccounts();
          break;
      }
    });
  }

  async syncAccounts() {
    try {
      // Sync with main app if connected
      const settings = await StorageService.getSettings();
      if (settings.syncEnabled) {
        // Implement sync logic here
        console.log('Syncing accounts...');
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  async handleInstall(details) {
    if (details.reason === 'install') {
      // Set default settings
      await StorageService.setSettings({
        autoFill: true,
        notifications: true,
        syncEnabled: false,
        theme: 'system'
      });

      // Open welcome page
      chrome.tabs.create({
        url: chrome.runtime.getURL('../index.html#/welcome')
      });
    } else if (details.reason === 'update') {
      // Handle extension update
      const previousVersion = details.previousVersion;
      console.log(`Updated from version ${previousVersion}`);
    }
  }

  // Badge management
  async updateBadge() {
    try {
      const accounts = await StorageService.getAccounts();
      const count = accounts.length;
      
      if (count > 0) {
        chrome.action.setBadgeText({ text: count.toString() });
        chrome.action.setBadgeBackgroundColor({ color: '#0066cc' });
      } else {
        chrome.action.setBadgeText({ text: '' });
      }
    } catch (error) {
      console.error('Failed to update badge:', error);
    }
  }
}

// Initialize background service
new BackgroundService();