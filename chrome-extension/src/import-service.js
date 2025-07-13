/**
 * Import Service for various 2FA app formats
 */

import steamGuard from './steam-guard.js';

class ImportService {
  constructor() {
    this.importers = {
      steam: this.importSteam.bind(this),
      googleAuth: this.importGoogleAuth.bind(this),
      microsoftAuth: this.importMicrosoftAuth.bind(this),
      authy: this.importAuthy.bind(this),
      twofas: this.import2FAS.bind(this)
    };
  }

  /**
   * Import from Steam Mobile JSON format
   * @param {string} jsonData - JSON string from Steam mobile app
   * @returns {Array} Imported accounts
   */
  async importSteam(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      const accounts = [];
      
      // Handle both single account and array formats
      const steamAccounts = Array.isArray(data) ? data : [data];
      
      for (const steamData of steamAccounts) {
        if (steamData.shared_secret && steamData.account_name) {
          const account = steamGuard.importFromSteamMobile(steamData);
          account.id = crypto.randomUUID();
          account.createdAt = Date.now();
          accounts.push(account);
        }
      }
      
      return accounts;
    } catch (error) {
      console.error('Steam import error:', error);
      throw new Error('Invalid Steam export format');
    }
  }

  /**
   * Import from Google Authenticator export QR
   * Format: otpauth-migration://offline?data=...
   * @param {string} migrationUrl - Migration URL from QR code
   * @returns {Array} Imported accounts
   */
  async importGoogleAuth(migrationUrl) {
    try {
      const url = new URL(migrationUrl);
      if (url.protocol !== 'otpauth-migration:') {
        throw new Error('Invalid migration URL');
      }
      
      const data = url.searchParams.get('data');
      if (!data) {
        throw new Error('No data in migration URL');
      }
      
      // Decode base64 data
      const binaryString = atob(data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Parse protobuf data (simplified)
      const accounts = this.parseGoogleProtobuf(bytes);
      
      return accounts.map(acc => ({
        id: crypto.randomUUID(),
        type: acc.type || 'totp',
        issuer: acc.issuer || 'Unknown',
        accountName: acc.name || acc.issuer,
        secret: acc.secret,
        algorithm: acc.algorithm || 'SHA1',
        digits: acc.digits || 6,
        period: acc.period || 30,
        createdAt: Date.now()
      }));
    } catch (error) {
      console.error('Google Auth import error:', error);
      throw new Error('Failed to import from Google Authenticator');
    }
  }

  /**
   * Parse Google Authenticator protobuf data
   * @private
   */
  parseGoogleProtobuf(bytes) {
    // This is a simplified parser
    // In production, use a proper protobuf library
    const accounts = [];
    let i = 0;
    
    while (i < bytes.length) {
      const fieldType = bytes[i] >> 3;
      const wireType = bytes[i] & 0x07;
      i++;
      
      if (fieldType === 1 && wireType === 2) {
        // OTP parameter
        const length = bytes[i++];
        const paramEnd = i + length;
        
        const account = {
          secret: '',
          name: '',
          issuer: '',
          algorithm: 'SHA1',
          digits: 6,
          type: 'totp'
        };
        
        while (i < paramEnd) {
          const paramField = bytes[i] >> 3;
          const paramWire = bytes[i] & 0x07;
          i++;
          
          switch (paramField) {
            case 1: // Secret
              if (paramWire === 2) {
                const secretLen = bytes[i++];
                const secretBytes = bytes.slice(i, i + secretLen);
                account.secret = this.base32Encode(secretBytes);
                i += secretLen;
              }
              break;
            case 2: // Name
              if (paramWire === 2) {
                const nameLen = bytes[i++];
                account.name = new TextDecoder().decode(bytes.slice(i, i + nameLen));
                i += nameLen;
              }
              break;
            case 3: // Issuer
              if (paramWire === 2) {
                const issuerLen = bytes[i++];
                account.issuer = new TextDecoder().decode(bytes.slice(i, i + issuerLen));
                i += issuerLen;
              }
              break;
            case 4: // Algorithm
              if (paramWire === 0) {
                const algo = bytes[i++];
                account.algorithm = ['SHA1', 'SHA256', 'SHA512'][algo] || 'SHA1';
              }
              break;
            case 5: // Digits
              if (paramWire === 0) {
                account.digits = bytes[i++];
              }
              break;
            case 6: // Type
              if (paramWire === 0) {
                account.type = bytes[i++] === 1 ? 'hotp' : 'totp';
              }
              break;
            default:
              // Skip unknown fields
              if (paramWire === 2) {
                const skipLen = bytes[i++];
                i += skipLen;
              } else {
                i++;
              }
          }
        }
        
        if (account.secret) {
          accounts.push(account);
        }
      } else {
        // Skip unknown fields
        if (wireType === 2) {
          const skipLen = bytes[i++];
          i += skipLen;
        } else {
          i++;
        }
      }
    }
    
    return accounts;
  }

  /**
   * Base32 encode
   * @private
   */
  base32Encode(bytes) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    let bits = 0;
    let value = 0;
    
    for (const byte of bytes) {
      value = (value << 8) | byte;
      bits += 8;
      
      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    
    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 31];
    }
    
    return result;
  }

  /**
   * Import from Microsoft Authenticator backup
   * @param {string} backupData - Backup JSON string
   * @returns {Array} Imported accounts
   */
  async importMicrosoftAuth(backupData) {
    try {
      const data = JSON.parse(backupData);
      const accounts = [];
      
      // Microsoft Authenticator backup format
      if (data.accounts && Array.isArray(data.accounts)) {
        for (const msAccount of data.accounts) {
          accounts.push({
            id: crypto.randomUUID(),
            type: msAccount.type?.toLowerCase() || 'totp',
            issuer: msAccount.name || 'Unknown',
            accountName: msAccount.username || msAccount.name,
            secret: msAccount.secret,
            algorithm: msAccount.algorithm || 'SHA1',
            digits: msAccount.digits || 6,
            period: msAccount.timeStep || 30,
            createdAt: Date.now()
          });
        }
      }
      
      return accounts;
    } catch (error) {
      console.error('Microsoft Auth import error:', error);
      throw new Error('Invalid Microsoft Authenticator backup format');
    }
  }

  /**
   * Import from Authy backup
   * @param {string} backupData - Backup JSON string
   * @returns {Array} Imported accounts
   */
  async importAuthy(backupData) {
    try {
      const data = JSON.parse(backupData);
      const accounts = [];
      
      // Authy backup format
      if (data.tokens && Array.isArray(data.tokens)) {
        for (const token of data.tokens) {
          accounts.push({
            id: crypto.randomUUID(),
            type: 'totp',
            issuer: token.name || 'Unknown',
            accountName: token.account_name || token.name,
            secret: token.encrypted_seed, // Note: May need decryption
            algorithm: 'SHA1',
            digits: token.digits || 6,
            period: 30,
            createdAt: Date.now(),
            needsDecryption: true
          });
        }
      }
      
      return accounts;
    } catch (error) {
      console.error('Authy import error:', error);
      throw new Error('Invalid Authy backup format');
    }
  }

  /**
   * Import from 2FAS backup
   * @param {string} backupData - Backup JSON string
   * @returns {Array} Imported accounts
   */
  async import2FAS(backupData) {
    try {
      const data = JSON.parse(backupData);
      const accounts = [];
      
      // 2FAS backup format
      if (data.services && Array.isArray(data.services)) {
        for (const service of data.services) {
          if (service.secret) {
            accounts.push({
              id: crypto.randomUUID(),
              type: service.type?.toLowerCase() || 'totp',
              issuer: service.name || service.issuer || 'Unknown',
              accountName: service.info || service.name,
              secret: service.secret,
              algorithm: service.algorithm || 'SHA1',
              digits: service.digits || 6,
              period: service.period || 30,
              tags: service.tags || [],
              icon: service.icon,
              createdAt: Date.now()
            });
          }
        }
      }
      
      return accounts;
    } catch (error) {
      console.error('2FAS import error:', error);
      throw new Error('Invalid 2FAS backup format');
    }
  }

  /**
   * Auto-detect format and import
   * @param {string} data - Import data
   * @returns {object} Import result
   */
  async autoImport(data) {
    // Try to detect format
    if (data.startsWith('otpauth-migration://')) {
      return {
        type: 'googleAuth',
        accounts: await this.importGoogleAuth(data)
      };
    }
    
    try {
      const json = JSON.parse(data);
      
      // Detect by structure
      if (json.shared_secret && json.account_name) {
        return {
          type: 'steam',
          accounts: await this.importSteam(data)
        };
      }
      
      if (json.accounts && json.accounts[0]?.username) {
        return {
          type: 'microsoftAuth',
          accounts: await this.importMicrosoftAuth(data)
        };
      }
      
      if (json.tokens) {
        return {
          type: 'authy',
          accounts: await this.importAuthy(data)
        };
      }
      
      if (json.services) {
        return {
          type: 'twofas',
          accounts: await this.import2FAS(data)
        };
      }
      
      throw new Error('Unknown format');
    } catch (error) {
      throw new Error('Could not detect import format');
    }
  }
}

export default new ImportService();