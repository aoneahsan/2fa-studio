/**
 * Duress PIN and Advanced Security Service
 */

class DuressSecurityService {
  constructor() {
    this.maxFailedAttempts = 5;
    this.photoCaptureTrigger = 3;
    this.duressPinActive = false;
  }

  /**
   * Setup duress PIN
   * @param {string} normalPin - Normal PIN
   * @param {string} duressPin - Duress PIN
   * @param {Array} fakeAccountIds - Account IDs to show in duress mode
   */
  async setupDuressPin(normalPin, duressPin, fakeAccountIds = []) {
    try {
      if (normalPin === duressPin) {
        throw new Error('Duress PIN must be different from normal PIN');
      }
      
      // Hash both PINs
      const _encoder = new TextEncoder();
      const _normalPinHash = await this.hashPin(normalPin);
      const duressPinHash = await this.hashPin(duressPin);
      
      // Store duress configuration
      const duressConfig = {
        enabled: true,
        duressPinHash: Array.from(new Uint8Array(duressPinHash)),
        fakeAccountIds: fakeAccountIds,
        activationMessage: 'Emergency mode activated',
        settings: {
          hideRealAccounts: true,
          showFakeAccounts: true,
          limitedFeatures: true,
          silentAlarm: true
        }
      };
      
      await chrome.storage.local.set({ duressConfig });
      
      return { success: true };
    } catch (error) {
      console.error('Failed to setup duress PIN:', error);
      throw error;
    }
  }

  /**
   * Check if PIN is duress PIN
   */
  async checkDuressPin(pin) {
    try {
      const storage = await chrome.storage.local.get(['duressConfig']);
      const config = storage.duressConfig;
      
      if (!config || !config.enabled) {
        return { isDuress: false };
      }
      
      const pinHash = await this.hashPin(pin);
      const pinHashArray = Array.from(new Uint8Array(pinHash));
      
      // Compare with duress PIN
      const isDuress = this.compareHashes(pinHashArray, config.duressPinHash);
      
      if (isDuress) {
        await this.activateDuressMode(config);
        return { 
          isDuress: true, 
          message: config.activationMessage 
        };
      }
      
      return { isDuress: false };
    } catch (error) {
      console.error('Failed to check duress PIN:', error);
      return { isDuress: false };
    }
  }

  /**
   * Activate duress mode
   */
  async activateDuressMode(config) {
    try {
      this.duressPinActive = true;
      
      // Store duress mode state
      await chrome.storage.local.set({
        duressMode: {
          active: true,
          activatedAt: Date.now(),
          config: config.settings
        }
      });
      
      // Silent alarm - log the event
      await this.logSecurityEvent({
        type: 'duress_activation',
        timestamp: Date.now(),
        location: await this.getLocationInfo()
      });
      
      // If configured, send alert (in production, this could notify a trusted contact)
      if (config.settings.silentAlarm) {
        await this.sendSilentAlarm();
      }
    } catch (error) {
      console.error('Failed to activate duress mode:', error);
    }
  }

  /**
   * Capture intruder photo
   */
  async captureIntruderPhoto(reason = 'failed_attempts') {
    try {
      // Check if we should capture
      const settings = await this.getSecuritySettings();
      if (!settings.intruderPhoto) {
        return;
      }
      
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      
      // Create video element
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      // Wait for video to be ready
      await new Promise(resolve => {
        video.onloadedmetadata = resolve;
      });
      
      // Create canvas and capture photo
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      // Stop stream
      stream.getTracks().forEach(track => track.stop());
      
      // Convert to blob
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });
      
      // Store photo
      await this.storeIntruderPhoto(blob, reason);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to capture intruder photo:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Store intruder photo
   */
  async storeIntruderPhoto(blob, reason) {
    try {
      // Convert blob to base64
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      // Get existing photos
      const storage = await chrome.storage.local.get(['intruderPhotos']);
      const photos = storage.intruderPhotos || [];
      
      // Add new photo
      photos.push({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        reason: reason,
        photo: base64,
        deviceInfo: await this.getDeviceInfo()
      });
      
      // Keep only last 10 photos
      if (photos.length > 10) {
        photos.shift();
      }
      
      await chrome.storage.local.set({ intruderPhotos: photos });
    } catch (error) {
      console.error('Failed to store intruder photo:', error);
    }
  }

  /**
   * Log login attempt
   */
  async logLoginAttempt(success, method = 'pin') {
    try {
      const storage = await chrome.storage.local.get(['loginAttempts']);
      const attempts = storage.loginAttempts || [];
      
      const attempt = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        success: success,
        method: method,
        deviceInfo: await this.getDeviceInfo(),
        location: await this.getLocationInfo()
      };
      
      attempts.push(attempt);
      
      // Keep only last 100 attempts
      if (attempts.length > 100) {
        attempts.shift();
      }
      
      await chrome.storage.local.set({ loginAttempts: attempts });
      
      // Check for suspicious activity
      await this.checkSuspiciousActivity(attempts);
      
      return attempt;
    } catch (error) {
      console.error('Failed to log login attempt:', error);
    }
  }

  /**
   * Check for suspicious activity
   */
  async checkSuspiciousActivity(attempts) {
    try {
      // Get recent failed attempts
      const recentTime = Date.now() - (15 * 60 * 1000); // Last 15 minutes
      const recentAttempts = attempts.filter(a => a.timestamp > recentTime);
      const failedAttempts = recentAttempts.filter(a => !a.success);
      
      // Trigger photo capture after threshold
      if (failedAttempts.length >= this.photoCaptureTrigger) {
        await this.captureIntruderPhoto('multiple_failed_attempts');
      }
      
      // Check for brute force
      if (failedAttempts.length >= this.maxFailedAttempts) {
        await this.activateSecurityLockdown();
      }
      
      // Check for unusual locations
      const locations = recentAttempts.map(a => a.location?.ip).filter(Boolean);
      const uniqueLocations = new Set(locations);
      if (uniqueLocations.size > 3) {
        await this.logSecurityEvent({
          type: 'multiple_locations',
          timestamp: Date.now(),
          locations: Array.from(uniqueLocations)
        });
      }
    } catch (error) {
      console.error('Failed to check suspicious activity:', error);
    }
  }

  /**
   * Activate security lockdown
   */
  async activateSecurityLockdown() {
    try {
      await chrome.storage.local.set({
        securityLockdown: {
          active: true,
          activatedAt: Date.now(),
          duration: 30 * 60 * 1000, // 30 minutes
          reason: 'too_many_failed_attempts'
        }
      });
      
      // Clear sensitive data from memory
      await this.clearSensitiveData();
      
      // Log event
      await this.logSecurityEvent({
        type: 'security_lockdown',
        timestamp: Date.now(),
        reason: 'Brute force attempt detected'
      });
    } catch (error) {
      console.error('Failed to activate security lockdown:', error);
    }
  }

  /**
   * Get security dashboard data
   */
  async getSecurityDashboard() {
    try {
      const storage = await chrome.storage.local.get([
        'loginAttempts',
        'intruderPhotos',
        'securityEvents',
        'duressConfig'
      ]);
      
      const attempts = storage.loginAttempts || [];
      const photos = storage.intruderPhotos || [];
      const events = storage.securityEvents || [];
      
      // Calculate statistics
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;
      const week = 7 * day;
      
      const stats = {
        totalAttempts: attempts.length,
        failedAttempts: attempts.filter(a => !a.success).length,
        successfulAttempts: attempts.filter(a => a.success).length,
        attemptsToday: attempts.filter(a => a.timestamp > now - day).length,
        attemptsThisWeek: attempts.filter(a => a.timestamp > now - week).length,
        intruderPhotos: photos.length,
        securityEvents: events.length,
        duressEnabled: storage.duressConfig?.enabled || false,
        lastAttempt: attempts[attempts.length - 1] || null
      };
      
      // Get recent activity
      const recentActivity = [...attempts, ...events]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 20);
      
      return {
        stats,
        recentActivity,
        intruderPhotos: photos.slice(-5), // Last 5 photos
        securityEvents: events.slice(-10) // Last 10 events
      };
    } catch (error) {
      console.error('Failed to get security dashboard:', error);
      return null;
    }
  }

  /**
   * Log security event
   */
  async logSecurityEvent(event) {
    try {
      const storage = await chrome.storage.local.get(['securityEvents']);
      const events = storage.securityEvents || [];
      
      events.push({
        id: crypto.randomUUID(),
        ...event
      });
      
      // Keep only last 1000 events
      if (events.length > 1000) {
        events.shift();
      }
      
      await chrome.storage.local.set({ securityEvents: events });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Get device info
   */
  async getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  /**
   * Get location info (approximate)
   */
  async getLocationInfo() {
    try {
      // This is a simple IP-based location
      // In production, use a proper geolocation service
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      return {
        ip: data.ip,
        city: data.city,
        country: data.country_name,
        approximate: true
      };
    } catch (_error) {
      return { error: 'Unable to determine location' };
    }
  }

  /**
   * Clear sensitive data
   */
  async clearSensitiveData() {
    // Clear any cached sensitive data
    // This would clear decrypted secrets, session keys, etc.
    console.log('Clearing sensitive data from memory');
  }

  /**
   * Send silent alarm
   */
  async sendSilentAlarm() {
    // In production, this could:
    // - Send email to trusted contact
    // - Send SMS via API
    // - Trigger webhook
    // - Log to remote server
    console.log('Silent alarm triggered');
  }

  /**
   * Get security settings
   */
  async getSecuritySettings() {
    const storage = await chrome.storage.local.get(['securitySettings']);
    return storage.securitySettings || {
      intruderPhoto: true,
      loginLogging: true,
      duressPin: false,
      autoLockdown: true
    };
  }

  /**
   * Hash PIN
   */
  async hashPin(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + 'tfa-studio-salt');
    return crypto.subtle.digest('SHA-256', data);
  }

  /**
   * Compare hashes
   */
  compareHashes(hash1, hash2) {
    if (hash1.length !== hash2.length) return false;
    
    let result = 0;
    for (let i = 0; i < hash1.length; i++) {
      result |= hash1[i] ^ hash2[i];
    }
    
    return result === 0;
  }
}

export default new DuressSecurityService();