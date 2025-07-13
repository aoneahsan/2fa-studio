/**
 * Steam Guard implementation
 * Implements Steam's proprietary TOTP variant
 */

class SteamGuard {
  constructor() {
    // Steam uses a custom alphabet for codes
    this.steamAlphabet = '23456789BCDFGHJKMNPQRTVWXY';
  }

  /**
   * Generate Steam Guard code
   * @param {string} secret - Base32 encoded secret
   * @param {number} [time] - Unix timestamp (optional)
   * @returns {string} 5-character Steam code
   */
  generateCode(secret, time = null) {
    try {
      // Get current time or use provided time
      const currentTime = time || Math.floor(Date.now() / 1000);
      
      // Steam uses 30-second intervals
      const counter = Math.floor(currentTime / 30);
      
      // Convert counter to 8-byte buffer (big-endian)
      const counterBuffer = new ArrayBuffer(8);
      const view = new DataView(counterBuffer);
      view.setUint32(4, counter, false);
      
      // Decode base32 secret
      const secretBytes = this.base32Decode(secret);
      
      // Generate HMAC-SHA1
      return crypto.subtle.importKey(
        'raw',
        secretBytes,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
      ).then(key => {
        return crypto.subtle.sign('HMAC', key, counterBuffer);
      }).then(signature => {
        // Convert to Steam code
        const signatureArray = new Uint8Array(signature);
        
        // Get offset from last nibble
        const offset = signatureArray[19] & 0x0f;
        
        // Get 4 bytes from signature at offset
        let fullCode = 0;
        for (let i = 0; i < 4; i++) {
          fullCode = (fullCode << 8) | signatureArray[offset + i];
        }
        
        // Remove sign bit
        fullCode = fullCode & 0x7fffffff;
        
        // Generate 5-character Steam code
        let steamCode = '';
        for (let i = 0; i < 5; i++) {
          steamCode += this.steamAlphabet[fullCode % this.steamAlphabet.length];
          fullCode = Math.floor(fullCode / this.steamAlphabet.length);
        }
        
        return steamCode;
      });
    } catch (error) {
      console.error('Steam Guard generation error:', error);
      throw new Error('Failed to generate Steam Guard code');
    }
  }

  /**
   * Decode base32 string to bytes
   * @param {string} base32 - Base32 encoded string
   * @returns {Uint8Array} Decoded bytes
   */
  base32Decode(base32) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleanInput = base32.replace(/[^A-Z2-7]/gi, '').toUpperCase();
    
    let bits = '';
    for (const char of cleanInput) {
      const val = alphabet.indexOf(char);
      if (val === -1) continue;
      bits += val.toString(2).padStart(5, '0');
    }
    
    // Convert bits to bytes
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.substr(i, 8), 2));
    }
    
    return new Uint8Array(bytes);
  }

  /**
   * Validate Steam Guard secret
   * @param {string} secret - Secret to validate
   * @returns {boolean} Is valid
   */
  isValidSecret(secret) {
    try {
      const cleaned = secret.replace(/[^A-Z2-7]/gi, '');
      return cleaned.length >= 16 && /^[A-Z2-7]+$/i.test(cleaned);
    } catch {
      return false;
    }
  }

  /**
   * Import from Steam Mobile format
   * @param {object} steamData - Steam mobile export data
   * @returns {object} Converted account data
   */
  importFromSteamMobile(steamData) {
    try {
      // Steam mobile exports contain these fields
      const { shared_secret, account_name, identity_secret, server_time } = steamData;
      
      if (!shared_secret || !account_name) {
        throw new Error('Invalid Steam export data');
      }
      
      return {
        type: 'steam',
        issuer: 'Steam',
        label: account_name,
        secret: shared_secret,
        algorithm: 'SHA1',
        digits: 5,
        period: 30,
        steamData: {
          identitySecret: identity_secret,
          serverTime: server_time
        }
      };
    } catch (error) {
      console.error('Steam import error:', error);
      throw new Error('Failed to import Steam data');
    }
  }

  /**
   * Get time remaining for current code
   * @returns {number} Seconds remaining
   */
  getTimeRemaining() {
    const now = Math.floor(Date.now() / 1000);
    return 30 - (now % 30);
  }

  /**
   * Format code for display
   * @param {string} code - Steam code
   * @returns {string} Formatted code
   */
  formatCode(code) {
    // Steam codes are already short (5 chars), no formatting needed
    return code;
  }
}

// Export singleton instance
export default new SteamGuard();