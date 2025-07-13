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
    this.matchedAccounts = [];
    this.searchQuery = '';
    this.timers = new Map();
    this.currentTab = null;
    this.currentDomain = '';
    this.showingDomainMatches = false;
    
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
      scanQRBtn: document.getElementById('scanQRBtn'),
      // New elements for domain matching
      domainMatches: document.getElementById('domainMatches'),
      currentDomainSpan: document.getElementById('currentDomain'),
      matchedAccountsList: document.getElementById('matchedAccountsList'),
      viewAllBtn: document.getElementById('viewAllBtn'),
      filterDomainBtn: document.getElementById('filterDomainBtn')
    };

    // Set up event listeners
    this.setupEventListeners();

    // Get current tab and check for domain matches
    await this.getCurrentTab();

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

    // View all accounts button
    this.elements.viewAllBtn.addEventListener('click', () => {
      this.showAllAccounts();
    });

    // Filter by domain button
    this.elements.filterDomainBtn.addEventListener('click', () => {
      this.toggleDomainFilter();
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

  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
      
      if (tab && tab.url) {
        const url = new URL(tab.url);
        this.currentDomain = url.hostname;
        
        // Update domain display
        if (this.elements.currentDomainSpan) {
          this.elements.currentDomainSpan.textContent = this.currentDomain;
        }
      }
    } catch (error) {
      console.error('Failed to get current tab:', error);
    }
  }

  findDomainMatches() {
    if (!this.currentDomain || !this.accounts.length) {
      return [];
    }

    return this.accounts.filter(account => {
      const issuerLower = account.issuer.toLowerCase();
      const domainLower = this.currentDomain.toLowerCase();
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
      'google': ['gmail.com', 'google.com', 'accounts.google.com'],
      'microsoft': ['outlook.com', 'live.com', 'hotmail.com', 'microsoft.com'],
      'github': ['github.com'],
      'amazon': ['amazon.com', 'aws.amazon.com'],
      'facebook': ['facebook.com', 'fb.com'],
      'twitter': ['twitter.com', 'x.com'],
      'discord': ['discord.com', 'discordapp.com'],
      'slack': ['slack.com'],
      'netflix': ['netflix.com'],
      'dropbox': ['dropbox.com']
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

  async loadAccounts() {
    this.showLoading();

    try {
      // Get accounts from storage
      const data = await StorageService.getAccounts();
      this.accounts = data || [];
      
      // Find domain matches
      this.matchedAccounts = this.findDomainMatches();
      
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

    // Check if we should show domain matches first
    if (this.matchedAccounts.length > 0 && !this.showingDomainMatches && !this.searchQuery) {
      this.renderDomainMatches();
      return;
    }

    // Hide domain matches if showing all accounts
    this.elements.domainMatches.classList.add('hidden');

    // Show filter button if we have domain matches
    if (this.matchedAccounts.length > 0) {
      this.elements.filterDomainBtn.classList.remove('hidden');
    } else {
      this.elements.filterDomainBtn.classList.add('hidden');
    }

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
        element.addEventListener('click', () => this.copyAndFillCode(account));
      }
    });

    // Update codes immediately
    this.updateAllCodes();
  }

  renderDomainMatches() {
    this.elements.domainMatches.classList.remove('hidden');
    this.elements.accountsList.classList.add('hidden');
    this.elements.emptyState.classList.add('hidden');

    // Render matched accounts
    this.elements.matchedAccountsList.innerHTML = this.matchedAccounts
      .map(account => this.renderMatchedAccount(account))
      .join('');

    // Add click handlers for matched accounts
    this.matchedAccounts.forEach(account => {
      const element = document.getElementById(`matched-account-${account.id}`);
      if (element) {
        element.addEventListener('click', () => this.copyAndFillCode(account));
      }
    });

    // Update codes for matched accounts
    this.updateMatchedAccountsCodes();
  }

  renderMatchedAccount(account) {
    const code = OTPService.generateCode(account);
    const iconLetter = account.issuer.charAt(0).toUpperCase();

    return `
      <div class="matched-account-item" id="matched-account-${account.id}">
        <div class="account-icon">${iconLetter}</div>
        <div class="account-info">
          <div class="account-name">${this.escapeHtml(account.issuer)}</div>
          <div class="account-email">${this.escapeHtml(account.accountName)}</div>
        </div>
        <div class="account-code" id="matched-code-${account.id}">
          ${this.formatCode(code.code)}
        </div>
        ${account.type === 'totp' ? this.renderMatchedTimer(account.id, code.remainingTime) : ''}
      </div>
    `;
  }

  renderMatchedTimer(accountId, remainingTime) {
    return `
      <div class="code-timer">
        <svg width="28" height="28" viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="12" fill="none" stroke="#e0e0e0" stroke-width="2" />
          <circle 
            id="matched-timer-${accountId}"
            cx="14" cy="14" r="12" 
            fill="none" 
            stroke="#0066cc" 
            stroke-width="2"
            stroke-dasharray="75.4"
            stroke-dashoffset="0"
            stroke-linecap="round"
          />
        </svg>
        <span class="code-timer-text" id="matched-timer-text-${accountId}">${remainingTime || 30}</span>
      </div>
    `;
  }

  showAllAccounts() {
    this.showingDomainMatches = true;
    this.render();
  }

  toggleDomainFilter() {
    if (this.showingDomainMatches) {
      // Show domain matches
      this.showingDomainMatches = false;
      this.render();
    } else {
      // Filter to show only domain matches
      this.filteredAccounts = this.matchedAccounts;
      this.render();
    }
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

  async copyAndFillCode(account) {
    const code = OTPService.generateCode(account);
    
    try {
      await navigator.clipboard.writeText(code.code);
      
      // Show success feedback for both normal and matched accounts
      const element = document.getElementById(`account-${account.id}`) || 
                    document.getElementById(`matched-account-${account.id}`);
      if (element) {
        element.style.background = '#e8f5e9';
        setTimeout(() => {
          element.style.background = '';
        }, 500);
      }

      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '../assets/icon-48.png',
        title: '2FA Code Copied & Filled',
        message: `Code for ${account.issuer} copied and auto-filled`
      });

      // Auto-fill the code
      this.tryAutoFill(code.code);
      
      // Close popup after successful fill
      setTimeout(() => {
        window.close();
      }, 500);
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
      this.updateMatchedAccountsCodes();
    }, 1000);
  }

  updateAllCodes() {
    this.filteredAccounts.forEach(account => {
      if (account.type === 'totp') {
        this.updateTOTPCode(account);
      }
    });
  }

  updateMatchedAccountsCodes() {
    this.matchedAccounts.forEach(account => {
      if (account.type === 'totp') {
        this.updateMatchedTOTPCode(account);
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

  updateMatchedTOTPCode(account) {
    const code = OTPService.generateCode(account);
    
    // Update code display for matched accounts
    const codeElement = document.getElementById(`matched-code-${account.id}`);
    if (codeElement) {
      codeElement.textContent = this.formatCode(code.code);
    }

    // Update timer for matched accounts
    const timerElement = document.getElementById(`matched-timer-${account.id}`);
    const timerTextElement = document.getElementById(`matched-timer-text-${account.id}`);
    
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