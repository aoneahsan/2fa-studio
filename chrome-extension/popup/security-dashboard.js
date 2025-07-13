/**
 * Security Dashboard Controller
 */

import duressSecurityService from '../src/duress-security.js';
import { StorageService } from '../src/storage.js';

class SecurityDashboardController {
  constructor() {
    this.init();
  }

  async init() {
    // Get DOM elements
    this.elements = {
      // Header
      backBtn: document.getElementById('backBtn'),
      settingsBtn: document.getElementById('settingsBtn'),
      
      // Status
      statusIndicator: document.getElementById('statusIndicator'),
      statusText: document.getElementById('statusText'),
      
      // Stats
      totalAttempts: document.getElementById('totalAttempts'),
      failedAttempts: document.getElementById('failedAttempts'),
      securityEvents: document.getElementById('securityEvents'),
      duressStatus: document.getElementById('duressStatus'),
      
      // Sections
      intruderSection: document.getElementById('intruderSection'),
      intruderPhotos: document.getElementById('intruderPhotos'),
      activityList: document.getElementById('activityList'),
      
      // Features
      configureDuressBtn: document.getElementById('configureDuressBtn'),
      intruderPhotoToggle: document.getElementById('intruderPhotoToggle'),
      loginLoggingToggle: document.getElementById('loginLoggingToggle'),
      autoLockdownToggle: document.getElementById('autoLockdownToggle'),
      
      // Actions
      exportLogsBtn: document.getElementById('exportLogsBtn'),
      clearLogsBtn: document.getElementById('clearLogsBtn'),
      emergencyLockBtn: document.getElementById('emergencyLockBtn'),
      
      // Modals
      duressPinModal: document.getElementById('duressPinModal'),
      duressPinForm: document.getElementById('duressPinForm'),
      closeDuressBtn: document.getElementById('closeDuressBtn'),
      cancelDuressBtn: document.getElementById('cancelDuressBtn'),
      fakeAccountsList: document.getElementById('fakeAccountsList'),
      
      photoViewerModal: document.getElementById('photoViewerModal'),
      closePhotoBtn: document.getElementById('closePhotoBtn'),
      photoImage: document.getElementById('photoImage'),
      photoDate: document.getElementById('photoDate'),
      photoReason: document.getElementById('photoReason'),
      photoDevice: document.getElementById('photoDevice')
    };
    
    // Load dashboard data
    await this.loadDashboard();
    
    // Setup event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Navigation
    this.elements.backBtn.addEventListener('click', () => window.close());
    
    // Features
    this.elements.configureDuressBtn.addEventListener('click', () => this.showDuressConfig());
    this.elements.intruderPhotoToggle.addEventListener('change', (e) => this.toggleIntruderPhoto(e.target.checked));
    this.elements.loginLoggingToggle.addEventListener('change', (e) => this.toggleLoginLogging(e.target.checked));
    this.elements.autoLockdownToggle.addEventListener('change', (e) => this.toggleAutoLockdown(e.target.checked));
    
    // Actions
    this.elements.exportLogsBtn.addEventListener('click', () => this.exportLogs());
    this.elements.clearLogsBtn.addEventListener('click', () => this.clearLogs());
    this.elements.emergencyLockBtn.addEventListener('click', () => this.emergencyLock());
    
    // Duress modal
    this.elements.duressPinForm.addEventListener('submit', (e) => this.saveDuressConfig(e));
    this.elements.closeDuressBtn.addEventListener('click', () => this.hideDuressConfig());
    this.elements.cancelDuressBtn.addEventListener('click', () => this.hideDuressConfig());
    
    // Photo modal
    this.elements.closePhotoBtn.addEventListener('click', () => this.hidePhotoViewer());
  }

  async loadDashboard() {
    try {
      const dashboard = await duressSecurityService.getSecurityDashboard();
      
      if (!dashboard) {
        console.error('Failed to load dashboard data');
        return;
      }
      
      // Update stats
      this.elements.totalAttempts.textContent = dashboard.stats.totalAttempts;
      this.elements.failedAttempts.textContent = dashboard.stats.failedAttempts;
      this.elements.securityEvents.textContent = dashboard.stats.securityEvents;
      this.elements.duressStatus.textContent = dashboard.stats.duressEnabled ? 'ON' : 'OFF';
      
      // Update status indicator
      this.updateSecurityStatus(dashboard.stats);
      
      // Load intruder photos
      if (dashboard.intruderPhotos.length > 0) {
        this.loadIntruderPhotos(dashboard.intruderPhotos);
      }
      
      // Load activity
      this.loadRecentActivity(dashboard.recentActivity);
      
      // Load settings
      await this.loadSecuritySettings();
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  }

  updateSecurityStatus(stats) {
    const indicator = this.elements.statusIndicator;
    const text = this.elements.statusText;
    
    // Calculate security score
    const failureRate = stats.totalAttempts > 0 
      ? (stats.failedAttempts / stats.totalAttempts) 
      : 0;
    
    if (failureRate > 0.3 || stats.intruderPhotos > 5) {
      indicator.className = 'status-indicator danger';
      text.textContent = 'At Risk';
    } else if (failureRate > 0.1 || stats.intruderPhotos > 0) {
      indicator.className = 'status-indicator warning';
      text.textContent = 'Caution';
    } else {
      indicator.className = 'status-indicator';
      text.textContent = 'Secure';
    }
  }

  loadIntruderPhotos(photos) {
    this.elements.intruderSection.classList.remove('hidden');
    this.elements.intruderPhotos.innerHTML = '';
    
    photos.forEach(photo => {
      const photoEl = document.createElement('div');
      photoEl.className = 'intruder-photo';
      photoEl.innerHTML = `
        <img src="${photo.photo}" alt="Intruder photo">
        <div class="photo-timestamp">${new Date(photo.timestamp).toLocaleString()}</div>
      `;
      
      photoEl.addEventListener('click', () => this.showPhotoDetails(photo));
      this.elements.intruderPhotos.appendChild(photoEl);
    });
  }

  loadRecentActivity(activities) {
    this.elements.activityList.innerHTML = '';
    
    if (activities.length === 0) {
      this.elements.activityList.innerHTML = '<p class="empty-message">No recent activity</p>';
      return;
    }
    
    activities.forEach(activity => {
      const item = document.createElement('div');
      item.className = 'activity-item';
      
      const iconClass = activity.success ? 'success' : 'failed';
      const icon = activity.success ? '✓' : '✗';
      const title = activity.type || (activity.success ? 'Successful login' : 'Failed login');
      const subtitle = activity.method || 'PIN';
      
      item.innerHTML = `
        <div class="activity-icon ${iconClass}">${icon}</div>
        <div class="activity-content">
          <div class="activity-title">${title}</div>
          <div class="activity-subtitle">${subtitle}</div>
        </div>
        <div class="activity-time">${this.formatTime(activity.timestamp)}</div>
      `;
      
      this.elements.activityList.appendChild(item);
    });
  }

  formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    
    return new Date(timestamp).toLocaleDateString();
  }

  async loadSecuritySettings() {
    const settings = await duressSecurityService.getSecuritySettings();
    
    this.elements.intruderPhotoToggle.checked = settings.intruderPhoto;
    this.elements.loginLoggingToggle.checked = settings.loginLogging;
    this.elements.autoLockdownToggle.checked = settings.autoLockdown;
  }

  async toggleIntruderPhoto(enabled) {
    await chrome.storage.local.set({
      securitySettings: {
        ...await duressSecurityService.getSecuritySettings(),
        intruderPhoto: enabled
      }
    });
  }

  async toggleLoginLogging(enabled) {
    await chrome.storage.local.set({
      securitySettings: {
        ...await duressSecurityService.getSecuritySettings(),
        loginLogging: enabled
      }
    });
  }

  async toggleAutoLockdown(enabled) {
    await chrome.storage.local.set({
      securitySettings: {
        ...await duressSecurityService.getSecuritySettings(),
        autoLockdown: enabled
      }
    });
  }

  async showDuressConfig() {
    // Load accounts for fake selection
    const accounts = await StorageService.getAccounts();
    this.elements.fakeAccountsList.innerHTML = '';
    
    accounts.forEach(account => {
      const item = document.createElement('div');
      item.className = 'fake-account-item';
      item.innerHTML = `
        <input type="checkbox" id="fake-${account.id}" value="${account.id}">
        <label for="fake-${account.id}">${account.issuer} (${account.accountName})</label>
      `;
      this.elements.fakeAccountsList.appendChild(item);
    });
    
    this.elements.duressPinModal.classList.remove('hidden');
  }

  hideDuressConfig() {
    this.elements.duressPinModal.classList.add('hidden');
    this.elements.duressPinForm.reset();
  }

  async saveDuressConfig(e) {
    e.preventDefault();
    
    const normalPin = document.getElementById('normalPin').value;
    const duressPin = document.getElementById('duressPin').value;
    
    // Get selected fake accounts
    const fakeAccountIds = Array.from(
      this.elements.fakeAccountsList.querySelectorAll('input:checked')
    ).map(input => input.value);
    
    try {
      await duressSecurityService.setupDuressPin(normalPin, duressPin, fakeAccountIds);
      
      // Update UI
      this.elements.duressStatus.textContent = 'ON';
      this.hideDuressConfig();
      
      // Show success
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('assets/icon-48.png'),
        title: 'Duress PIN Configured',
        message: 'Duress PIN has been set up successfully'
      });
    } catch (error) {
      alert('Failed to setup duress PIN: ' + error.message);
    }
  }

  showPhotoDetails(photo) {
    this.elements.photoImage.src = photo.photo;
    this.elements.photoDate.textContent = new Date(photo.timestamp).toLocaleString();
    this.elements.photoReason.textContent = photo.reason.replace(/_/g, ' ');
    this.elements.photoDevice.textContent = photo.deviceInfo?.platform || 'Unknown';
    
    this.elements.photoViewerModal.classList.remove('hidden');
  }

  hidePhotoViewer() {
    this.elements.photoViewerModal.classList.add('hidden');
  }

  async exportLogs() {
    try {
      const dashboard = await duressSecurityService.getSecurityDashboard();
      const exportData = {
        exportDate: new Date().toISOString(),
        stats: dashboard.stats,
        loginAttempts: dashboard.recentActivity,
        securityEvents: dashboard.securityEvents
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-logs-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  }

  async clearLogs() {
    if (!confirm('Are you sure you want to clear all security logs? This cannot be undone.')) {
      return;
    }
    
    try {
      await chrome.storage.local.remove([
        'loginAttempts',
        'securityEvents',
        'intruderPhotos'
      ]);
      
      // Reload dashboard
      await this.loadDashboard();
      
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('assets/icon-48.png'),
        title: 'Logs Cleared',
        message: 'All security logs have been cleared'
      });
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  async emergencyLock() {
    if (!confirm('Emergency lock will immediately lock the extension and clear sensitive data. Continue?')) {
      return;
    }
    
    try {
      await duressSecurityService.activateSecurityLockdown();
      
      // Lock extension
      await chrome.storage.local.set({ extensionLocked: true });
      
      // Close all windows
      window.close();
    } catch (error) {
      console.error('Failed to activate emergency lock:', error);
    }
  }
}

// Initialize
new SecurityDashboardController();