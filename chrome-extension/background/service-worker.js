/**
 * Chrome Extension Background Service Worker
 * @module background/service-worker
 */

import { StorageService } from '../src/storage.js';
import { MessageService } from '../src/message.js';
import { NotificationService } from '../src/notification.js';
import { OTPService } from '../src/otp.js';
import { QRScanner } from '../src/qr-scanner-lib.js';

class BackgroundService {
  constructor() {
    this.init();
    this.qrCodeCache = new Map();
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

    // Set up command listeners
    chrome.commands.onCommand.addListener((command) => {
      this.handleCommand(command);
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

        case 'scanQRCode':
          this.handleScanQRCode(request.imageData, sendResponse);
          return true;

        case 'addOTPFromURL':
          this.handleAddOTPFromURL(request.url, sendResponse);
          return true;

        case 'requestCode':
          this.handleRequestCode(request.pageInfo, sendResponse);
          return true;

        case 'openPopup':
          chrome.action.openPopup();
          break;

        case 'qrCodesDetected':
          this.handleQRCodesDetected(request.count, sender.tab);
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

  async handleScanQRCode(imageData, sendResponse) {
    try {
      // Convert array back to Uint8Array
      const data = new Uint8Array(imageData.data);
      
      // Create ImageData object
      const imgData = new ImageData(
        new Uint8ClampedArray(data),
        imageData.width,
        imageData.height
      );

      // Use QR scanner
      const result = await QRScanner.scanImage(imgData);
      sendResponse({ success: true, data: result.data });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleAddOTPFromURL(url, sendResponse) {
    try {
      // Parse OTP URL
      const otpData = this.parseOTPAuthURL(url);
      if (!otpData) {
        throw new Error('Invalid OTP URL');
      }

      // Save account
      await StorageService.saveAccount(otpData);
      
      // Update badge
      this.updateBadge();
      
      // Show notification
      NotificationService.show({
        title: 'Account Added',
        message: `${otpData.issuer} has been added to 2FA Studio`,
        iconUrl: chrome.runtime.getURL('assets/icon-128.png')
      });

      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  parseOTPAuthURL(url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'otpauth:') return null;

      const type = parsed.host; // 'totp' or 'hotp'
      const label = decodeURIComponent(parsed.pathname.slice(1));
      const params = new URLSearchParams(parsed.search);

      const [accountName, issuer] = label.includes(':') 
        ? label.split(':', 2) 
        : ['', label];

      return {
        type: type.toUpperCase(),
        issuer: params.get('issuer') || issuer || accountName,
        accountName: accountName || params.get('issuer') || issuer,
        secret: params.get('secret'),
        algorithm: params.get('algorithm') || 'SHA1',
        digits: parseInt(params.get('digits') || '6'),
        period: parseInt(params.get('period') || '30'),
        counter: parseInt(params.get('counter') || '0')
      };
    } catch (error) {
      console.error('Failed to parse OTP URL:', error);
      return null;
    }
  }

  async handleRequestCode(pageInfo, sendResponse) {
    try {
      const accounts = await StorageService.getAccounts();
      const domain = pageInfo.domain;
      
      // Find matching accounts
      const matches = accounts.filter(account => {
        const issuerLower = account.issuer.toLowerCase();
        const domainLower = domain.toLowerCase();
        const domainParts = domainLower.split('.');
        
        return domainParts.some(part => 
          issuerLower.includes(part) || part.includes(issuerLower)
        );
      });

      if (matches.length === 1) {
        // Auto-return code for single match
        const code = OTPService.generateCode(matches[0]);
        sendResponse({ success: true, code: code.code });
      } else {
        // Multiple or no matches - need user selection
        sendResponse({ success: false, needsSelection: true });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  handleQRCodesDetected(count, tab) {
    // Update badge to show QR codes detected
    chrome.action.setBadgeText({ 
      text: `QR`, 
      tabId: tab.id 
    });
    chrome.action.setBadgeBackgroundColor({ 
      color: '#28a745',
      tabId: tab.id 
    });

    // Clear badge after 5 seconds
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '', tabId: tab.id });
    }, 5000);
  }

  setupContextMenu() {
    chrome.contextMenus.create({
      id: 'fill-2fa-code',
      title: 'Fill 2FA Code',
      contexts: ['editable'],
      documentUrlPatterns: ['https://*/*', 'http://*/*']
    });

    chrome.contextMenus.create({
      id: 'scan-qr-code',
      title: 'Scan QR Code on Page',
      contexts: ['page', 'image'],
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
        case 'scan-qr-code':
          this.handleScanQRMenuItem(tab);
          break;
        case 'open-2fa-studio':
          this.handleOpenApp();
          break;
      }
    });
  }

  async handleScanQRMenuItem(tab) {
    // Send message to content script to enable QR selection mode
    chrome.tabs.sendMessage(tab.id, {
      action: 'enableQRSelection'
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

  // Handle keyboard commands
  async handleCommand(command) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      switch (command) {
        case 'fill-code':
          this.handleFillCode(tab);
          break;
          
        case 'scan-qr':
          chrome.tabs.sendMessage(tab.id, {
            action: 'enableQRSelection'
          });
          break;
      }
    } catch (error) {
      console.error('Failed to handle command:', error);
    }
  }
}

// Initialize background service
new BackgroundService();