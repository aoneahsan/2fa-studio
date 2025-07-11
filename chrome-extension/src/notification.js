/**
 * Notification Service for Chrome Extension
 * @module src/notification
 */

export class NotificationService {
  /**
   * Show a notification
   */
  static async show(options) {
    try {
      const notificationId = `tfa-studio-${Date.now()}`;
      
      const defaultOptions = {
        type: 'basic',
        iconUrl: '../assets/icon-128.png',
        title: '2FA Studio',
        message: '',
        priority: 0,
        requireInteraction: false
      };
      
      await chrome.notifications.create(notificationId, {
        ...defaultOptions,
        ...options
      });
      
      // Auto-clear after 5 seconds if not require interaction
      if (!options.requireInteraction) {
        setTimeout(() => {
          chrome.notifications.clear(notificationId);
        }, 5000);
      }
      
      return notificationId;
    } catch (error) {
      console.error('Failed to show notification:', error);
      throw error;
    }
  }

  /**
   * Show success notification
   */
  static async success(message, title = 'Success') {
    return this.show({
      title,
      message,
      type: 'basic'
    });
  }

  /**
   * Show error notification
   */
  static async error(message, title = 'Error') {
    return this.show({
      title,
      message,
      type: 'basic',
      priority: 2
    });
  }

  /**
   * Show info notification
   */
  static async info(message, title = '2FA Studio') {
    return this.show({
      title,
      message,
      type: 'basic'
    });
  }

  /**
   * Show code copied notification
   */
  static async codeCopied(accountName) {
    return this.show({
      title: 'Code Copied',
      message: `2FA code for ${accountName} copied to clipboard`,
      type: 'basic'
    });
  }

  /**
   * Show code expiring notification
   */
  static async codeExpiring(accountName, seconds = 5) {
    return this.show({
      title: 'Code Expiring Soon',
      message: `2FA code for ${accountName} will expire in ${seconds} seconds`,
      type: 'basic',
      priority: 1,
      requireInteraction: true
    });
  }

  /**
   * Clear a notification
   */
  static async clear(notificationId) {
    try {
      await chrome.notifications.clear(notificationId);
      return true;
    } catch (error) {
      console.error('Failed to clear notification:', error);
      return false;
    }
  }

  /**
   * Clear all notifications
   */
  static async clearAll() {
    try {
      const notifications = await chrome.notifications.getAll();
      const promises = Object.keys(notifications).map(id => this.clear(id));
      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
      return false;
    }
  }

  /**
   * Set up notification click handler
   */
  static onClicked(callback) {
    chrome.notifications.onClicked.addListener(callback);
  }

  /**
   * Set up notification button click handler
   */
  static onButtonClicked(callback) {
    chrome.notifications.onButtonClicked.addListener(callback);
  }
}