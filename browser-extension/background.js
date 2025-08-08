/**
 * Browser Extension Background Script
 * Handles communication between popup, content scripts, and Firebase
 */

// Firebase connection status
let firebaseConnected = false;
let authToken = null;
let accounts = [];

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('2FA Studio extension installed');
  initializeExtension();
});

// Initialize connection to Firebase
async function initializeExtension() {
  try {
    // Get auth token from storage
    const result = await chrome.storage.local.get(['authToken']);
    if (result.authToken) {
      authToken = result.authToken;
      await loadAccounts();
    }
  } catch (error) {
    console.error('Failed to initialize extension:', error);
  }
}

// Load accounts from Firebase
async function loadAccounts() {
  if (!authToken) return;
  
  try {
    // This would connect to your Firebase backend
    // For now, using mock data
    accounts = [
      {
        id: '1',
        issuer: 'Google',
        label: 'user@example.com',
        secret: 'JBSWY3DPEHPK3PXP',
        type: 'totp',
        period: 30,
        digits: 6,
        algorithm: 'SHA1'
      }
    ];
    
    firebaseConnected = true;
    
    // Notify popup if open
    chrome.runtime.sendMessage({
      type: 'ACCOUNTS_UPDATED',
      accounts: accounts
    }).catch(() => {
      // Popup not open, ignore
    });
  } catch (error) {
    console.error('Failed to load accounts:', error);
    firebaseConnected = false;
  }
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender, sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(request, sender, sendResponse) {
  switch (request.type) {
    case 'GET_ACCOUNTS':
      sendResponse({ accounts, connected: firebaseConnected });
      break;
      
    case 'GENERATE_CODE':
      const code = await generateCode(request.accountId);
      sendResponse({ code });
      break;
      
    case 'LOGIN':
      await handleLogin(request.token);
      sendResponse({ success: true });
      break;
      
    case 'LOGOUT':
      await handleLogout();
      sendResponse({ success: true });
      break;
      
    case 'CHECK_AUTH':
      sendResponse({ authenticated: !!authToken });
      break;
      
    case 'AUTO_FILL':
      await handleAutoFill(sender.tab.id, request.accountId);
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
}

// Generate TOTP code
async function generateCode(accountId) {
  const account = accounts.find(a => a.id === accountId);
  if (!account) {
    throw new Error('Account not found');
  }
  
  // Import from the main app's OTP service
  // For now, using a simple implementation
  const time = Math.floor(Date.now() / 1000);
  const counter = Math.floor(time / account.period);
  
  // This would use the actual TOTP algorithm
  // Returning mock code for demonstration
  return {
    code: '123456',
    remainingTime: account.period - (time % account.period)
  };
}

// Handle login
async function handleLogin(token) {
  authToken = token;
  await chrome.storage.local.set({ authToken: token });
  await loadAccounts();
}

// Handle logout
async function handleLogout() {
  authToken = null;
  accounts = [];
  firebaseConnected = false;
  await chrome.storage.local.remove(['authToken']);
}

// Handle auto-fill request
async function handleAutoFill(tabId, accountId) {
  const { code } = await generateCode(accountId);
  
  // Send code to content script
  chrome.tabs.sendMessage(tabId, {
    type: 'FILL_CODE',
    code: code
  });
  
  // Show notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title: '2FA Code Filled',
    message: `Code ${code} has been filled`
  });
}

// Listen for tab updates to detect 2FA fields
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if this is a known 2FA page
    checkFor2FAPage(tabId, tab.url);
  }
});

// Check if page might have 2FA fields
async function checkFor2FAPage(tabId, url) {
  try {
    const hostname = new URL(url).hostname;
    
    // Find matching accounts
    const matchingAccounts = accounts.filter(account => {
      const issuerLower = account.issuer.toLowerCase();
      return hostname.includes(issuerLower) || 
             issuerLower.includes(hostname.replace('www.', ''));
    });
    
    if (matchingAccounts.length > 0) {
      // Notify content script
      chrome.tabs.sendMessage(tabId, {
        type: 'MATCHING_ACCOUNTS',
        accounts: matchingAccounts
      });
    }
  } catch (error) {
    // Invalid URL, ignore
  }
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open popup is handled by manifest
});

// Keep service worker alive
const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);
chrome.runtime.onStartup.addListener(keepAlive);
keepAlive();