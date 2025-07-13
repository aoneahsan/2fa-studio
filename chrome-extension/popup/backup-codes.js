/**
 * Backup Codes Management UI
 */

import backupCodesService from '../src/backup-codes.js';
import { StorageService } from '../src/storage.js';

class BackupCodesManager {
  constructor() {
    this.currentAccountId = null;
    this.currentAccount = null;
    this.init();
  }

  async init() {
    // Get DOM elements
    this.elements = {
      accountSelect: document.getElementById('accountSelect'),
      noAccountState: document.getElementById('noAccountState'),
      loadingState: document.getElementById('loadingState'),
      backupCodesView: document.getElementById('backupCodesView'),
      
      // Stats
      remainingCount: document.getElementById('remainingCount'),
      usedCount: document.getElementById('usedCount'),
      totalCount: document.getElementById('totalCount'),
      lowCodesWarning: document.getElementById('lowCodesWarning'),
      
      // Code states
      noCodesState: document.getElementById('noCodesState'),
      codesList: document.getElementById('codesList'),
      codesContainer: document.getElementById('codesContainer'),
      codesActions: document.getElementById('codesActions'),
      
      // Buttons
      backBtn: document.getElementById('backBtn'),
      helpBtn: document.getElementById('helpBtn'),
      generateFirstBtn: document.getElementById('generateFirstBtn'),
      exportTextBtn: document.getElementById('exportTextBtn'),
      printBtn: document.getElementById('printBtn'),
      regenerateBtn: document.getElementById('regenerateBtn'),
      
      // Validate
      validateForm: document.getElementById('validateForm'),
      codeInput: document.getElementById('codeInput'),
      validateBtn: document.getElementById('validateBtn'),
      validateResult: document.getElementById('validateResult'),
      
      // Modal
      helpModal: document.getElementById('helpModal'),
      closeHelpBtn: document.getElementById('closeHelpBtn')
    };

    // Load accounts
    await this.loadAccounts();

    // Setup event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Account selection
    this.elements.accountSelect.addEventListener('change', (e) => {
      this.selectAccount(e.target.value);
    });

    // Buttons
    this.elements.backBtn.addEventListener('click', () => {
      window.close();
    });

    this.elements.helpBtn.addEventListener('click', () => {
      this.showHelp();
    });

    this.elements.generateFirstBtn.addEventListener('click', () => {
      this.generateCodes();
    });

    this.elements.exportTextBtn.addEventListener('click', () => {
      this.exportAsText();
    });

    this.elements.printBtn.addEventListener('click', () => {
      this.printCodes();
    });

    this.elements.regenerateBtn.addEventListener('click', () => {
      this.regenerateCodes();
    });

    // Validate form
    this.elements.validateForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.validateCode();
    });

    // Format code input
    this.elements.codeInput.addEventListener('input', (e) => {
      this.formatCodeInput(e.target);
    });

    // Modal
    this.elements.closeHelpBtn.addEventListener('click', () => {
      this.hideHelp();
    });

    this.elements.helpModal.addEventListener('click', (e) => {
      if (e.target === this.elements.helpModal) {
        this.hideHelp();
      }
    });
  }

  async loadAccounts() {
    try {
      const accounts = await StorageService.getAccounts();
      
      // Clear and populate select
      this.elements.accountSelect.innerHTML = '<option value="">Choose an account...</option>';
      
      accounts.forEach(account => {
        const option = document.createElement('option');
        option.value = account.id;
        option.textContent = `${account.issuer} (${account.accountName})`;
        this.elements.accountSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  }

  async selectAccount(accountId) {
    if (!accountId) {
      this.currentAccountId = null;
      this.currentAccount = null;
      this.showNoAccountState();
      return;
    }

    this.showLoading();
    
    try {
      // Get account details
      const accounts = await StorageService.getAccounts();
      this.currentAccount = accounts.find(a => a.id === accountId);
      this.currentAccountId = accountId;
      
      if (!this.currentAccount) {
        throw new Error('Account not found');
      }
      
      // Load backup codes
      await this.loadBackupCodes();
    } catch (error) {
      console.error('Failed to select account:', error);
      this.showNoAccountState();
    }
  }

  async loadBackupCodes() {
    try {
      const codes = await backupCodesService.getBackupCodes(this.currentAccountId);
      const stats = await backupCodesService.getBackupCodeStats(this.currentAccountId);
      
      // Update stats
      this.elements.remainingCount.textContent = stats.remaining;
      this.elements.usedCount.textContent = stats.used;
      this.elements.totalCount.textContent = stats.total;
      
      // Show/hide warning
      this.elements.lowCodesWarning.classList.toggle('hidden', stats.remaining >= 3);
      
      // Show appropriate view
      this.elements.loadingState.classList.add('hidden');
      this.elements.noAccountState.classList.add('hidden');
      this.elements.backupCodesView.classList.remove('hidden');
      
      if (codes.length === 0) {
        this.showNoCodesState();
      } else {
        this.showCodesList(codes);
      }
    } catch (error) {
      console.error('Failed to load backup codes:', error);
    }
  }

  showNoAccountState() {
    this.elements.loadingState.classList.add('hidden');
    this.elements.backupCodesView.classList.add('hidden');
    this.elements.noAccountState.classList.remove('hidden');
  }

  showLoading() {
    this.elements.noAccountState.classList.add('hidden');
    this.elements.backupCodesView.classList.add('hidden');
    this.elements.loadingState.classList.remove('hidden');
  }

  showNoCodesState() {
    this.elements.noCodesState.classList.remove('hidden');
    this.elements.codesList.classList.add('hidden');
    this.elements.codesActions.classList.add('hidden');
  }

  showCodesList(codes) {
    this.elements.noCodesState.classList.add('hidden');
    this.elements.codesList.classList.remove('hidden');
    this.elements.codesActions.classList.remove('hidden');
    
    // Render codes
    this.elements.codesContainer.innerHTML = '';
    
    codes.forEach((code, index) => {
      const codeEl = document.createElement('div');
      codeEl.className = `code-item ${code.used ? 'used' : ''}`;
      codeEl.innerHTML = `
        <span class="code-number">#${index + 1}</span>
        <span class="code-text">${this.formatDisplayCode(code.code)}</span>
      `;
      
      if (!code.used) {
        codeEl.addEventListener('click', () => {
          this.copyCode(code.code);
        });
      }
      
      this.elements.codesContainer.appendChild(codeEl);
    });
  }

  formatDisplayCode(code) {
    // Format as XXXX-XXXX
    return code.slice(0, 4) + '-' + code.slice(4);
  }

  formatCodeInput(input) {
    let value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length > 4) {
      value = value.slice(0, 4) + '-' + value.slice(4);
    }
    input.value = value;
  }

  async generateCodes() {
    if (!this.currentAccountId) return;
    
    try {
      const codes = backupCodesService.generateBackupCodes();
      await backupCodesService.storeBackupCodes(this.currentAccountId, codes);
      
      // Show success
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('assets/icon-48.png'),
        title: 'Backup Codes Generated',
        message: `${codes.length} backup codes generated for ${this.currentAccount.issuer}`
      });
      
      // Reload codes
      await this.loadBackupCodes();
    } catch (error) {
      console.error('Failed to generate codes:', error);
      this.showError('Failed to generate backup codes');
    }
  }

  async regenerateCodes() {
    if (!this.currentAccountId) return;
    
    // Confirm regeneration
    if (!confirm('Are you sure? This will invalidate all existing backup codes.')) {
      return;
    }
    
    try {
      await backupCodesService.regenerateBackupCodes(this.currentAccountId);
      
      // Show success
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('assets/icon-48.png'),
        title: 'Backup Codes Regenerated',
        message: `New backup codes generated for ${this.currentAccount.issuer}`
      });
      
      // Reload codes
      await this.loadBackupCodes();
    } catch (error) {
      console.error('Failed to regenerate codes:', error);
      this.showError('Failed to regenerate backup codes');
    }
  }

  async exportAsText() {
    if (!this.currentAccountId || !this.currentAccount) return;
    
    try {
      const text = await backupCodesService.exportAsText(
        this.currentAccountId,
        this.currentAccount
      );
      
      // Create download
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-codes-${this.currentAccount.issuer}-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export codes:', error);
      this.showError('Failed to export backup codes');
    }
  }

  async printCodes() {
    if (!this.currentAccountId || !this.currentAccount) return;
    
    try {
      const blob = await backupCodesService.exportAsPDF(
        this.currentAccountId,
        this.currentAccount
      );
      
      // Open in new window for printing
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000);
    } catch (error) {
      console.error('Failed to print codes:', error);
      this.showError('Failed to print backup codes');
    }
  }

  async validateCode() {
    if (!this.currentAccountId) {
      this.showValidateResult('Please select an account first', 'error');
      return;
    }
    
    const code = this.elements.codeInput.value.replace(/[^A-Z0-9]/g, '');
    
    if (!code) {
      this.showValidateResult('Please enter a backup code', 'error');
      return;
    }
    
    try {
      const result = await backupCodesService.validateBackupCode(
        this.currentAccountId,
        code
      );
      
      if (result.valid) {
        this.showValidateResult(
          `✓ Valid code! ${result.remainingCount} codes remaining.` +
          (result.warning ? ` ${result.warning}` : ''),
          'success'
        );
        
        // Clear input
        this.elements.codeInput.value = '';
        
        // Reload codes
        await this.loadBackupCodes();
      } else {
        this.showValidateResult(result.error || 'Invalid code', 'error');
      }
    } catch (error) {
      console.error('Failed to validate code:', error);
      this.showValidateResult('Failed to validate code', 'error');
    }
  }

  showValidateResult(message, type) {
    this.elements.validateResult.textContent = message;
    this.elements.validateResult.className = `validate-result ${type}`;
    this.elements.validateResult.classList.remove('hidden');
    
    // Hide after 5 seconds
    setTimeout(() => {
      this.elements.validateResult.classList.add('hidden');
    }, 5000);
  }

  async copyCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      
      // Show feedback
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('assets/icon-48.png'),
        title: 'Code Copied',
        message: 'Backup code copied to clipboard'
      });
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  }

  showError(message) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('assets/icon-48.png'),
      title: 'Error',
      message: message
    });
  }

  showHelp() {
    this.elements.helpModal.classList.remove('hidden');
  }

  hideHelp() {
    this.elements.helpModal.classList.add('hidden');
  }
}

// Initialize
new BackupCodesManager();