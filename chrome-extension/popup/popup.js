/**
 * Chrome Extension Popup Script
 * @module popup
 */

import { StorageService } from '../src/storage.js';
import { OTPService } from '../src/otp.js';
import { MessageService } from '../src/message.js';

class PopupManager {
  constructor() {
    this.accounts = [];
    this.filteredAccounts = [];
    this.searchQuery = '';
    this.timers = new Map();
    
    this.init();
  }

  async init() {
    // Get DOM elements
    this.elements = {
      searchInput: document.getElementById('searchInput'),
      accountsList: document.getElementById('accountsList'),
      emptyState: document.getElementById('emptyState'),
      loadingState: document.getElementById('loadingState'),
      openAppBtn: document.getElementById('openAppBtn'),
      addNewBtn: document.getElementById('addNewBtn'),
      addAccountBtn: document.getElementById('addAccountBtn'),
      settingsBtn: document.getElementById('settingsBtn'),
      scanQRBtn: document.getElementById('scanQRBtn')
    };

    // Set up event listeners
    this.setupEventListeners();

    // Load accounts
    await this.loadAccounts();

    // Start updating codes
    this.startCodeUpdates();
  }

  setupEventListeners() {
    // Search
    this.elements.searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.filterAccounts();
    });

    // Open app button
    this.elements.openAppBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('../index.html') });
    });

    // Add account buttons
    this.elements.addNewBtn.addEventListener('click', () => {
      this.openAddAccountPage();
    });

    this.elements.addAccountBtn.addEventListener('click', () => {
      this.openAddAccountPage();
    });

    // Settings button
    this.elements.settingsBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('../index.html#/settings') });
    });

    // Scan QR button
    this.elements.scanQRBtn.addEventListener('click', () => {
      this.handleScanQR();
    });

    // Listen for account updates
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.accounts) {
        this.loadAccounts();
      }
    });

    // Listen for messages from background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'accountsUpdated') {
        this.loadAccounts();
      }
    });
  }

  async loadAccounts() {
    this.showLoading();

    try {
      // Get accounts from storage
      const data = await StorageService.getAccounts();
      this.accounts = data || [];
      this.filterAccounts();
    } catch (error) {
      console.error('Failed to load accounts:', error);
      this.showError();
    }
  }

  filterAccounts() {
    if (!this.searchQuery) {
      this.filteredAccounts = this.accounts;
    } else {
      this.filteredAccounts = this.accounts.filter(account => 
        account.issuer.toLowerCase().includes(this.searchQuery) ||
        account.accountName.toLowerCase().includes(this.searchQuery) ||
        (account.tags && account.tags.some(tag => tag.toLowerCase().includes(this.searchQuery)))
      );
    }

    this.render();
  }

  render() {
    // Hide loading
    this.elements.loadingState.classList.add('hidden');

    // Check if empty
    if (this.filteredAccounts.length === 0) {
      this.elements.accountsList.classList.add('hidden');
      this.elements.emptyState.classList.remove('hidden');
      return;
    }

    // Show accounts
    this.elements.emptyState.classList.add('hidden');
    this.elements.accountsList.classList.remove('hidden');
    
    // Render accounts
    this.elements.accountsList.innerHTML = this.filteredAccounts
      .map(account => this.renderAccount(account))
      .join('');

    // Add click handlers
    this.filteredAccounts.forEach(account => {
      const element = document.getElementById(`account-${account.id}`);
      if (element) {
        element.addEventListener('click', () => this.copyCode(account));
      }
    });

    // Update codes immediately
    this.updateAllCodes();
  }

  renderAccount(account) {
    const code = OTPService.generateCode(account);
    const iconLetter = account.issuer.charAt(0).toUpperCase();

    return `
      <div class="account-item" id="account-${account.id}">
        <div class="account-icon">${iconLetter}</div>
        <div class="account-info">
          <div class="account-name">${this.escapeHtml(account.issuer)}</div>
          <div class="account-email">${this.escapeHtml(account.accountName)}</div>
        </div>
        <div class="account-code" id="code-${account.id}">
          ${this.formatCode(code.code)}
        </div>
        ${account.type === 'totp' ? this.renderTimer(account.id, code.remainingTime) : ''}
      </div>
    `;
  }

  renderTimer(accountId, remainingTime) {
    return `
      <div class="code-timer">
        <svg width="28" height="28" viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="12" fill="none" stroke="#e0e0e0" stroke-width="2" />
          <circle 
            id="timer-${accountId}"
            cx="14" cy="14" r="12" 
            fill="none" 
            stroke="#0066cc" 
            stroke-width="2"
            stroke-dasharray="75.4"
            stroke-dashoffset="0"
            stroke-linecap="round"
          />
        </svg>
        <span class="code-timer-text" id="timer-text-${accountId}">${remainingTime || 30}</span>
      </div>
    `;
  }

  formatCode(code) {
    if (!code) return '------';
    const mid = Math.ceil(code.length / 2);
    return `${code.slice(0, mid)} ${code.slice(mid)}`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async copyCode(account) {
    const code = OTPService.generateCode(account);
    
    try {
      await navigator.clipboard.writeText(code.code);
      
      // Show success feedback
      const element = document.getElementById(`account-${account.id}`);
      element.style.background = '#e8f5e9';
      setTimeout(() => {
        element.style.background = '';
      }, 500);

      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '../assets/icon-48.png',
        title: '2FA Code Copied',
        message: `Code for ${account.issuer} copied to clipboard`
      });

      // Auto-fill if possible
      this.tryAutoFill(code.code);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  }

  async tryAutoFill(code) {
    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Send message to content script
      chrome.tabs.sendMessage(tab.id, {
        action: 'fillCode',
        code: code
      });
    } catch (error) {
      console.error('Failed to auto-fill:', error);
    }
  }

  startCodeUpdates() {
    // Update every second
    setInterval(() => {
      this.updateAllCodes();
    }, 1000);
  }

  updateAllCodes() {
    this.filteredAccounts.forEach(account => {
      if (account.type === 'totp') {
        this.updateTOTPCode(account);
      }
    });
  }

  updateTOTPCode(account) {
    const code = OTPService.generateCode(account);
    
    // Update code display
    const codeElement = document.getElementById(`code-${account.id}`);
    if (codeElement) {
      codeElement.textContent = this.formatCode(code.code);
    }

    // Update timer
    const timerElement = document.getElementById(`timer-${account.id}`);
    const timerTextElement = document.getElementById(`timer-text-${account.id}`);
    
    if (timerElement && timerTextElement) {
      const progress = code.remainingTime / (account.period || 30);
      const offset = 75.4 * (1 - progress);
      
      timerElement.style.strokeDashoffset = offset;
      timerTextElement.textContent = code.remainingTime;
    }
  }

  openAddAccountPage() {
    chrome.tabs.create({ 
      url: chrome.runtime.getURL('../index.html#/accounts?action=add') 
    });
  }

  showLoading() {
    this.elements.loadingState.classList.remove('hidden');
    this.elements.accountsList.classList.add('hidden');
    this.elements.emptyState.classList.add('hidden');
  }

  showError() {
    this.elements.loadingState.classList.add('hidden');
    this.elements.accountsList.classList.add('hidden');
    this.elements.emptyState.classList.remove('hidden');
  }

  async handleScanQR() {
    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // First, try to detect QR codes automatically
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'scanQRCodes'
      });
      
      if (response && response.count > 0) {
        // QR codes found and buttons added
        window.close(); // Close popup to let user interact with page
      } else {
        // No QR codes found automatically, enable manual selection
        chrome.tabs.sendMessage(tab.id, {
          action: 'enableQRSelection'
        });
        window.close();
      }
    } catch (error) {
      console.error('Failed to scan QR codes:', error);
      
      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '../assets/icon-48.png',
        title: 'QR Scan Failed',
        message: 'Unable to scan QR codes on this page'
      });
    }
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});