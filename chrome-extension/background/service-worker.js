/**
 * Chrome Extension Background Service Worker
 * @module background/service-worker
 */

import { StorageService } from '../src/storage.js';
import { MessageService } from '../src/message.js';
import { NotificationService } from '../src/notification.js';
import { OTPService } from '../src/otp.js';
import { QRScanner } from '../src/qr-scanner-lib.js';
import { SecurityService } from '../src/security.js';
import { KeyboardShortcutsService } from '../src/keyboard-shortcuts.js';
import { PasswordManagerService } from '../src/password-manager.js';
import SyncManager from '../src/sync-manager.js';
import { ExtensionLockService } from '../src/extension-lock.js';
import { BadgeManager } from '../src/badge-manager.js';
import { MobileConnector } from '../src/mobile-connector.js';

class BackgroundService {
  constructor() {
    this.init();
    this.qrCodeCache = new Map();
    this.securityService = new SecurityService();
    this.keyboardShortcuts = new KeyboardShortcutsService();
    this.passwordManager = new PasswordManagerService();
    this.extensionLock = new ExtensionLockService();
    this.badgeManager = new BadgeManager();
    this.mobileConnector = new MobileConnector();
  }

  init() {
    // Set up message listeners
    this.setupMessageListeners();
    
    // Set up context menu
    this.setupContextMenu();
    
    // Set up alarms for notifications
    this.setupAlarms();
    
    // Initialize security monitoring
    this.monitorTabSecurity();
    
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

        case 'checkSecurity':
          this.handleSecurityCheck(request.url, sendResponse);
          return true;

        case 'reportPhishing':
          this.handlePhishingReport(request.domain, request.reason, sendResponse);
          return true;

        case 'handleShortcut':
          this.handleShortcutCommand(request.command, request.shortcut, sendResponse);
          return true;

        case 'getShortcuts':
          this.handleGetShortcuts(sendResponse);
          return true;

        case 'setCustomShortcut':
          this.handleSetCustomShortcut(request.command, request.shortcut, sendResponse);
          return true;

        case 'resetShortcut':
          this.handleResetShortcut(request.command, sendResponse);
          return true;

        case 'resetAllShortcuts':
          this.handleResetAllShortcuts(sendResponse);
          return true;

        // Password Manager actions
        case 'unlockPasswordManager':
          this.handleUnlockPasswordManager(request.masterPassword, sendResponse);
          return true;

        case 'lockPasswordManager':
          this.handleLockPasswordManager(sendResponse);
          return true;

        case 'isPasswordManagerUnlocked':
          this.handleIsPasswordManagerUnlocked(sendResponse);
          return true;

        case 'savePassword':
          this.handleSavePassword(request.passwordData, sendResponse);
          return true;

        case 'deletePassword':
          this.handleDeletePassword(request.id, sendResponse);
          return true;

        case 'getPasswordsForDomain':
          this.handleGetPasswordsForDomain(request.domain, sendResponse);
          return true;

        case 'getPassword':
          this.handleGetPassword(request.id, sendResponse);
          return true;

        case 'fillLoginForm':
          this.handleFillLoginForm(request.passwordId, sender.tab, sendResponse);
          return true;

        case 'detectLoginForm':
          this.handleDetectLoginForm(sender.tab, sendResponse);
          return true;

        case 'fillBothCredentials':
          this.handleFillBothCredentials(request.passwordId, request.accountId, sender.tab, sendResponse);
          return true;

        // Extension Lock actions
        case 'setExtensionPin':
          this.handleSetExtensionPin(request.pin, sendResponse);
          return true;

        case 'verifyExtensionPin':
          this.handleVerifyExtensionPin(request.pin, sendResponse);
          return true;

        case 'removeExtensionPin':
          this.handleRemoveExtensionPin(sendResponse);
          return true;

        case 'lockExtension':
          this.handleLockExtension(sendResponse);
          return true;

        case 'isExtensionLocked':
          this.handleIsExtensionLocked(sendResponse);
          return true;

        case 'setAutoLockTimeout':
          this.handleSetAutoLockTimeout(request.minutes, sendResponse);
          return true;

        // Browser Sync actions
        case 'enableSync':
          this.handleEnableSync(sendResponse);
          return true;

        case 'disableSync':
          this.handleDisableSync(sendResponse);
          return true;

        case 'getSyncStatus':
          this.handleGetSyncStatus(sendResponse);
          return true;

        case 'exportSyncData':
          this.handleExportSyncData(sendResponse);
          return true;

        case 'importSyncData':
          this.handleImportSyncData(request.data, sendResponse);
          return true;

        // Mobile Connector actions
        case 'pairWithMobile':
          this.handlePairWithMobile(request.pairingCode, sendResponse);
          return true;

        case 'unpairMobile':
          this.handleUnpairMobile(sendResponse);
          return true;

        case 'getMobileStatus':
          this.handleGetMobileStatus(sendResponse);
          return true;

        case 'sendToMobile':
          this.handleSendToMobile(request.message, sendResponse);
          return true;

        // Badge Manager actions
        case 'updateBadge':
          this.handleUpdateBadge(sendResponse);
          return true;

        case 'clearBadge':
          this.handleClearBadge(sendResponse);
          return true;

        case 'showNotification':
          this.handleShowNotification(request.type, request.message, sendResponse);
          return true;

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

  async handleGenerateCode(account, sendResponse) {
    try {
      const code = await OTPService.generateCode(account);
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

      // Check if this is a Steam account
      const isSteam = params.get('steam') === 'true' || 
                     (params.get('issuer') || issuer || '').toLowerCase().includes('steam');
      
      return {
        type: isSteam ? 'steam' : type.toUpperCase(),
        issuer: params.get('issuer') || issuer || accountName,
        accountName: accountName || params.get('issuer') || issuer,
        secret: params.get('secret'),
        algorithm: params.get('algorithm') || 'SHA1',
        digits: isSteam ? 5 : parseInt(params.get('digits') || '6'),
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
      // Security check first
      const securityCheck = await this.securityService.validateURL(pageInfo.url);
      if (!securityCheck.valid) {
        sendResponse({ 
          success: false, 
          securityWarning: true,
          reason: securityCheck.reason,
          severity: securityCheck.severity
        });
        return;
      }

      const accounts = await StorageService.getAccounts();
      const domain = pageInfo.domain;
      
      // Find matching accounts with improved logic
      const matches = this.findDomainMatches(accounts, domain);

      if (matches.length === 1) {
        // Auto-return code for single match
        const code = await OTPService.generateCode(matches[0]);
        sendResponse({ 
          success: true, 
          code: code.code,
          securityWarnings: securityCheck.warnings
        });
        
        // Update badge to show successful match
        this.updateBadgeForMatch(matches[0]);
      } else if (matches.length > 1) {
        // Multiple matches - return them for user selection
        sendResponse({ 
          success: false, 
          needsSelection: true, 
          matches: matches.map(account => ({
            id: account.id,
            issuer: account.issuer,
            accountName: account.accountName
          })),
          securityWarnings: securityCheck.warnings
        });
      } else {
        // No matches - need user selection
        sendResponse({ 
          success: false, 
          needsSelection: true,
          securityWarnings: securityCheck.warnings
        });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  findDomainMatches(accounts, domain) {
    if (!domain || !accounts.length) {
      return [];
    }

    return accounts.filter(account => {
      const issuerLower = account.issuer.toLowerCase();
      const domainLower = domain.toLowerCase();
      const domainParts = domainLower.split('.');
      
      // Check for exact matches or partial matches
      return (
        // Direct match
        issuerLower.includes(domainLower) ||
        domainLower.includes(issuerLower) ||
        // Check against domain parts
        domainParts.some(part => 
          part.length > 2 && (
            issuerLower.includes(part) || 
            part.includes(issuerLower.replace(/\s+/g, ''))
          )
        ) ||
        // Check for common service mappings
        this.checkServiceMapping(issuerLower, domainLower)
      );
    });
  }

  checkServiceMapping(issuer, domain) {
    const mappings = {
      'google': ['gmail.com', 'google.com', 'accounts.google.com', 'youtube.com'],
      'microsoft': ['outlook.com', 'live.com', 'hotmail.com', 'microsoft.com', 'office.com'],
      'github': ['github.com'],
      'amazon': ['amazon.com', 'aws.amazon.com'],
      'facebook': ['facebook.com', 'fb.com', 'instagram.com'],
      'twitter': ['twitter.com', 'x.com'],
      'discord': ['discord.com', 'discordapp.com'],
      'slack': ['slack.com'],
      'netflix': ['netflix.com'],
      'dropbox': ['dropbox.com'],
      'apple': ['apple.com', 'icloud.com'],
      'linkedin': ['linkedin.com'],
      'reddit': ['reddit.com'],
      'steam': ['steampowered.com', 'steamcommunity.com']
    };

    for (const [service, domains] of Object.entries(mappings)) {
      if (issuer.includes(service)) {
        return domains.some(d => domain.includes(d));
      }
      if (domains.some(d => domain.includes(d))) {
        return issuer.includes(service);
      }
    }

    return false;
  }

  updateBadgeForMatch(account) {
    // Show a green badge when a match is found
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#28a745' });
    
    // Clear badge after 3 seconds
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 3000);
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
    // Main context menu
    chrome.contextMenus.create({
      id: 'tfa-studio-main',
      title: '2FA Studio',
      contexts: ['all']
    });

    // Sub-menu items
    chrome.contextMenus.create({
      id: 'fill-2fa-code',
      parentId: 'tfa-studio-main',
      title: 'Fill 2FA Code',
      contexts: ['editable'],
      documentUrlPatterns: ['https://*/*', 'http://*/*']
    });

    chrome.contextMenus.create({
      id: 'fill-password-2fa',
      parentId: 'tfa-studio-main',
      title: 'Fill Password + 2FA',
      contexts: ['editable'],
      documentUrlPatterns: ['https://*/*', 'http://*/*']
    });

    chrome.contextMenus.create({
      id: 'copy-2fa-code',
      parentId: 'tfa-studio-main',
      title: 'Copy 2FA Code',
      contexts: ['all'],
      documentUrlPatterns: ['https://*/*', 'http://*/*']
    });

    chrome.contextMenus.create({
      id: 'separator-1',
      parentId: 'tfa-studio-main',
      type: 'separator',
      contexts: ['all']
    });

    chrome.contextMenus.create({
      id: 'scan-qr-code',
      parentId: 'tfa-studio-main',
      title: 'Scan QR Code on Page',
      contexts: ['page', 'image'],
      documentUrlPatterns: ['https://*/*', 'http://*/*']
    });

    chrome.contextMenus.create({
      id: 'scan-qr-image',
      parentId: 'tfa-studio-main',
      title: 'Scan This QR Code',
      contexts: ['image'],
      documentUrlPatterns: ['https://*/*', 'http://*/*']
    });

    chrome.contextMenus.create({
      id: 'separator-2',
      parentId: 'tfa-studio-main',
      type: 'separator',
      contexts: ['all']
    });

    chrome.contextMenus.create({
      id: 'save-password',
      parentId: 'tfa-studio-main',
      title: 'Save Password for This Site',
      contexts: ['page'],
      documentUrlPatterns: ['https://*/*', 'http://*/*']
    });

    chrome.contextMenus.create({
      id: 'add-account-for-site',
      parentId: 'tfa-studio-main',
      title: 'Add 2FA Account for This Site',
      contexts: ['page'],
      documentUrlPatterns: ['https://*/*', 'http://*/*']
    });

    chrome.contextMenus.create({
      id: 'separator-3',
      parentId: 'tfa-studio-main',
      type: 'separator',
      contexts: ['all']
    });

    chrome.contextMenus.create({
      id: 'open-2fa-studio',
      parentId: 'tfa-studio-main',
      title: 'Open 2FA Studio',
      contexts: ['all']
    });

    chrome.contextMenus.create({
      id: 'settings',
      parentId: 'tfa-studio-main',
      title: 'Settings',
      contexts: ['all']
    });

    // Dynamic account submenu
    chrome.contextMenus.create({
      id: 'accounts-submenu',
      parentId: 'tfa-studio-main',
      title: 'Accounts',
      contexts: ['all'],
      enabled: false
    });

    chrome.contextMenus.onClicked.addListener((info, tab) => {
      this.handleContextMenuClick(info, tab);
    });
  }

  async handleContextMenuClick(info, tab) {
    // Check if extension is locked
    const isLocked = await this.extensionLock.isLocked();
    if (isLocked) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('assets/icon-48.png'),
        title: '2FA Studio Locked',
        message: 'Please unlock the extension first'
      });
      return;
    }

    switch (info.menuItemId) {
      case 'fill-2fa-code':
        await this.handleFillCode(tab);
        break;
      case 'fill-password-2fa':
        await this.handleFillPasswordAnd2FA(tab);
        break;
      case 'copy-2fa-code':
        await this.handleCopy2FACode(tab);
        break;
      case 'scan-qr-code':
        await this.handleScanQRMenuItem(tab);
        break;
      case 'scan-qr-image':
        await this.handleScanQRImage(info.srcUrl, tab);
        break;
      case 'save-password':
        await this.handleSavePasswordForSite(tab);
        break;
      case 'add-account-for-site':
        await this.handleAddAccountForSite(tab);
        break;
      case 'open-2fa-studio':
        this.handleOpenApp();
        break;
      case 'settings':
        chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
        break;
      default:
        // Check if it's an account selection
        if (info.menuItemId.startsWith('account-')) {
          await this.handleAccountSelection(info.menuItemId, tab);
        }
    }
  }

  async handleScanQRMenuItem(tab) {
    // Send message to content script to enable QR selection mode
    chrome.tabs.sendMessage(tab.id, {
      action: 'enableQRSelection'
    });
  }

  async handleScanQRImage(imageUrl, tab) {
    try {
      // Fetch the image
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64 = reader.result.split(',')[1];
        const result = await this.qrScanner.scanFromBase64(base64);
        
        if (result) {
          const parsed = this.parseOTPUrl(result);
          if (parsed) {
            // Show notification and offer to add account
            chrome.notifications.create({
              type: 'basic',
              iconUrl: chrome.runtime.getURL('assets/icon-48.png'),
              title: 'QR Code Found',
              message: `Found 2FA account for ${parsed.issuer}. Check popup to add.`,
              buttons: [{ title: 'Add Account' }]
            });
            
            // Store temporarily for adding
            this.qrCodeCache.set('pending-account', parsed);
          }
        }
      };
      
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Failed to scan QR image:', error);
    }
  }

  async handleFillPasswordAnd2FA(tab) {
    try {
      const url = new URL(tab.url);
      const domain = url.hostname;
      
      // Get passwords for this domain
      const passwords = await this.passwordManager.getPasswordsForDomain(domain);
      const accounts = await StorageService.getAccounts();
      const matchingAccounts = this.findDomainMatches(accounts, domain);
      
      if (passwords.length > 0 && matchingAccounts.length > 0) {
        // If single match for both, auto-fill
        if (passwords.length === 1 && matchingAccounts.length === 1) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'fillBothCredentials',
            password: passwords[0],
            account: matchingAccounts[0]
          });
        } else {
          // Show selection in popup
          chrome.action.openPopup();
        }
      } else {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('assets/icon-48.png'),
          title: 'No Credentials Found',
          message: 'No saved passwords or 2FA accounts for this site'
        });
      }
    } catch (error) {
      console.error('Failed to fill password and 2FA:', error);
    }
  }

  async handleCopy2FACode(tab) {
    try {
      const url = new URL(tab.url);
      const domain = url.hostname;
      const accounts = await StorageService.getAccounts();
      const matches = this.findDomainMatches(accounts, domain);
      
      if (matches.length === 1) {
        // Single match - copy directly
        const code = OTPService.generateCode(matches[0]);
        await navigator.clipboard.writeText(code.code);
        
        await this.badgeManager.showNotification('copied', `Copied ${matches[0].issuer} code`);
      } else if (matches.length > 1) {
        // Multiple matches - update context menu with accounts
        await this.updateAccountsContextMenu(matches, tab);
      } else {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('assets/icon-48.png'),
          title: 'No Accounts Found',
          message: 'No 2FA accounts found for this site'
        });
      }
    } catch (error) {
      console.error('Failed to copy 2FA code:', error);
    }
  }

  async updateAccountsContextMenu(accounts, tab) {
    // Remove old account items
    const existingItems = await chrome.contextMenus.removeAll();
    
    // Recreate base menu
    this.setupContextMenu();
    
    // Enable accounts submenu
    chrome.contextMenus.update('accounts-submenu', { enabled: true });
    
    // Add account items
    accounts.forEach((account, index) => {
      chrome.contextMenus.create({
        id: `account-${account.id}`,
        parentId: 'accounts-submenu',
        title: `${account.issuer} (${account.accountName})`,
        contexts: ['all']
      });
    });
  }

  async handleAccountSelection(menuItemId, tab) {
    const accountId = menuItemId.replace('account-', '');
    const accounts = await StorageService.getAccounts();
    const account = accounts.find(a => a.id === accountId);
    
    if (account) {
      const code = OTPService.generateCode(account);
      await navigator.clipboard.writeText(code.code);
      await this.badgeManager.showNotification('copied', `Copied ${account.issuer} code`);
    }
  }

  async handleSavePasswordForSite(tab) {
    // Send message to content script to detect login form
    chrome.tabs.sendMessage(tab.id, {
      action: 'promptSavePassword'
    });
  }

  async handleAddAccountForSite(tab) {
    const url = new URL(tab.url);
    const domain = url.hostname;
    
    // Open add account page with pre-filled domain
    chrome.tabs.create({ 
      url: chrome.runtime.getURL(`index.html#/accounts?action=add&domain=${domain}`) 
    });
  }

  async handleFillCode(tab) {
    try {
      // Get accounts
      const accounts = await StorageService.getAccounts();
      
      // Check if we have accounts for this domain
      const url = new URL(tab.url);
      const domain = url.hostname;
      
      const matches = this.findDomainMatches(accounts, domain);

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
        
        // Update badge to show successful match
        this.updateBadgeForMatch(matches[0]);
        
        // Show notification
        NotificationService.show({
          title: 'Code Auto-Filled',
          message: `${matches[0].issuer} code filled automatically`,
          iconUrl: chrome.runtime.getURL('assets/icon-128.png')
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

  // Handle keyboard commands (from manifest shortcuts)
  async handleCommand(command) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Security check for commands
      const securityCheck = await this.securityService.validateURL(tab.url);
      if (!securityCheck.valid && securityCheck.severity === 'high') {
        // Block commands on dangerous sites
        NotificationService.show({
          title: 'Security Warning',
          message: 'Cannot execute 2FA commands on this site for security reasons',
          iconUrl: chrome.runtime.getURL('assets/icon-128.png')
        });
        return;
      }
      
      this.executeCommand(command, tab);
    } catch (error) {
      console.error('Failed to handle command:', error);
    }
  }

  // Handle custom keyboard shortcuts
  async handleShortcutCommand(command, shortcut, sendResponse) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Security check for commands
      const securityCheck = await this.securityService.validateURL(tab.url);
      if (!securityCheck.valid && securityCheck.severity === 'high') {
        sendResponse({ 
          success: false, 
          error: 'Cannot execute 2FA commands on this site for security reasons',
          securityWarning: true 
        });
        return;
      }
      
      const result = await this.executeCommand(command, tab);
      sendResponse({ success: true, result });
    } catch (error) {
      console.error('Failed to handle shortcut command:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async executeCommand(command, tab) {
    switch (command) {
      case 'fill-code':
        return await this.handleFillCode(tab);
        
      case 'scan-qr':
        chrome.tabs.sendMessage(tab.id, {
          action: 'enableQRSelection'
        });
        return { action: 'QR selection enabled' };
        
      case 'copy-code':
        return await this.handleCopyCode(tab);
        
      case 'quick-fill':
        return await this.handleQuickFill(tab);
        
      case 'open-settings':
        chrome.tabs.create({ 
          url: chrome.runtime.getURL('../index.html#/settings') 
        });
        return { action: 'Settings opened' };
        
      case 'toggle-auto-fill':
        return await this.handleToggleAutoFill();
        
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }

  async handleCopyCode(tab) {
    try {
      const accounts = await StorageService.getAccounts();
      const url = new URL(tab.url);
      const domain = url.hostname;
      
      const matches = this.findDomainMatches(accounts, domain);

      if (matches.length === 1) {
        const code = OTPService.generateCode(matches[0]);
        
        // Copy to clipboard via content script
        chrome.tabs.sendMessage(tab.id, {
          action: 'copyToClipboard',
          text: code.code
        });
        
        NotificationService.show({
          title: 'Code Copied',
          message: `${matches[0].issuer} code copied to clipboard`,
          iconUrl: chrome.runtime.getURL('assets/icon-128.png')
        });
        
        return { code: code.code, account: matches[0].issuer };
      } else if (matches.length > 1) {
        // Open popup for selection
        chrome.action.openPopup();
        return { action: 'Multiple accounts found, popup opened' };
      } else {
        throw new Error('No matching accounts found for this domain');
      }
    } catch (error) {
      throw new Error(`Failed to copy code: ${error.message}`);
    }
  }

  async handleQuickFill(tab) {
    try {
      const accounts = await StorageService.getAccounts();
      const url = new URL(tab.url);
      const domain = url.hostname;
      
      const matches = this.findDomainMatches(accounts, domain);

      if (matches.length >= 1) {
        // Use the best match (first one is highest confidence)
        const account = matches[0];
        const code = OTPService.generateCode(account);
        
        // Auto-fill immediately
        chrome.tabs.sendMessage(tab.id, {
          action: 'fillCode',
          code: code.code
        });
        
        NotificationService.show({
          title: 'Quick Fill',
          message: `${account.issuer} code filled automatically`,
          iconUrl: chrome.runtime.getURL('assets/icon-128.png')
        });
        
        return { code: code.code, account: account.issuer };
      } else {
        throw new Error('No matching accounts found for this domain');
      }
    } catch (error) {
      throw new Error(`Failed to quick fill: ${error.message}`);
    }
  }

  async handleToggleAutoFill() {
    try {
      const settings = await StorageService.getSettings();
      settings.autoFill = !settings.autoFill;
      await StorageService.setSettings(settings);
      
      NotificationService.show({
        title: 'Auto-fill Mode',
        message: `Auto-fill ${settings.autoFill ? 'enabled' : 'disabled'}`,
        iconUrl: chrome.runtime.getURL('assets/icon-128.png')
      });
      
      return { autoFill: settings.autoFill };
    } catch (error) {
      throw new Error(`Failed to toggle auto-fill: ${error.message}`);
    }
  }

  async handleGetShortcuts(sendResponse) {
    try {
      const shortcuts = this.keyboardShortcuts.getAllShortcuts();
      sendResponse({ success: true, data: shortcuts });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleSetCustomShortcut(command, shortcut, sendResponse) {
    try {
      await this.keyboardShortcuts.setCustomShortcut(command, shortcut);
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleResetShortcut(command, sendResponse) {
    try {
      await this.keyboardShortcuts.resetShortcut(command);
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleResetAllShortcuts(sendResponse) {
    try {
      await this.keyboardShortcuts.resetAllShortcuts();
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // Password Manager Methods
  async handleUnlockPasswordManager(masterPassword, sendResponse) {
    try {
      const result = await this.passwordManager.unlock(masterPassword);
      sendResponse(result);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  handleLockPasswordManager(sendResponse) {
    try {
      this.passwordManager.lock();
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  handleIsPasswordManagerUnlocked(sendResponse) {
    try {
      const isUnlocked = this.passwordManager.isEnabled();
      sendResponse({ success: true, isUnlocked });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleSavePassword(passwordData, sendResponse) {
    try {
      const result = await this.passwordManager.savePassword(passwordData);
      sendResponse(result);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleDeletePassword(id, sendResponse) {
    try {
      const result = await this.passwordManager.deletePassword(id);
      sendResponse(result);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  handleGetPasswordsForDomain(domain, sendResponse) {
    try {
      const passwords = this.passwordManager.findPasswordsForDomain(domain);
      sendResponse({ success: true, passwords });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  handleGetPassword(id, sendResponse) {
    try {
      const password = this.passwordManager.getPassword(id);
      if (password) {
        sendResponse({ success: true, password });
      } else {
        sendResponse({ success: false, error: 'Password not found' });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleFillLoginForm(passwordId, tab, sendResponse) {
    try {
      // Send message to content script to fill the form
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'fillLoginForm',
        passwordId: passwordId
      });

      if (response?.success) {
        await this.passwordManager.markAsUsed(passwordId);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: response?.error || 'Failed to fill form' });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleDetectLoginForm(tab, sendResponse) {
    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'detectLoginForm'
      });

      sendResponse({ success: true, forms: response?.forms || [] });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleFillBothCredentials(passwordId, accountId, tab, sendResponse) {
    try {
      // First fill the password
      const passwordResponse = await chrome.tabs.sendMessage(tab.id, {
        action: 'fillLoginForm',
        passwordId: passwordId
      });

      if (!passwordResponse?.success) {
        sendResponse({ success: false, error: 'Failed to fill password' });
        return;
      }

      // Then fill the 2FA code
      const account = await this.getAccountById(accountId);
      if (!account) {
        sendResponse({ success: false, error: '2FA account not found' });
        return;
      }

      const code = OTPService.generateCode(account);
      const codeResponse = await chrome.tabs.sendMessage(tab.id, {
        action: 'fillCode',
        code: code.code
      });

      if (codeResponse?.success) {
        await this.passwordManager.markAsUsed(passwordId);
        sendResponse({ success: true });
        
        NotificationService.show({
          title: 'Credentials Filled',
          message: 'Both password and 2FA code have been filled',
          iconUrl: chrome.runtime.getURL('assets/icon-128.png')
        });
      } else {
        sendResponse({ success: false, error: 'Failed to fill 2FA code' });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async getAccountById(accountId) {
    try {
      const accounts = await StorageService.getAccounts();
      return accounts.find(a => a.id === accountId);
    } catch (error) {
      return null;
    }
  }

  async handleSecurityCheck(url, sendResponse) {
    try {
      // Enhanced security check with domain verification
      const result = await this.securityService.validateURL(url);
      
      // Also get detailed domain verification
      if (result.valid) {
        const urlObj = new URL(url);
        const domainVerification = await this.securityService.verifyDomainTrust(urlObj.hostname);
        result.domainVerification = domainVerification;
      }
      
      sendResponse({ success: true, data: result });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handlePhishingReport(domain, reason, sendResponse) {
    try {
      await this.securityService.reportSuspiciousDomain(domain, reason);
      sendResponse({ success: true });
      
      // Show notification
      NotificationService.show({
        title: 'Report Submitted',
        message: `Thank you for reporting ${domain}`,
        iconUrl: chrome.runtime.getURL('assets/icon-128.png')
      });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // Extension Lock handlers
  async handleSetExtensionPin(pin, sendResponse) {
    try {
      const result = await this.extensionLock.setPin(pin);
      sendResponse(result);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleVerifyExtensionPin(pin, sendResponse) {
    try {
      const result = await this.extensionLock.verifyPin(pin);
      sendResponse(result);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleRemoveExtensionPin(sendResponse) {
    try {
      const result = await this.extensionLock.removePin();
      sendResponse(result);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleLockExtension(sendResponse) {
    try {
      await this.extensionLock.lock();
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleIsExtensionLocked(sendResponse) {
    try {
      const locked = await this.extensionLock.isLocked();
      sendResponse({ success: true, locked });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleSetAutoLockTimeout(minutes, sendResponse) {
    try {
      await this.extensionLock.setAutoLockTimeout(minutes);
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // Browser Sync handlers
  async handleEnableSync(sendResponse) {
    try {
      const result = await SyncManager.enableSync();
      sendResponse(result);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleDisableSync(sendResponse) {
    try {
      const result = await SyncManager.disableSync();
      sendResponse(result);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleGetSyncStatus(sendResponse) {
    try {
      const status = await SyncManager.getSyncStatus();
      sendResponse({ success: true, ...status });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleExportSyncData(sendResponse) {
    try {
      const result = await SyncManager.exportSyncData();
      sendResponse(result);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleImportSyncData(data, sendResponse) {
    try {
      const result = await SyncManager.importSyncData(data);
      sendResponse(result);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // Mobile Connector handlers
  async handlePairWithMobile(pairingCode, sendResponse) {
    try {
      const result = await this.mobileConnector.pairWithMobile(pairingCode);
      sendResponse(result);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleUnpairMobile(sendResponse) {
    try {
      const result = await this.mobileConnector.unpair();
      sendResponse(result);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleGetMobileStatus(sendResponse) {
    try {
      const status = await this.mobileConnector.getMobileStatus();
      sendResponse({ success: true, ...status });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleSendToMobile(message, sendResponse) {
    try {
      await this.mobileConnector.sendEncryptedMessage(message);
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // Badge Manager handlers
  async handleUpdateBadge(sendResponse) {
    try {
      await this.badgeManager.updateBadge();
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleClearBadge(sendResponse) {
    try {
      await this.badgeManager.clearBadge();
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleShowNotification(type, message, sendResponse) {
    try {
      await this.badgeManager.showNotification(type, message);
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // Enhanced tab monitoring for security with domain verification
  async monitorTabSecurity() {
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        try {
          const url = new URL(tab.url);
          
          // Quick security warning check
          const warning = this.securityService.getSecurityWarning(url.hostname);
          
          // Enhanced domain verification for HTTPS sites
          if (url.protocol === 'https:') {
            const domainVerification = await this.securityService.verifyDomainTrust(url.hostname);
            
            if (!domainVerification.verified || domainVerification.trustScore < 0.5) {
              // Show enhanced security warning for low trust domains
              chrome.action.setBadgeText({ 
                text: '🔒', 
                tabId: tabId 
              });
              chrome.action.setBadgeBackgroundColor({ 
                color: domainVerification.trustScore < 0.3 ? '#dc3545' : '#ffc107',
                tabId: tabId 
              });
              
              // Inject enhanced security warning
              chrome.tabs.sendMessage(tabId, {
                action: 'showSecurityWarning',
                warning: {
                  type: domainVerification.trustScore < 0.3 ? 'danger' : 'warning',
                  title: 'Domain Verification Warning',
                  message: `Trust Score: ${Math.round(domainVerification.trustScore * 100)}% - ${domainVerification.recommendations[0]}`,
                  action: 'Enhanced Security Check',
                  verification: domainVerification
                }
              });
            } else if (warning) {
              // Standard phishing/security warning
              chrome.action.setBadgeText({ 
                text: '⚠️', 
                tabId: tabId 
              });
              chrome.action.setBadgeBackgroundColor({ 
                color: warning.type === 'danger' ? '#dc3545' : '#ffc107',
                tabId: tabId 
              });
              
              chrome.tabs.sendMessage(tabId, {
                action: 'showSecurityWarning',
                warning: warning
              });
            } else {
              // Clear security badge for trusted domains
              chrome.action.setBadgeText({ text: '', tabId: tabId });
            }
          } else if (warning) {
            // HTTP or other protocol with standard warning
            chrome.action.setBadgeText({ 
              text: '⚠️', 
              tabId: tabId 
            });
            chrome.action.setBadgeBackgroundColor({ 
              color: '#dc3545',
              tabId: tabId 
            });
            
            chrome.tabs.sendMessage(tabId, {
              action: 'showSecurityWarning',
              warning: warning
            });
          } else {
            // Clear security badge
            chrome.action.setBadgeText({ text: '', tabId: tabId });
          }
        } catch (error) {
          console.debug('Error monitoring tab security:', error);
        }
      }
    });
  }
}

// Initialize background service
new BackgroundService();