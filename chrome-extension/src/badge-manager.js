/**
 * Badge Manager
 * Handles extension badge notifications and counts
 * @module badge-manager
 */

export class BadgeManager {
  constructor() {
    this.notificationQueue = [];
    this.currentBadge = null;
    this.defaultColor = '#0066cc';
    this.alertColor = '#ff0000';
    this.successColor = '#00aa00';
    
    this.init();
  }

  async init() {
    // Check for any pending notifications
    await this.checkPendingNotifications();
    
    // Set up alarm for periodic checks
    chrome.alarms.create('badgeUpdate', { periodInMinutes: 1 });
    
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'badgeUpdate') {
        this.updateBadge();
      }
    });
  }

  async updateBadge() {
    try {
      // Priority order: lock status > security alerts > pending codes > account count
      
      // Check if extension is locked
      const lockState = await chrome.storage.local.get(['extensionLocked']);
      if (lockState.extensionLocked) {
        await this.setBadge('🔒', this.alertColor);
        return;
      }
      
      // Check for security alerts
      const alerts = await this.getSecurityAlerts();
      if (alerts.length > 0) {
        await this.setBadge('!', this.alertColor, `${alerts.length} security alert${alerts.length > 1 ? 's' : ''}`);
        return;
      }
      
      // Check for pending 2FA requests
      const pendingRequests = await this.getPendingRequests();
      if (pendingRequests.length > 0) {
        await this.setBadge(pendingRequests.length.toString(), this.successColor, `${pendingRequests.length} pending 2FA request${pendingRequests.length > 1 ? 's' : ''}`);
        return;
      }
      
      // Show account count if enabled
      const settings = await chrome.storage.local.get(['showAccountCount']);
      if (settings.showAccountCount) {
        const accounts = await chrome.storage.local.get(['accounts']);
        const count = accounts.accounts ? accounts.accounts.length : 0;
        if (count > 0) {
          await this.setBadge(count > 99 ? '99+' : count.toString(), this.defaultColor, `${count} account${count > 1 ? 's' : ''}`);
          return;
        }
      }
      
      // Clear badge if nothing to show
      await this.clearBadge();
    } catch (error) {
      console.error('Failed to update badge:', error);
    }
  }

  async setBadge(text, color = null, title = null) {
    try {
      await chrome.action.setBadgeText({ text });
      
      if (color) {
        await chrome.action.setBadgeBackgroundColor({ color });
      }
      
      if (title) {
        await chrome.action.setTitle({ title: `2FA Studio - ${title}` });
      }
      
      this.currentBadge = { text, color, title };
    } catch (error) {
      console.error('Failed to set badge:', error);
    }
  }

  async clearBadge() {
    try {
      await chrome.action.setBadgeText({ text: '' });
      await chrome.action.setTitle({ title: '2FA Studio' });
      this.currentBadge = null;
    } catch (error) {
      console.error('Failed to clear badge:', error);
    }
  }

  async flashBadge(text, color, duration = 2000) {
    const previousBadge = this.currentBadge;
    
    await this.setBadge(text, color);
    
    setTimeout(async () => {
      if (previousBadge) {
        await this.setBadge(previousBadge.text, previousBadge.color, previousBadge.title);
      } else {
        await this.updateBadge();
      }
    }, duration);
  }

  async showNotification(type, message) {
    switch (type) {
      case 'success':
        await this.flashBadge('✓', this.successColor);
        break;
      case 'error':
        await this.flashBadge('✗', this.alertColor);
        break;
      case 'info':
        await this.flashBadge('i', this.defaultColor);
        break;
      case 'copied':
        await this.flashBadge('📋', this.successColor, 1000);
        break;
      case 'filled':
        await this.flashBadge('✓', this.successColor, 1000);
        break;
    }
    
    // Also show system notification if enabled
    const settings = await chrome.storage.local.get(['showNotifications']);
    if (settings.showNotifications !== false) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('assets/icon-48.png'),
        title: '2FA Studio',
        message: message
      });
    }
  }

  async addPendingRequest(domain, accountId) {
    try {
      const pending = await chrome.storage.local.get(['pendingRequests']);
      const requests = pending.pendingRequests || [];
      
      requests.push({
        domain,
        accountId,
        timestamp: Date.now(),
        id: crypto.randomUUID()
      });
      
      await chrome.storage.local.set({ pendingRequests: requests });
      await this.updateBadge();
    } catch (error) {
      console.error('Failed to add pending request:', error);
    }
  }

  async removePendingRequest(requestId) {
    try {
      const pending = await chrome.storage.local.get(['pendingRequests']);
      const requests = pending.pendingRequests || [];
      
      const filtered = requests.filter(r => r.id !== requestId);
      
      await chrome.storage.local.set({ pendingRequests: filtered });
      await this.updateBadge();
    } catch (error) {
      console.error('Failed to remove pending request:', error);
    }
  }

  async getPendingRequests() {
    try {
      const pending = await chrome.storage.local.get(['pendingRequests']);
      const requests = pending.pendingRequests || [];
      
      // Filter out old requests (older than 5 minutes)
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      const activeRequests = requests.filter(r => r.timestamp > fiveMinutesAgo);
      
      // Update storage if we filtered any out
      if (activeRequests.length !== requests.length) {
        await chrome.storage.local.set({ pendingRequests: activeRequests });
      }
      
      return activeRequests;
    } catch (error) {
      console.error('Failed to get pending requests:', error);
      return [];
    }
  }

  async getSecurityAlerts() {
    try {
      const alerts = await chrome.storage.local.get(['securityAlerts']);
      return alerts.securityAlerts || [];
    } catch (error) {
      console.error('Failed to get security alerts:', error);
      return [];
    }
  }

  async addSecurityAlert(alert) {
    try {
      const existing = await chrome.storage.local.get(['securityAlerts']);
      const alerts = existing.securityAlerts || [];
      
      alerts.push({
        ...alert,
        id: crypto.randomUUID(),
        timestamp: Date.now()
      });
      
      await chrome.storage.local.set({ securityAlerts: alerts });
      await this.updateBadge();
    } catch (error) {
      console.error('Failed to add security alert:', error);
    }
  }

  async clearSecurityAlerts() {
    try {
      await chrome.storage.local.set({ securityAlerts: [] });
      await this.updateBadge();
    } catch (error) {
      console.error('Failed to clear security alerts:', error);
    }
  }

  async checkPendingNotifications() {
    // Clean up old pending requests and alerts on startup
    await this.getPendingRequests(); // This will auto-clean old ones
    await this.updateBadge();
  }
}