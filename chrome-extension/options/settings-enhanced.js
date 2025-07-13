/**
 * Enhanced Settings Page Script
 * @module settings-enhanced
 */

class SettingsManager {
  constructor() {
    this.currentSection = 'security';
    this.settings = {};
    this.init();
  }

  async init() {
    // Load current settings
    await this.loadSettings();
    
    // Set up navigation
    this.setupNavigation();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Initialize sections
    this.initializeSecuritySection();
    this.initializeSyncSection();
    this.initializeMobileSection();
    this.initializeNotificationsSection();
    this.initializeGeneralSection();
  }

  async loadSettings() {
    try {
      this.settings = await chrome.storage.local.get(null);
      this.applySettingsToUI();
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  applySettingsToUI() {
    // Apply all settings to UI elements
    Object.keys(this.settings).forEach(key => {
      const element = document.getElementById(key);
      if (element) {
        if (element.type === 'checkbox') {
          element.checked = this.settings[key];
        } else if (element.tagName === 'SELECT' || element.type === 'text') {
          element.value = this.settings[key];
        }
      }
    });
  }

  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const section = item.dataset.section;
        this.switchSection(section);
      });
    });

    // Close button
    document.getElementById('closeBtn').addEventListener('click', () => {
      window.close();
    });
  }

  switchSection(section) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.section === section);
    });

    // Update content
    document.querySelectorAll('.settings-section').forEach(sec => {
      sec.classList.toggle('active', sec.id === `${section}-section`);
    });

    this.currentSection = section;
  }

  setupEventListeners() {
    // Auto-save settings on change
    document.addEventListener('change', async (e) => {
      if (e.target.matches('input[type="checkbox"], select')) {
        await this.saveSetting(e.target.id, e.target.type === 'checkbox' ? e.target.checked : e.target.value);
      }
    });
  }

  async saveSetting(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
      this.settings[key] = value;
      console.log(`Saved ${key}:`, value);
      
      // Handle specific settings that need immediate action
      if (key === 'syncEnabled') {
        await this.handleSyncToggle(value);
      } else if (key === 'autoLockEnabled') {
        await this.handleAutoLockToggle(value);
      }
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
    }
  }

  // Security Section
  initializeSecuritySection() {
    const pinEnabled = document.getElementById('pinEnabled');
    const pinSettings = document.getElementById('pinSettings');
    const setPinBtn = document.getElementById('setPinBtn');
    const changePinBtn = document.getElementById('changePinBtn');
    const autoLockEnabled = document.getElementById('autoLockEnabled');
    const autoLockSettings = document.getElementById('autoLockSettings');

    // Check if PIN is already set
    this.checkPinStatus();

    pinEnabled.addEventListener('change', async (e) => {
      if (e.target.checked) {
        pinSettings.classList.remove('hidden');
        if (!this.settings.extensionPinHash) {
          this.showSetPinDialog();
        }
      } else {
        // Confirm PIN removal
        if (this.settings.extensionPinHash) {
          const confirmed = confirm('This will remove your PIN. Continue?');
          if (confirmed) {
            await this.removePin();
          } else {
            e.target.checked = true;
          }
        }
        pinSettings.classList.add('hidden');
      }
    });

    setPinBtn.addEventListener('click', () => this.showSetPinDialog());
    changePinBtn.addEventListener('click', () => this.showChangePinDialog());

    autoLockEnabled.addEventListener('change', (e) => {
      autoLockSettings.classList.toggle('hidden', !e.target.checked);
    });

    // Show/hide auto-lock settings based on current state
    if (this.settings.autoLockEnabled) {
      autoLockSettings.classList.remove('hidden');
    }
  }

  async checkPinStatus() {
    const response = await chrome.runtime.sendMessage({ action: 'isPinEnabled' });
    if (response && response.enabled) {
      document.getElementById('setPinBtn').classList.add('hidden');
      document.getElementById('changePinBtn').classList.remove('hidden');
    }
  }

  async showSetPinDialog() {
    const pin = prompt('Enter a new PIN (minimum 4 characters):');
    if (pin && pin.length >= 4) {
      const confirmPin = prompt('Confirm your PIN:');
      if (pin === confirmPin) {
        const response = await chrome.runtime.sendMessage({
          action: 'setExtensionPin',
          pin: pin
        });
        
        if (response.success) {
          alert('PIN set successfully!');
          document.getElementById('setPinBtn').classList.add('hidden');
          document.getElementById('changePinBtn').classList.remove('hidden');
          document.getElementById('pinEnabled').checked = true;
        } else {
          alert('Failed to set PIN: ' + response.error);
        }
      } else {
        alert('PINs do not match!');
      }
    }
  }

  async showChangePinDialog() {
    const currentPin = prompt('Enter current PIN:');
    if (currentPin) {
      const response = await chrome.runtime.sendMessage({
        action: 'verifyExtensionPin',
        pin: currentPin
      });
      
      if (response.success) {
        this.showSetPinDialog();
      } else {
        alert('Invalid PIN');
      }
    }
  }

  async removePin() {
    const response = await chrome.runtime.sendMessage({
      action: 'removeExtensionPin'
    });
    
    if (response.success) {
      document.getElementById('setPinBtn').classList.remove('hidden');
      document.getElementById('changePinBtn').classList.add('hidden');
      document.getElementById('pinEnabled').checked = false;
      document.getElementById('pinSettings').classList.add('hidden');
    }
  }

  // Sync Section
  initializeSyncSection() {
    const syncEnabled = document.getElementById('syncEnabled');
    const syncStatus = document.getElementById('syncStatus');
    const syncNowBtn = document.getElementById('syncNowBtn');
    const exportSyncBtn = document.getElementById('exportSyncBtn');
    const importSyncBtn = document.getElementById('importSyncBtn');

    this.updateSyncStatus();

    syncNowBtn.addEventListener('click', async () => {
      syncNowBtn.disabled = true;
      syncNowBtn.textContent = 'Syncing...';
      
      // Trigger sync
      await chrome.runtime.sendMessage({ action: 'syncNow' });
      
      setTimeout(() => {
        syncNowBtn.disabled = false;
        syncNowBtn.textContent = 'Sync Now';
        this.updateSyncStatus();
      }, 2000);
    });

    exportSyncBtn.addEventListener('click', async () => {
      const response = await chrome.runtime.sendMessage({ action: 'exportSyncData' });
      if (response.success) {
        const dataStr = JSON.stringify(response.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `2fa-studio-settings-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    });

    importSyncBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const data = JSON.parse(event.target.result);
              const response = await chrome.runtime.sendMessage({
                action: 'importSyncData',
                data: data
              });
              
              if (response.success) {
                alert('Settings imported successfully!');
                this.loadSettings();
              } else {
                alert('Failed to import settings: ' + response.error);
              }
            } catch (error) {
              alert('Invalid settings file');
            }
          };
          reader.readAsText(file);
        }
      };
      input.click();
    });
  }

  async updateSyncStatus() {
    const response = await chrome.runtime.sendMessage({ action: 'getSyncStatus' });
    if (response.success) {
      const syncStatus = document.getElementById('syncStatus');
      const lastSyncTime = document.getElementById('lastSyncTime');
      const syncNowBtn = document.getElementById('syncNowBtn');
      
      if (response.enabled) {
        syncStatus.classList.remove('hidden');
        syncNowBtn.disabled = false;
        
        if (response.lastSyncTime) {
          const date = new Date(response.lastSyncTime);
          lastSyncTime.textContent = date.toLocaleString();
        }
      } else {
        syncStatus.classList.add('hidden');
        syncNowBtn.disabled = true;
      }
    }
  }

  async handleSyncToggle(enabled) {
    const action = enabled ? 'enableSync' : 'disableSync';
    const response = await chrome.runtime.sendMessage({ action });
    
    if (response.success) {
      this.updateSyncStatus();
    } else {
      // Revert toggle
      document.getElementById('syncEnabled').checked = !enabled;
      alert('Failed to ' + (enabled ? 'enable' : 'disable') + ' sync: ' + response.error);
    }
  }

  // Mobile Section
  initializeMobileSection() {
    const pairMobileBtn = document.getElementById('pairMobileBtn');
    const unpairBtn = document.getElementById('unpairBtn');
    const closePairingBtn = document.getElementById('closePairingBtn');
    const pairingModal = document.getElementById('pairingModal');

    this.updateMobileStatus();

    pairMobileBtn.addEventListener('click', () => {
      this.showPairingModal();
    });

    unpairBtn.addEventListener('click', async () => {
      const confirmed = confirm('This will disconnect your mobile device. Continue?');
      if (confirmed) {
        const response = await chrome.runtime.sendMessage({ action: 'unpairMobile' });
        if (response.success) {
          this.updateMobileStatus();
        }
      }
    });

    closePairingBtn.addEventListener('click', () => {
      pairingModal.classList.add('hidden');
    });
  }

  async updateMobileStatus() {
    const response = await chrome.runtime.sendMessage({ action: 'getMobileStatus' });
    if (response.success) {
      const notPaired = document.getElementById('notPaired');
      const paired = document.getElementById('paired');
      
      if (response.paired) {
        notPaired.classList.add('hidden');
        paired.classList.remove('hidden');
        
        document.getElementById('deviceId').textContent = response.deviceId || 'Unknown';
        if (response.pairedAt) {
          const date = new Date(response.pairedAt);
          document.getElementById('pairedDate').textContent = date.toLocaleString();
        }
      } else {
        notPaired.classList.remove('hidden');
        paired.classList.add('hidden');
      }
    }
  }

  showPairingModal() {
    const modal = document.getElementById('pairingModal');
    const pairingCode = this.generatePairingCode();
    
    document.getElementById('pairingCode').textContent = pairingCode;
    
    // Generate QR code (using a placeholder for now)
    const qrContainer = document.getElementById('pairingQR');
    qrContainer.innerHTML = `
      <div style="padding: 20px; background: #f0f0f0; border-radius: 8px;">
        <p style="color: #666;">QR Code for: ${pairingCode}</p>
      </div>
    `;
    
    modal.classList.remove('hidden');
    
    // Simulate pairing process
    setTimeout(async () => {
      // In real implementation, this would wait for mobile app confirmation
      const response = await chrome.runtime.sendMessage({
        action: 'pairWithMobile',
        pairingCode: pairingCode
      });
      
      if (response.success) {
        modal.classList.add('hidden');
        this.updateMobileStatus();
        alert('Successfully paired with mobile device!');
      }
    }, 5000);
  }

  generatePairingCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Notifications Section
  initializeNotificationsSection() {
    // Badge settings update
    document.getElementById('showAccountCount').addEventListener('change', async () => {
      await chrome.runtime.sendMessage({ action: 'updateBadge' });
    });
  }

  // General Section
  initializeGeneralSection() {
    const exportDataBtn = document.getElementById('exportDataBtn');
    const importDataBtn = document.getElementById('importDataBtn');
    const clearDataBtn = document.getElementById('clearDataBtn');

    exportDataBtn.addEventListener('click', async () => {
      // Export all data
      const allData = await chrome.storage.local.get(null);
      const dataStr = JSON.stringify(allData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `2fa-studio-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    importDataBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const data = JSON.parse(event.target.result);
              
              const confirmed = confirm('This will replace all existing data. Continue?');
              if (confirmed) {
                await chrome.storage.local.clear();
                await chrome.storage.local.set(data);
                alert('Data imported successfully!');
                this.loadSettings();
              }
            } catch (error) {
              alert('Invalid backup file');
            }
          };
          reader.readAsText(file);
        }
      };
      input.click();
    });

    clearDataBtn.addEventListener('click', async () => {
      const confirmed = confirm('This will delete ALL your 2FA accounts and settings. This cannot be undone!\n\nAre you sure?');
      if (confirmed) {
        const doubleConfirmed = confirm('Are you REALLY sure? All data will be permanently deleted.');
        if (doubleConfirmed) {
          await chrome.storage.local.clear();
          alert('All data has been cleared.');
          window.close();
        }
      }
    });
  }

  async handleAutoLockToggle(enabled) {
    if (enabled) {
      const timeout = document.getElementById('autoLockTimeout').value;
      await chrome.runtime.sendMessage({
        action: 'setAutoLockTimeout',
        minutes: parseInt(timeout)
      });
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new SettingsManager();
});