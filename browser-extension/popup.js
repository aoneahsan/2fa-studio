/**
 * Popup Script
 * Handles UI interactions and communication with background script
 */

// State
let accounts = [];
let isAuthenticated = false;
let searchQuery = '';

// Elements
const loginScreen = document.getElementById('loginScreen');
const mainScreen = document.getElementById('mainScreen');
const settingsScreen = document.getElementById('settingsScreen');
const accountsList = document.getElementById('accountsList');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthentication();
  setupEventListeners();
});

// Check authentication status
async function checkAuthentication() {
  const response = await chrome.runtime.sendMessage({ type: 'CHECK_AUTH' });
  isAuthenticated = response.authenticated;
  
  if (isAuthenticated) {
    showMainScreen();
    await loadAccounts();
  } else {
    showLoginScreen();
  }
}

// Setup event listeners
function setupEventListeners() {
  // Login button
  document.getElementById('loginBtn').addEventListener('click', handleLogin);
  
  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', showSettingsScreen);
  
  // Back button
  document.getElementById('backBtn').addEventListener('click', showMainScreen);
  
  // Logout button
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
  
  // Search input
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    renderAccounts();
  });
  
  // Settings toggles
  document.getElementById('autoFillToggle').addEventListener('change', saveSettings);
  document.getElementById('notificationsToggle').addEventListener('change', saveSettings);
  
  // Load saved settings
  loadSettings();
}

// Show login screen
function showLoginScreen() {
  loginScreen.classList.remove('hidden');
  mainScreen.classList.add('hidden');
  settingsScreen.classList.add('hidden');
}

// Show main screen
function showMainScreen() {
  loginScreen.classList.add('hidden');
  mainScreen.classList.remove('hidden');
  settingsScreen.classList.add('hidden');
}

// Show settings screen
function showSettingsScreen() {
  loginScreen.classList.add('hidden');
  mainScreen.classList.add('hidden');
  settingsScreen.classList.remove('hidden');
}

// Handle login
async function handleLogin() {
  // In a real implementation, this would open the auth flow
  // For now, we'll simulate a successful login
  const mockToken = 'mock-auth-token';
  
  const response = await chrome.runtime.sendMessage({
    type: 'LOGIN',
    token: mockToken
  });
  
  if (response.success) {
    isAuthenticated = true;
    showMainScreen();
    await loadAccounts();
  }
}

// Handle logout
async function handleLogout() {
  const response = await chrome.runtime.sendMessage({ type: 'LOGOUT' });
  
  if (response.success) {
    isAuthenticated = false;
    accounts = [];
    showLoginScreen();
  }
}

// Load accounts
async function loadAccounts() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_ACCOUNTS' });
  accounts = response.accounts || [];
  renderAccounts();
}

// Render accounts
function renderAccounts() {
  const filteredAccounts = accounts.filter(account => {
    if (!searchQuery) return true;
    return account.issuer.toLowerCase().includes(searchQuery) ||
           account.label.toLowerCase().includes(searchQuery);
  });
  
  if (filteredAccounts.length === 0) {
    accountsList.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }
  
  accountsList.classList.remove('hidden');
  emptyState.classList.add('hidden');
  
  accountsList.innerHTML = filteredAccounts.map(account => `
    <div class="account-item" data-account-id="${account.id}">
      <div class="account-icon">
        ${account.issuer.charAt(0).toUpperCase()}
      </div>
      <div class="account-info">
        <div class="account-issuer">${account.issuer}</div>
        <div class="account-label">${account.label}</div>
      </div>
      <div class="account-code">
        <div class="code-value">------</div>
        <div class="code-timer"></div>
      </div>
    </div>
  `).join('');
  
  // Add click handlers
  document.querySelectorAll('.account-item').forEach(item => {
    item.addEventListener('click', () => handleAccountClick(item));
  });
  
  // Generate codes for visible accounts
  filteredAccounts.forEach(account => {
    generateAndDisplayCode(account.id);
  });
}

// Handle account click
async function handleAccountClick(element) {
  const accountId = element.dataset.accountId;
  const codeElement = element.querySelector('.code-value');
  const code = codeElement.textContent;
  
  if (code && code !== '------') {
    // Copy to clipboard
    await navigator.clipboard.writeText(code);
    
    // Visual feedback
    codeElement.style.color = '#10b981';
    setTimeout(() => {
      codeElement.style.color = '#3b82f6';
    }, 1000);
    
    // Try to auto-fill on current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.runtime.sendMessage({
      type: 'AUTO_FILL',
      accountId: accountId
    });
  }
}

// Generate and display code
async function generateAndDisplayCode(accountId) {
  const response = await chrome.runtime.sendMessage({
    type: 'GENERATE_CODE',
    accountId: accountId
  });
  
  if (response.code) {
    const element = document.querySelector(`[data-account-id="${accountId}"]`);
    if (element) {
      const codeElement = element.querySelector('.code-value');
      const timerElement = element.querySelector('.code-timer');
      
      codeElement.textContent = formatCode(response.code.code);
      
      // Update timer
      updateTimer(timerElement, response.code.remainingTime);
    }
  }
}

// Format code for display
function formatCode(code) {
  return code.slice(0, 3) + ' ' + code.slice(3);
}

// Update timer
function updateTimer(element, remainingTime) {
  element.textContent = `${remainingTime}s`;
  
  const interval = setInterval(() => {
    remainingTime--;
    if (remainingTime <= 0) {
      clearInterval(interval);
      // Refresh code
      const accountId = element.closest('.account-item').dataset.accountId;
      generateAndDisplayCode(accountId);
    } else {
      element.textContent = `${remainingTime}s`;
    }
  }, 1000);
}

// Load settings
async function loadSettings() {
  const settings = await chrome.storage.local.get(['autoFill', 'notifications']);
  document.getElementById('autoFillToggle').checked = settings.autoFill !== false;
  document.getElementById('notificationsToggle').checked = settings.notifications !== false;
}

// Save settings
async function saveSettings() {
  const autoFill = document.getElementById('autoFillToggle').checked;
  const notifications = document.getElementById('notificationsToggle').checked;
  
  await chrome.storage.local.set({
    autoFill: autoFill,
    notifications: notifications
  });
}

// Listen for account updates
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'ACCOUNTS_UPDATED') {
    accounts = request.accounts;
    renderAccounts();
  }
});