/**
 * Chrome Extension Popup Script
 * @module popup
 */

import { StorageService } from '../src/storage.js';
import { OTPService } from '../src/otp.js';

class PopupManager {
  constructor() {
    this.accounts = [];
    this.filteredAccounts = [];
    this.matchedAccounts = [];
    this.passwords = [];
    this.searchQuery = '';
    this.timers = new Map();
    this.currentTab = null;
    this.currentDomain = '';
    this.showingDomainMatches = false;
    this.passwordManagerUnlocked = false;
    
    this.init();
  }

  async init() {
    // Check if extension is locked
    const lockStatus = await this.checkLockStatus();
    if (lockStatus.locked) {
      // Redirect to lock screen
      window.location.href = 'lock-screen.html';
      return;
    }

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
      filterDomainBtn: document.getElementById('filterDomainBtn'),
      // Password manager elements
      passwordSection: document.getElementById('passwordSection'),
      passwordsList: document.getElementById('passwordsList')
    };

    // Set up event listeners
    this.setupEventListeners();

    // Get current tab and check for domain matches
    await this.getCurrentTab();

    // Check password manager status
    await this.checkPasswordManagerStatus();

    // Load accounts
    await this.loadAccounts();

    // Load passwords if unlocked
    if (this.passwordManagerUnlocked) {
      await this.loadPasswords();
    }

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
      chrome.tabs.create({ url: 'https://2fa-studio.web.app' });
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
    chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
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

    // Show password section if we have saved passwords for this domain
    if (this.passwordManagerUnlocked && this.passwords.length > 0 && !this.searchQuery) {
      this.renderPasswordSection();
    } else {
      this.elements.passwordSection.classList.add('hidden');
    }

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
    
    // Render accounts asynchronously
    Promise.all(this.filteredAccounts.map(account => this.renderAccount(account)))
      .then(html => {
        this.elements.accountsList.innerHTML = html.join('');
      });

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

  renderPasswordSection() {
    this.elements.passwordSection.classList.remove('hidden');
    
    // Create combo items showing password + matching 2FA accounts
    const comboItems = this.passwords.map(password => {
      const matching2FA = this.matchedAccounts.filter(account => 
        this.passwordMatchesAccount(password, account)
      );
      
      return {
        password: password,
        accounts: matching2FA
      };
    });

    this.elements.passwordsList.innerHTML = comboItems
      .map(combo => this.renderPasswordCombo(combo))
      .join('');

    // Add click handlers
    comboItems.forEach(combo => {
      // Password-only button
      const passwordBtn = document.getElementById(`password-${combo.password.id}`);
      if (passwordBtn) {
        passwordBtn.addEventListener('click', () => this.fillPassword(combo.password.id));
      }

      // Combined buttons
      combo.accounts.forEach(account => {
        const comboBtn = document.getElementById(`combo-${combo.password.id}-${account.id}`);
        if (comboBtn) {
          comboBtn.addEventListener('click', () => this.fillBothCredentials(combo.password.id, account.id));
        }
      });
    });
  }

  renderPasswordCombo(combo) {
    const password = combo.password;
    const iconLetter = password.username.charAt(0).toUpperCase();
    
    let accountButtons = '';
    if (combo.accounts.length > 0) {
      accountButtons = combo.accounts.map(account => `
        <button class="combo-btn" id="combo-${password.id}-${account.id}" title="Fill password + ${account.issuer} 2FA">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"></path>
          </svg>
          ${account.issuer}
        </button>
      `).join('');
    }

    return `
      <div class="password-combo-item">
        <div class="password-info">
          <div class="password-icon">${iconLetter}</div>
          <div class="password-details">
            <div class="password-username">${this.escapeHtml(password.username)}</div>
            <div class="password-domain">${this.escapeHtml(password.domain)}</div>
          </div>
        </div>
        <div class="password-actions">
          <button class="password-btn" id="password-${password.id}" title="Fill password only">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <circle cx="12" cy="16" r="1"></circle>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            Password
          </button>
          ${accountButtons}
        </div>
      </div>
    `;
  }

  passwordMatchesAccount(password, account) {
    const passwordDomain = this.normalizeDomain(password.domain);
    const accountIssuer = account.issuer.toLowerCase();
    
    // Check if the account issuer matches the password domain
    return (
      accountIssuer.includes(passwordDomain) ||
      passwordDomain.includes(accountIssuer.replace(/\s+/g, ''))
    );
  }

  normalizeDomain(domain) {
    if (!domain) return '';
    return domain.toLowerCase().replace(/^www\./, '').replace(/:\d+$/, '');
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

  async renderAccount(account) {
    const code = await OTPService.generateCode(account);
    const iconLetter = account.issuer.charAt(0).toUpperCase();
    const isSteam = account.type === 'steam';

    return `
      <div class="account-item ${isSteam ? 'steam-account' : ''}" id="account-${account.id}">
        <div class="account-icon ${isSteam ? 'steam-icon' : ''}">${iconLetter}</div>
        <div class="account-info">
          <div class="account-name">${this.escapeHtml(account.issuer)}</div>
          <div class="account-email">${this.escapeHtml(account.accountName)}</div>
        </div>
        <div class="account-code ${isSteam ? 'steam-code' : ''}" id="code-${account.id}">
          ${this.formatCode(code.code, isSteam)}
        </div>
        ${account.type === 'totp' || account.type === 'steam' ? this.renderTimer(account.id, code.remainingTime) : ''}
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

  formatCode(code, isSteam = false) {
    if (!code) return isSteam ? '-----' : '------';
    
    // Steam codes don't need formatting (5 chars)
    if (isSteam) {
      return code;
    }
    
    // Standard codes get split in middle
    const mid = Math.ceil(code.length / 2);
    return `${code.slice(0, mid)} ${code.slice(mid)}`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async copyAndFillCode(account) {
    const code = await OTPService.generateCode(account);
    
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
      if (account.type === 'totp' || account.type === 'steam') {
        this.updateTOTPCode(account);
      }
    });
  }

  updateMatchedAccountsCodes() {
    this.matchedAccounts.forEach(account => {
      if (account.type === 'totp' || account.type === 'steam') {
        this.updateMatchedTOTPCode(account);
      }
    });
  }

  async updateTOTPCode(account) {
    const code = await OTPService.generateCode(account);
    
    // Update code display
    const codeElement = document.getElementById(`code-${account.id}`);
    if (codeElement) {
      codeElement.textContent = this.formatCode(code.code, account.type === 'steam');
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

  async updateMatchedTOTPCode(account) {
    const code = await OTPService.generateCode(account);
    
    // Update code display for matched accounts
    const codeElement = document.getElementById(`matched-code-${account.id}`);
    if (codeElement) {
      codeElement.textContent = this.formatCode(code.code, account.type === 'steam');
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

  // Password Manager Methods
  async checkPasswordManagerStatus() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'isPasswordManagerUnlocked'
      });
      
      if (response.success) {
        this.passwordManagerUnlocked = response.isUnlocked;
      }
    } catch (error) {
      console.error('Failed to check password manager status:', error);
    }
  }

  async loadPasswords() {
    if (!this.passwordManagerUnlocked || !this.currentDomain) return;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getPasswordsForDomain',
        domain: this.currentDomain
      });
      
      if (response.success) {
        this.passwords = response.passwords || [];
      }
    } catch (error) {
      console.error('Failed to load passwords:', error);
    }
  }

  async fillBothCredentials(passwordId, accountId) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'fillBothCredentials',
        passwordId: passwordId,
        accountId: accountId
      });

      if (response.success) {
        // Show success feedback
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '../assets/icon-48.png',
          title: 'Credentials Filled',
          message: 'Both password and 2FA code have been filled'
        });

        // Close popup after successful fill
        setTimeout(() => {
          window.close();
        }, 500);
      } else {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '../assets/icon-48.png',
          title: 'Fill Failed',
          message: response.error || 'Failed to fill credentials'
        });
      }
    } catch (error) {
      console.error('Failed to fill both credentials:', error);
    }
  }

  async fillPassword(passwordId) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'fillLoginForm',
        passwordId: passwordId
      });

      if (response.success) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '../assets/icon-48.png',
          title: 'Password Filled',
          message: 'Login credentials have been filled'
        });

        setTimeout(() => {
          window.close();
        }, 500);
      } else {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '../assets/icon-48.png',
          title: 'Fill Failed',
          message: response.error || 'Failed to fill password'
        });
      }
    } catch (error) {
      console.error('Failed to fill password:', error);
    }
  }

  async checkLockStatus() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'isExtensionLocked'
      });
      
      return { locked: response.success ? response.locked : false };
    } catch (error) {
      console.error('Failed to check lock status:', error);
      return { locked: false };
    }
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});