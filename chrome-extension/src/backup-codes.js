/**
 * Backup Codes Management Service
 */

class BackupCodesService {
  constructor() {
    this.codeLength = 8;
    this.codeCount = 10;
    this.codePattern = /^[A-Z0-9]{8}$/;
  }

  /**
   * Generate backup codes for an account
   * @param {number} count - Number of codes to generate (default 10)
   * @returns {Array} Array of backup codes
   */
  generateBackupCodes(count = this.codeCount) {
    const codes = [];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    for (let i = 0; i < count; i++) {
      let code = '';
      const randomBytes = crypto.getRandomValues(new Uint8Array(this.codeLength));
      
      for (const byte of randomBytes) {
        code += chars[byte % chars.length];
      }
      
      codes.push({
        code: code,
        used: false,
        usedAt: null,
        createdAt: Date.now()
      });
    }
    
    return codes;
  }

  /**
   * Store backup codes for an account
   * @param {string} accountId - Account ID
   * @param {Array} codes - Backup codes to store
   */
  async storeBackupCodes(accountId, codes) {
    try {
      // Get current storage
      const storage = await chrome.storage.local.get(['backupCodes']);
      const backupCodes = storage.backupCodes || {};
      
      // Encrypt codes before storing
      const encryptedCodes = await this.encryptCodes(codes);
      
      // Store for this account
      backupCodes[accountId] = {
        codes: encryptedCodes,
        generatedAt: Date.now(),
        lastModified: Date.now()
      };
      
      await chrome.storage.local.set({ backupCodes });
      
      return { success: true };
    } catch (error) {
      console.error('Failed to store backup codes:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get backup codes for an account
   * @param {string} accountId - Account ID
   * @returns {Array} Backup codes
   */
  async getBackupCodes(accountId) {
    try {
      const storage = await chrome.storage.local.get(['backupCodes']);
      const backupCodes = storage.backupCodes || {};
      
      if (!backupCodes[accountId]) {
        return [];
      }
      
      // Decrypt codes
      const decryptedCodes = await this.decryptCodes(
        backupCodes[accountId].codes
      );
      
      return decryptedCodes;
    } catch (error) {
      console.error('Failed to get backup codes:', error);
      return [];
    }
  }

  /**
   * Validate and use a backup code
   * @param {string} accountId - Account ID
   * @param {string} code - Backup code to validate
   * @returns {object} Validation result
   */
  async validateBackupCode(accountId, code) {
    try {
      // Normalize code
      const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
      
      if (!this.codePattern.test(normalizedCode)) {
        return { valid: false, error: 'Invalid code format' };
      }
      
      // Get codes
      const codes = await this.getBackupCodes(accountId);
      
      // Find matching unused code
      const codeIndex = codes.findIndex(c => 
        c.code === normalizedCode && !c.used
      );
      
      if (codeIndex === -1) {
        return { valid: false, error: 'Invalid or already used code' };
      }
      
      // Mark as used
      codes[codeIndex].used = true;
      codes[codeIndex].usedAt = Date.now();
      
      // Save updated codes
      await this.storeBackupCodes(accountId, codes);
      
      // Get remaining count
      const remainingCount = codes.filter(c => !c.used).length;
      
      return { 
        valid: true, 
        remainingCount,
        warning: remainingCount < 3 ? 'Low backup codes remaining' : null
      };
    } catch (error) {
      console.error('Failed to validate backup code:', error);
      return { valid: false, error: 'Validation error' };
    }
  }

  /**
   * Regenerate backup codes
   * @param {string} accountId - Account ID
   * @returns {Array} New backup codes
   */
  async regenerateBackupCodes(accountId) {
    try {
      // Generate new codes
      const newCodes = this.generateBackupCodes();
      
      // Store them
      await this.storeBackupCodes(accountId, newCodes);
      
      return newCodes;
    } catch (error) {
      console.error('Failed to regenerate backup codes:', error);
      throw error;
    }
  }

  /**
   * Export backup codes as text
   * @param {string} accountId - Account ID
   * @param {object} accountInfo - Account information
   * @returns {string} Formatted backup codes
   */
  async exportAsText(accountId, accountInfo) {
    try {
      const codes = await this.getBackupCodes(accountId);
      const unused = codes.filter(c => !c.used);
      
      let text = `2FA Studio - Backup Codes\n`;
      text += `${'='.repeat(30)}\n\n`;
      text += `Account: ${accountInfo.issuer}\n`;
      text += `Username: ${accountInfo.accountName}\n`;
      text += `Generated: ${new Date().toLocaleString()}\n`;
      text += `\nRECOVERY CODES (${unused.length} remaining):\n`;
      text += `${'─'.repeat(30)}\n\n`;
      
      unused.forEach((code, index) => {
        text += `${(index + 1).toString().padStart(2, '0')}. ${code.code}\n`;
      });
      
      text += `\n${'─'.repeat(30)}\n`;
      text += `⚠️  IMPORTANT:\n`;
      text += `• Each code can only be used once\n`;
      text += `• Store these codes securely\n`;
      text += `• Generate new codes after using several\n`;
      
      return text;
    } catch (error) {
      console.error('Failed to export backup codes:', error);
      throw error;
    }
  }

  /**
   * Export backup codes as PDF
   * @param {string} accountId - Account ID
   * @param {object} accountInfo - Account information
   * @returns {Blob} PDF blob
   */
  async exportAsPDF(accountId, accountInfo) {
    // For now, return a data URL that can be printed
    // In production, use a PDF library like jsPDF
    const text = await this.exportAsText(accountId, accountInfo);
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Backup Codes - ${accountInfo.issuer}</title>
        <style>
          body { font-family: monospace; padding: 20px; }
          h1 { font-size: 18px; }
          .codes { margin: 20px 0; }
          .code { margin: 5px 0; font-size: 14px; }
          .warning { margin-top: 20px; padding: 10px; background: #fff3cd; }
        </style>
      </head>
      <body>
        <pre>${text}</pre>
        <script>window.print();</script>
      </body>
      </html>
    `;
    
    return new Blob([html], { type: 'text/html' });
  }

  /**
   * Get statistics for backup codes
   * @param {string} accountId - Account ID
   * @returns {object} Statistics
   */
  async getBackupCodeStats(accountId) {
    try {
      const codes = await this.getBackupCodes(accountId);
      
      const total = codes.length;
      const used = codes.filter(c => c.used).length;
      const remaining = total - used;
      const lastUsed = codes
        .filter(c => c.used)
        .sort((a, b) => b.usedAt - a.usedAt)[0];
      
      return {
        total,
        used,
        remaining,
        lastUsedAt: lastUsed?.usedAt || null,
        generatedAt: codes[0]?.createdAt || null,
        needsRegeneration: remaining < 3
      };
    } catch (error) {
      console.error('Failed to get backup code stats:', error);
      return {
        total: 0,
        used: 0,
        remaining: 0,
        lastUsedAt: null,
        generatedAt: null,
        needsRegeneration: true
      };
    }
  }

  /**
   * Encrypt backup codes
   * @private
   */
  async encryptCodes(codes) {
    try {
      // Get encryption key from storage (should be derived from user's master key)
      const storage = await chrome.storage.local.get(['encryptionKey']);
      if (!storage.encryptionKey) {
        // Generate a temporary key for this session
        const key = await crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        );
        const exportedKey = await crypto.subtle.exportKey('jwk', key);
        await chrome.storage.local.set({ encryptionKey: exportedKey });
        storage.encryptionKey = exportedKey;
      }
      
      // Import the key
      const key = await crypto.subtle.importKey(
        'jwk',
        storage.encryptionKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );
      
      // Encrypt the codes
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(codes));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        data
      );
      
      return {
        encrypted: Array.from(new Uint8Array(encrypted)),
        iv: Array.from(iv)
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      // Fallback to storing unencrypted (with warning)
      console.warn('Storing backup codes without encryption');
      return codes;
    }
  }

  /**
   * Decrypt backup codes
   * @private
   */
  async decryptCodes(encryptedData) {
    try {
      // Handle unencrypted data (backward compatibility)
      if (Array.isArray(encryptedData) && encryptedData[0]?.code) {
        return encryptedData;
      }
      
      // Get decryption key
      const storage = await chrome.storage.local.get(['encryptionKey']);
      if (!storage.encryptionKey) {
        throw new Error('No encryption key found');
      }
      
      // Import the key
      const key = await crypto.subtle.importKey(
        'jwk',
        storage.encryptionKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
      
      // Decrypt the codes
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(encryptedData.iv) },
        key,
        new Uint8Array(encryptedData.encrypted)
      );
      
      const decoder = new TextDecoder();
      const decryptedText = decoder.decode(decrypted);
      return JSON.parse(decryptedText);
    } catch (error) {
      console.error('Decryption failed:', error);
      return [];
    }
  }

  /**
   * Clean up expired or all-used backup codes
   */
  async cleanup() {
    try {
      const storage = await chrome.storage.local.get(['backupCodes']);
      const backupCodes = storage.backupCodes || {};
      let modified = false;
      
      for (const accountId in backupCodes) {
        const codes = await this.getBackupCodes(accountId);
        
        // Check if all codes are used
        if (codes.length > 0 && codes.every(c => c.used)) {
          // Keep the record for history but mark as exhausted
          backupCodes[accountId].exhausted = true;
          backupCodes[accountId].exhaustedAt = Date.now();
          modified = true;
        }
      }
      
      if (modified) {
        await chrome.storage.local.set({ backupCodes });
      }
    } catch (error) {
      console.error('Failed to cleanup backup codes:', error);
    }
  }
}

export default new BackupCodesService();