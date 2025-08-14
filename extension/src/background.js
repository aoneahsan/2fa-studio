/**
 * Chrome Extension Background Service Worker
 * Handles extension lifecycle, messaging, and synchronization
 */

// Constants
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
const NOTIFICATION_TIMEOUT = 5000; // 5 seconds
const FIREBASE_CONFIG = {
  // Will be populated from environment during build
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: ''
};

// State management
let authenticatedUser = null;
let accounts = [];
let syncTimer = null;

/**
 * Extension installation handler
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('2FA Studio extension installed:', details.reason);
  
  // Set default storage values
  chrome.storage.local.set({
    isAuthenticated: false,
    accounts: [],
    settings: {
      autoFill: false,
      notifications: true,
      syncEnabled: true,
      theme: 'light'
    }
  });
  
  // Create context menu items
  createContextMenus();
  
  // Show welcome notification
  if (details.reason === 'install') {
    showNotification(
      'Welcome to 2FA Studio!',
      'Click the extension icon to get started.'
    );
  }
});

/**
 * Extension startup handler
 */
chrome.runtime.onStartup.addListener(() => {
  console.log('2FA Studio extension started');
  initializeExtension();
});

/**
 * Message handler for communication with content scripts and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.action);
  
  switch (request.action) {
    case 'authenticate':
      handleAuthentication(request.data)
        .then(sendResponse)
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async response
      
    case 'getAccounts':
      sendResponse({ success: true, accounts });
      break;
      
    case 'generateCode':
      generateTOTPCode(request.accountId)
        .then(sendResponse)
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'syncAccounts':
      syncWithFirebase()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'scanQR':
      handleQRScan(sender.tab)
        .then(sendResponse)
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'autoFill':
      handleAutoFill(sender.tab, request.code)
        .then(sendResponse)
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'copyCode':
      copyToClipboard(request.code)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

/**
 * Command handler for keyboard shortcuts
 */
chrome.commands.onCommand.addListener((command) => {
  console.log('Command received:', command);
  
  switch (command) {
    case 'open-popup':
      chrome.action.openPopup();
      break;
      
    case 'copy-current-code':
      copyCurrentSiteCode();
      break;
      
    case 'scan-qr':
      scanCurrentPageQR();
      break;
  }
});

/**
 * Alarm handler for periodic sync
 */
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'sync') {
    syncWithFirebase();
  }
});

/**
 * Tab update handler for auto-detection
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    detectTwoFactorField(tabId, tab.url);
  }
});

// Helper Functions

/**
 * Initialize extension
 */
async function initializeExtension() {
  try {
    // Load stored data
    const data = await chrome.storage.local.get(['isAuthenticated', 'accounts', 'settings']);
    
    if (data.isAuthenticated) {
      accounts = data.accounts || [];
      startSync();
    }
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

/**
 * Handle authentication
 */
async function handleAuthentication(credentials) {
  try {
    // TODO: Implement Firebase authentication
    // For now, simulate authentication
    authenticatedUser = {
      uid: 'demo-user',
      email: credentials.email
    };
    
    await chrome.storage.local.set({
      isAuthenticated: true,
      user: authenticatedUser
    });
    
    // Start syncing
    startSync();
    
    return { success: true, user: authenticatedUser };
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

/**
 * Sync with Firebase
 */
async function syncWithFirebase() {
  if (!authenticatedUser) return;
  
  try {
    // TODO: Implement Firebase sync
    // For now, use local storage
    const data = await chrome.storage.local.get('accounts');
    accounts = data.accounts || [];
    
    console.log('Synced accounts:', accounts.length);
  } catch (error) {
    console.error('Sync error:', error);
  }
}

/**
 * Start periodic sync
 */
function startSync() {
  // Clear existing timer
  if (syncTimer) {
    clearInterval(syncTimer);
  }
  
  // Set up periodic sync
  chrome.alarms.create('sync', {
    periodInMinutes: 5
  });
  
  // Initial sync
  syncWithFirebase();
}

/**
 * Generate TOTP code
 */
async function generateTOTPCode(accountId) {
  const account = accounts.find(a => a.id === accountId);
  if (!account) {
    throw new Error('Account not found');
  }
  
  // TODO: Implement actual TOTP generation
  // For now, return demo code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);
  
  return {
    success: true,
    code,
    remaining
  };
}

/**
 * Handle QR code scanning
 */
async function handleQRScan(tab) {
  if (!tab || !tab.id) {
    throw new Error('Invalid tab');
  }
  
  // Inject QR scanner script
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: scanForQRCode
  });
  
  return { success: true };
}

/**
 * Scan for QR code on page
 */
function scanForQRCode() {
  // This function runs in the context of the web page
  const images = document.querySelectorAll('img');
  
  images.forEach(img => {
    // Check if image might be a QR code
    if (img.src && (img.src.includes('qr') || img.alt?.includes('QR'))) {
      // Send message back to background
      chrome.runtime.sendMessage({
        action: 'qrFound',
        src: img.src
      });
    }
  });
}

/**
 * Handle auto-fill
 */
async function handleAutoFill(tab, code) {
  if (!tab || !tab.id) {
    throw new Error('Invalid tab');
  }
  
  // Inject code into 2FA field
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: fillTwoFactorField,
    args: [code]
  });
  
  return { success: true };
}

/**
 * Fill 2FA field on page
 */
function fillTwoFactorField(code) {
  // This function runs in the context of the web page
  const selectors = [
    'input[name*="code"]',
    'input[name*="otp"]',
    'input[name*="totp"]',
    'input[name*="2fa"]',
    'input[placeholder*="code"]',
    'input[placeholder*="OTP"]',
    'input[type="tel"][maxlength="6"]',
    'input[type="number"][maxlength="6"]'
  ];
  
  for (const selector of selectors) {
    const input = document.querySelector(selector);
    if (input && input.offsetParent !== null) {
      input.value = code;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
  }
  
  return false;
}

/**
 * Copy to clipboard
 */
async function copyToClipboard(text) {
  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['CLIPBOARD'],
      justification: 'Copy 2FA code to clipboard'
    });
    
    await chrome.runtime.sendMessage({
      action: 'copy',
      target: 'offscreen',
      data: text
    });
    
    await chrome.offscreen.closeDocument();
    
    showNotification('Code Copied!', 'The 2FA code has been copied to your clipboard.');
  } catch (error) {
    console.error('Copy error:', error);
    throw error;
  }
}

/**
 * Copy code for current site
 */
async function copyCurrentSiteCode() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;
    
    const hostname = new URL(tab.url).hostname;
    const account = accounts.find(a => 
      a.issuer?.toLowerCase().includes(hostname) ||
      a.label?.toLowerCase().includes(hostname)
    );
    
    if (account) {
      const result = await generateTOTPCode(account.id);
      await copyToClipboard(result.code);
    } else {
      showNotification('No Account Found', `No 2FA account found for ${hostname}`);
    }
  } catch (error) {
    console.error('Copy current site code error:', error);
  }
}

/**
 * Scan QR on current page
 */
async function scanCurrentPageQR() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await handleQRScan(tab);
    }
  } catch (error) {
    console.error('Scan QR error:', error);
  }
}

/**
 * Detect 2FA field on page
 */
async function detectTwoFactorField(tabId, url) {
  try {
    const settings = await chrome.storage.local.get('settings');
    if (!settings.settings?.autoFill) return;
    
    // Check if page might have 2FA field
    const hostname = new URL(url).hostname;
    const account = accounts.find(a => 
      a.issuer?.toLowerCase().includes(hostname) ||
      a.label?.toLowerCase().includes(hostname)
    );
    
    if (account) {
      // Show page action icon
      chrome.action.setBadgeText({ text: '2FA', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId });
    }
  } catch (error) {
    console.error('Detect 2FA field error:', error);
  }
}

/**
 * Create context menu items
 */
function createContextMenus() {
  chrome.contextMenus.create({
    id: 'scan-qr',
    title: 'Scan QR Code',
    contexts: ['image']
  });
  
  chrome.contextMenus.create({
    id: 'fill-code',
    title: 'Fill 2FA Code',
    contexts: ['editable']
  });
}

/**
 * Context menu click handler
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case 'scan-qr':
      if (info.srcUrl) {
        // TODO: Process QR code from image URL
        console.log('Scan QR from:', info.srcUrl);
      }
      break;
      
    case 'fill-code':
      if (tab) {
        // TODO: Show account selector and fill code
        console.log('Fill code in tab:', tab.id);
      }
      break;
  }
});

/**
 * Show notification
 */
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title,
    message,
    priority: 1
  });
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeExtension,
    handleAuthentication,
    syncWithFirebase,
    generateTOTPCode
  };
}