/**
 * Password Manager Service for Browser Extension
 * @module src/password-manager
 */

import { StorageService } from './storage.js';
import { SecurityService } from './security.js';

class PasswordManagerService {
  constructor() {
    this.passwords = new Map();
    this.masterPassword = null;
    this.isUnlocked = false;
    this.lockTimeout = null;
    this.encryptionKey = null;
    
    this.init();
  }

  async init() {
    await this.loadPasswords();
    this.setupAutoLock();
  }

  /**
   * Check if password manager is enabled and unlocked
   */
  isEnabled() {
    return this.isUnlocked && this.encryptionKey !== null;
  }

  /**
   * Unlock the password manager with master password
   */
  async unlock(masterPassword) {
    try {
      // Derive encryption key from master password
      this.encryptionKey = await this.deriveKey(masterPassword);
      
      // Try to decrypt a test entry to verify the password
      const testResult = await this.verifyMasterPassword();
      
      if (testResult) {
        this.isUnlocked = true;
        this.masterPassword = masterPassword;
        await this.loadPasswords();
        this.resetAutoLock();
        return { success: true };
      } else {
        this.encryptionKey = null;
        return { success: false, error: 'Invalid master password' };
      }
    } catch (error) {
      console.error('Failed to unlock password manager:', error);
      return { success: false, error: 'Failed to unlock password manager' };
    }
  }

  /**
   * Lock the password manager
   */
  lock() {
    this.isUnlocked = false;
    this.masterPassword = null;
    this.encryptionKey = null;
    this.passwords.clear();
    
    if (this.lockTimeout) {
      clearTimeout(this.lockTimeout);
      this.lockTimeout = null;
    }
  }

  /**
   * Set up auto-lock timer
   */
  setupAutoLock() {
    this.resetAutoLock();
  }

  /**
   * Reset auto-lock timer
   */
  async resetAutoLock() {
    if (this.lockTimeout) {
      clearTimeout(this.lockTimeout);
    }

    const settings = await StorageService.getSettings();
    const lockTime = settings.passwordManagerLockTime || 900000; // 15 minutes default

    if (lockTime > 0 && this.isUnlocked) {
      this.lockTimeout = setTimeout(() => {
        this.lock();
      }, lockTime);
    }
  }

  /**
   * Derive encryption key from master password
   */
  async deriveKey(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    
    // Use a salt stored in settings or generate one
    const settings = await StorageService.getSettings();
    let salt = settings.passwordManagerSalt;
    
    if (!salt) {
      salt = Array.from(crypto.getRandomValues(new Uint8Array(16)));
      settings.passwordManagerSalt = salt;
      await StorageService.setSettings(settings);
    }

    const saltArray = new Uint8Array(salt);
    
    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      data,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    // Derive actual encryption key
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltArray,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    return key;
  }

  /**
   * Verify master password by trying to decrypt test data
   */
  async verifyMasterPassword() {
    try {
      const settings = await StorageService.getSettings();
      const testData = settings.passwordManagerTest;
      
      if (!testData) {
        // No test data exists, create it
        const testString = 'password-manager-test';
        const encrypted = await this.encryptData(testString);
        settings.passwordManagerTest = encrypted;
        await StorageService.setSettings(settings);
        return true;
      }

      // Try to decrypt existing test data
      const decrypted = await this.decryptData(testData);
      return decrypted === 'password-manager-test';
    } catch (error) {
      return false;
    }
  }

  /**
   * Encrypt data using the current encryption key
   */
  async encryptData(data) {
    if (!this.encryptionKey) {
      throw new Error('Password manager is locked');
    }

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      this.encryptionKey,
      dataBuffer
    );

    return {
      data: Array.from(new Uint8Array(encrypted)),
      iv: Array.from(iv)
    };
  }

  /**
   * Decrypt data using the current encryption key
   */
  async decryptData(encryptedData) {
    if (!this.encryptionKey) {
      throw new Error('Password manager is locked');
    }

    const iv = new Uint8Array(encryptedData.iv);
    const data = new Uint8Array(encryptedData.data);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      this.encryptionKey,
      data
    );

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decrypted);
    return JSON.parse(jsonString);
  }

  /**
   * Load encrypted passwords from storage
   */
  async loadPasswords() {
    if (!this.isUnlocked) return;

    try {
      const data = await StorageService.getPasswordEntries();
      this.passwords.clear();

      for (const entry of data || []) {
        try {
          const decrypted = await this.decryptData(entry.encrypted);
          this.passwords.set(entry.id, {
            id: entry.id,
            domain: entry.domain,
            username: decrypted.username,
            password: decrypted.password,
            notes: decrypted.notes || '',
            lastUsed: entry.lastUsed,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt
          });
        } catch (error) {
          console.error('Failed to decrypt password entry:', error);
        }
      }
    } catch (error) {
      console.error('Failed to load passwords:', error);
    }
  }

  /**
   * Save password entry
   */
  async savePassword(passwordData) {
    if (!this.isUnlocked) {
      throw new Error('Password manager is locked');
    }

    try {
      const id = passwordData.id || this.generateId();
      const now = Date.now();

      // Encrypt sensitive data
      const encrypted = await this.encryptData({
        username: passwordData.username,
        password: passwordData.password,
        notes: passwordData.notes || ''
      });

      const entry = {
        id: id,
        domain: passwordData.domain,
        encrypted: encrypted,
        lastUsed: passwordData.lastUsed || null,
        createdAt: passwordData.createdAt || now,
        updatedAt: now
      };

      // Save to storage
      const entries = await StorageService.getPasswordEntries() || [];
      const existingIndex = entries.findIndex(e => e.id === id);

      if (existingIndex >= 0) {
        entries[existingIndex] = entry;
      } else {
        entries.push(entry);
      }

      await StorageService.savePasswordEntries(entries);

      // Update local cache
      this.passwords.set(id, {
        id: id,
        domain: passwordData.domain,
        username: passwordData.username,
        password: passwordData.password,
        notes: passwordData.notes || '',
        lastUsed: passwordData.lastUsed || null,
        createdAt: passwordData.createdAt || now,
        updatedAt: now
      });

      return { success: true, id: id };
    } catch (error) {
      console.error('Failed to save password:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete password entry
   */
  async deletePassword(id) {
    if (!this.isUnlocked) {
      throw new Error('Password manager is locked');
    }

    try {
      const entries = await StorageService.getPasswordEntries() || [];
      const filteredEntries = entries.filter(e => e.id !== id);
      
      await StorageService.savePasswordEntries(filteredEntries);
      this.passwords.delete(id);

      return { success: true };
    } catch (error) {
      console.error('Failed to delete password:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Find passwords for a domain
   */
  findPasswordsForDomain(domain) {
    if (!this.isUnlocked) return [];

    const matches = [];
    const normalizedDomain = this.normalizeDomain(domain);

    for (const [id, entry] of this.passwords) {
      const entryDomain = this.normalizeDomain(entry.domain);
      
      if (this.domainsMatch(normalizedDomain, entryDomain)) {
        matches.push({
          id: entry.id,
          domain: entry.domain,
          username: entry.username,
          lastUsed: entry.lastUsed
        });
      }
    }

    // Sort by last used date (most recent first)
    matches.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
    return matches;
  }

  /**
   * Get password by ID
   */
  getPassword(id) {
    if (!this.isUnlocked) return null;
    return this.passwords.get(id) || null;
  }

  /**
   * Update last used timestamp
   */
  async markAsUsed(id) {
    if (!this.isUnlocked) return;

    const entry = this.passwords.get(id);
    if (!entry) return;

    entry.lastUsed = Date.now();
    await this.savePassword(entry);
  }

  /**
   * Detect login form fields on current page
   */
  detectLoginForm() {
    const forms = document.querySelectorAll('form');
    const results = [];

    for (const form of forms) {
      const usernameField = this.findUsernameField(form);
      const passwordField = this.findPasswordField(form);

      if (usernameField && passwordField) {
        results.push({
          form: form,
          usernameField: usernameField,
          passwordField: passwordField,
          confidence: this.calculateFormConfidence(form, usernameField, passwordField)
        });
      }
    }

    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);
    return results;
  }

  /**
   * Find username field in form
   */
  findUsernameField(form) {
    const selectors = [
      'input[type="email"]',
      'input[type="text"][name*="user"]',
      'input[type="text"][name*="email"]',
      'input[type="text"][name*="login"]',
      'input[type="text"][id*="user"]',
      'input[type="text"][id*="email"]',
      'input[type="text"][id*="login"]',
      'input[autocomplete="username"]',
      'input[autocomplete="email"]'
    ];

    for (const selector of selectors) {
      const field = form.querySelector(selector);
      if (field && this.isVisibleField(field)) {
        return field;
      }
    }

    // Fallback: first visible text input
    const textInputs = form.querySelectorAll('input[type="text"]');
    for (const input of textInputs) {
      if (this.isVisibleField(input)) {
        return input;
      }
    }

    return null;
  }

  /**
   * Find password field in form
   */
  findPasswordField(form) {
    const passwordFields = form.querySelectorAll('input[type="password"]');
    
    for (const field of passwordFields) {
      if (this.isVisibleField(field)) {
        return field;
      }
    }

    return null;
  }

  /**
   * Check if field is visible
   */
  isVisibleField(field) {
    const rect = field.getBoundingClientRect();
    const style = window.getComputedStyle(field);
    
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0'
    );
  }

  /**
   * Calculate form confidence score
   */
  calculateFormConfidence(form, usernameField, passwordField) {
    let confidence = 0.5;

    // Check for login-related keywords
    const formText = form.textContent.toLowerCase();
    const loginKeywords = ['login', 'sign in', 'log in', 'authenticate'];
    
    for (const keyword of loginKeywords) {
      if (formText.includes(keyword)) {
        confidence += 0.2;
        break;
      }
    }

    // Check field attributes
    if (usernameField.autocomplete === 'username' || usernameField.autocomplete === 'email') {
      confidence += 0.1;
    }

    if (passwordField.autocomplete === 'current-password') {
      confidence += 0.1;
    }

    // Check for submit button
    const submitButton = form.querySelector('input[type="submit"], button[type="submit"], button:not([type])');
    if (submitButton) {
      const buttonText = submitButton.textContent.toLowerCase();
      if (buttonText.includes('login') || buttonText.includes('sign in')) {
        confidence += 0.1;
      }
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Auto-fill login form
   */
  async fillLoginForm(passwordId, formData = null) {
    if (!this.isUnlocked) {
      throw new Error('Password manager is locked');
    }

    const password = this.getPassword(passwordId);
    if (!password) {
      throw new Error('Password not found');
    }

    let loginForm = formData;
    if (!loginForm) {
      const forms = this.detectLoginForm();
      if (forms.length === 0) {
        throw new Error('No login form detected');
      }
      loginForm = forms[0];
    }

    try {
      // Fill username field
      if (loginForm.usernameField) {
        this.fillField(loginForm.usernameField, password.username);
      }

      // Fill password field
      if (loginForm.passwordField) {
        this.fillField(loginForm.passwordField, password.password);
      }

      // Mark as used
      await this.markAsUsed(passwordId);

      return { success: true };
    } catch (error) {
      console.error('Failed to fill login form:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fill a form field with value
   */
  fillField(field, value) {
    // Focus field
    field.focus();
    
    // Clear existing value
    field.value = '';
    
    // Set new value
    field.value = value;
    
    // Trigger events
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * Normalize domain for comparison
   */
  normalizeDomain(domain) {
    if (!domain) return '';
    
    return domain.toLowerCase()
      .replace(/^www\./, '')
      .replace(/:\d+$/, ''); // Remove port
  }

  /**
   * Check if domains match
   */
  domainsMatch(domain1, domain2) {
    if (domain1 === domain2) return true;
    
    // Check if one is a subdomain of the other
    const parts1 = domain1.split('.').reverse();
    const parts2 = domain2.split('.').reverse();
    
    const minLength = Math.min(parts1.length, parts2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (parts1[i] !== parts2[i]) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return 'pwd_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Export passwords (encrypted)
   */
  async exportPasswords() {
    if (!this.isUnlocked) {
      throw new Error('Password manager is locked');
    }

    const entries = await StorageService.getPasswordEntries();
    return {
      passwords: entries,
      timestamp: Date.now(),
      version: '1.0'
    };
  }

  /**
   * Import passwords
   */
  async importPasswords(data) {
    if (!this.isUnlocked) {
      throw new Error('Password manager is locked');
    }

    if (!data.passwords || !Array.isArray(data.passwords)) {
      throw new Error('Invalid import data');
    }

    const existingEntries = await StorageService.getPasswordEntries() || [];
    const newEntries = [...existingEntries];

    for (const entry of data.passwords) {
      // Check if entry already exists
      const exists = existingEntries.some(e => e.id === entry.id);
      if (!exists) {
        newEntries.push(entry);
      }
    }

    await StorageService.savePasswordEntries(newEntries);
    await this.loadPasswords();

    return { success: true, imported: data.passwords.length };
  }

  /**
   * Get password strength score
   */
  getPasswordStrength(password) {
    let score = 0;
    let feedback = [];

    if (password.length >= 8) score += 1;
    else feedback.push('Use at least 8 characters');

    if (password.length >= 12) score += 1;
    else if (password.length >= 8) feedback.push('Consider using 12+ characters');

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Include lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Include uppercase letters');

    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('Include numbers');

    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    else feedback.push('Include special characters');

    const strength = score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong';

    return {
      score: score,
      maxScore: 6,
      strength: strength,
      feedback: feedback
    };
  }
}

export { PasswordManagerService };