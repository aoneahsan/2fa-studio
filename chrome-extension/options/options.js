/**
 * Options Page Script
 * @module options
 */

import { StorageService } from '../src/storage.js';

class OptionsManager {
  constructor() {
    this.settings = {};
    this.init();
  }

  async init() {
    // Load current settings
    await this.loadSettings();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Update UI
    this.updateUI();
    
    // Update version
    this.updateVersion();
  }

  async loadSettings() {
    try {
      this.settings = await StorageService.getSettings() || {
        autoFillEnabled: true,
        autoSubmit: false,
        detectQRCodes: true,
        lockOnClose: false,
        autoLockTime: 0,
        theme: 'system',
        showAccountIcons: true,
        syncEnabled: false
      };
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  setupEventListeners() {
    // Save button
    document.getElementById('saveBtn').addEventListener('click', () => {
      this.saveSettings();
    });

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => {
      this.resetSettings();
    });

    // Configure shortcuts button
    document.getElementById('configureShortcuts').addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('options/shortcuts.html') });
    });

    // Connect app button
    document.getElementById('connectApp').addEventListener('click', () => {
      this.connectToApp();
    });

    // Links
    document.getElementById('privacyLink').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://2fastudio.com/privacy' });
    });

    document.getElementById('supportLink').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://2fastudio.com/support' });
    });

    document.getElementById('githubLink').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://github.com/2fastudio' });
    });

    // Theme change
    document.getElementById('theme').addEventListener('change', (e) => {
      this.applyTheme(e.target.value);
    });
  }

  updateUI() {
    // Update form fields
    document.getElementById('autoFillEnabled').checked = this.settings.autoFillEnabled;
    document.getElementById('autoSubmit').checked = this.settings.autoSubmit;
    document.getElementById('detectQRCodes').checked = this.settings.detectQRCodes;
    document.getElementById('lockOnClose').checked = this.settings.lockOnClose;
    document.getElementById('autoLockTime').value = this.settings.autoLockTime;
    document.getElementById('theme').value = this.settings.theme;
    document.getElementById('showAccountIcons').checked = this.settings.showAccountIcons;
    document.getElementById('syncEnabled').checked = this.settings.syncEnabled;

    // Update sync status
    this.updateSyncStatus();

    // Update keyboard shortcuts
    this.updateKeyboardShortcuts();
  }

  async saveSettings() {
    try {
      // Get form values
      this.settings = {
        autoFillEnabled: document.getElementById('autoFillEnabled').checked,
        autoSubmit: document.getElementById('autoSubmit').checked,
        detectQRCodes: document.getElementById('detectQRCodes').checked,
        lockOnClose: document.getElementById('lockOnClose').checked,
        autoLockTime: parseInt(document.getElementById('autoLockTime').value),
        theme: document.getElementById('theme').value,
        showAccountIcons: document.getElementById('showAccountIcons').checked,
        syncEnabled: document.getElementById('syncEnabled').checked
      };

      // Save to storage
      await StorageService.setSettings(this.settings);

      // Show success message
      this.showNotification('Settings saved successfully!', 'success');

      // Update theme immediately
      this.applyTheme(this.settings.theme);
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showNotification('Failed to save settings', 'error');
    }
  }

  async resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      this.settings = {
        autoFillEnabled: true,
        autoSubmit: false,
        detectQRCodes: true,
        lockOnClose: false,
        autoLockTime: 0,
        theme: 'system',
        showAccountIcons: true,
        syncEnabled: false
      };

      await this.saveSettings();
      this.updateUI();
    }
  }

  applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark-theme');
    } else {
      // System theme
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark-theme');
      } else {
        document.documentElement.classList.remove('dark-theme');
      }
    }
  }

  updateSyncStatus() {
    const statusEl = document.getElementById('syncStatus');
    const statusText = statusEl.querySelector('.status-text');

    if (this.settings.syncEnabled) {
      statusEl.classList.add('connected');
      statusText.textContent = 'Connected to app';
    } else {
      statusEl.classList.remove('connected');
      statusText.textContent = 'Not connected';
    }
  }

  async updateKeyboardShortcuts() {
    try {
      const commands = await chrome.commands.getAll();
      
      commands.forEach(command => {
        let element;
        switch (command.name) {
          case '_execute_action':
            element = document.getElementById('shortcut-open');
            break;
          case 'fill-code':
            element = document.getElementById('shortcut-fill');
            break;
          case 'scan-qr':
            element = document.getElementById('shortcut-scan');
            break;
        }

        if (element && command.shortcut) {
          element.textContent = command.shortcut;
        }
      });
    } catch (error) {
      console.error('Failed to get keyboard shortcuts:', error);
    }
  }

  updateVersion() {
    const manifest = chrome.runtime.getManifest();
    document.getElementById('version').textContent = manifest.version;
  }

  async connectToApp() {
    try {
      // Generate connection code
      const code = this.generateConnectionCode();
      
      // Show connection dialog
      const message = `Connection Code: ${code}\n\nEnter this code in the 2FA Studio app to connect.`;
      alert(message);

      // In a real implementation, this would establish a secure connection
      // For now, just enable sync
      this.settings.syncEnabled = true;
      document.getElementById('syncEnabled').checked = true;
      await this.saveSettings();
      this.updateSyncStatus();
    } catch (error) {
      console.error('Failed to connect to app:', error);
      this.showNotification('Failed to connect to app', 'error');
    }
  }

  generateConnectionCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#28a745' : '#dc3545'};
      color: white;
      border-radius: 8px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 1000;
      animation: slideIn 0.3s ease-out;
    `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    // Add to page
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => {
        notification.remove();
        style.remove();
      }, 300);
    }, 3000);
  }
}

// Initialize options page
document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});