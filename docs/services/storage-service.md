# Storage Service

## Overview

The `StorageService` provides a universal storage API using the `strata-storage` package (v2.0.3). It offers a consistent interface for storing data across all platforms (iOS, Android, Web) with automatic platform detection and optimization.

## Features

- ✅ Cross-platform storage (iOS, Android, Web)
- ✅ Automatic JSON serialization/deserialization
- ✅ Type-safe storage and retrieval
- ✅ Bulk operations support
- ✅ Storage migration utilities
- ✅ Encryption support for sensitive data
- ✅ Storage quota management

## API Reference

### Basic Operations

```typescript
import { StorageService } from '@services/storage.service';

// Store data
await StorageService.set('user_preferences', {
  theme: 'dark',
  language: 'en',
  notifications: true
});

// Retrieve data
const preferences = await StorageService.get<UserPreferences>('user_preferences');

// Remove data
await StorageService.remove('user_preferences');

// Clear all storage
await StorageService.clear();
```

### Checking Existence

```typescript
// Check if key exists
const exists = await StorageService.has('user_preferences');

// Get all keys
const keys = await StorageService.keys();
```

### Bulk Operations

```typescript
// Set multiple values
await StorageService.setMultiple({
  'pref_theme': 'dark',
  'pref_language': 'en',
  'pref_notifications': true
});

// Get multiple values
const values = await StorageService.getMultiple([
  'pref_theme',
  'pref_language',
  'pref_notifications'
]);

// Remove multiple keys
await StorageService.removeMultiple([
  'pref_theme',
  'pref_language'
]);
```

### Advanced Features

```typescript
// Get storage info
const info = await StorageService.getStorageInfo();
// Returns: {
//   used: number;      // bytes used
//   quota: number;     // total quota
//   platform: string;  // current platform
// }

// Migrate data between keys
await StorageService.migrate('old_key', 'new_key');

// Export all data
const allData = await StorageService.exportAll();

// Import data
await StorageService.importData(allData);
```

## Usage Examples

### User Settings

```typescript
interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  biometricEnabled: boolean;
  autoBackup: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export class SettingsManager {
  private static readonly SETTINGS_KEY = 'user_settings';
  
  static async getSettings(): Promise<UserSettings> {
    const settings = await StorageService.get<UserSettings>(this.SETTINGS_KEY);
    return settings || this.getDefaultSettings();
  }
  
  static async updateSettings(settings: Partial<UserSettings>): Promise<void> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    await StorageService.set(this.SETTINGS_KEY, updated);
  }
  
  static async resetSettings(): Promise<void> {
    await StorageService.set(this.SETTINGS_KEY, this.getDefaultSettings());
  }
  
  private static getDefaultSettings(): UserSettings {
    return {
      theme: 'system',
      language: 'en',
      biometricEnabled: false,
      autoBackup: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    };
  }
}
```

### Secure Storage for 2FA Accounts

```typescript
import { StorageService } from '@services/storage.service';
import CryptoJS from 'crypto-js';

export class SecureAccountStorage {
  private static readonly ACCOUNTS_KEY = 'encrypted_accounts';
  
  static async saveAccount(account: TOTPAccount, encryptionKey: string): Promise<void> {
    // Get existing accounts
    const encrypted = await StorageService.get<string>(this.ACCOUNTS_KEY);
    const accounts = encrypted 
      ? this.decrypt(encrypted, encryptionKey)
      : [];
    
    // Add new account
    accounts.push(account);
    
    // Encrypt and save
    const newEncrypted = this.encrypt(accounts, encryptionKey);
    await StorageService.set(this.ACCOUNTS_KEY, newEncrypted);
  }
  
  static async getAccounts(encryptionKey: string): Promise<TOTPAccount[]> {
    const encrypted = await StorageService.get<string>(this.ACCOUNTS_KEY);
    if (!encrypted) return [];
    
    try {
      return this.decrypt(encrypted, encryptionKey);
    } catch (error) {
      console.error('Failed to decrypt accounts:', error);
      return [];
    }
  }
  
  private static encrypt(data: any, key: string): string {
    return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
  }
  
  private static decrypt(encrypted: string, key: string): any {
    const decrypted = CryptoJS.AES.decrypt(encrypted, key);
    return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
  }
}
```

### Session Management

```typescript
interface SessionData {
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: number;
}

export class SessionManager {
  private static readonly SESSION_KEY = 'user_session';
  
  static async createSession(sessionData: SessionData): Promise<void> {
    await StorageService.set(this.SESSION_KEY, sessionData);
  }
  
  static async getSession(): Promise<SessionData | null> {
    const session = await StorageService.get<SessionData>(this.SESSION_KEY);
    
    // Check if session is expired
    if (session && session.expiresAt < Date.now()) {
      await this.clearSession();
      return null;
    }
    
    return session;
  }
  
  static async clearSession(): Promise<void> {
    await StorageService.remove(this.SESSION_KEY);
  }
  
  static async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return session !== null;
  }
}
```

### Cache Management

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // time to live in milliseconds
}

export class CacheManager {
  static async set<T>(key: string, data: T, ttl: number = 3600000): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl
    };
    await StorageService.set(`cache_${key}`, entry);
  }
  
  static async get<T>(key: string): Promise<T | null> {
    const entry = await StorageService.get<CacheEntry<T>>(`cache_${key}`);
    
    if (!entry) return null;
    
    // Check if cache is expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      await StorageService.remove(`cache_${key}`);
      return null;
    }
    
    return entry.data;
  }
  
  static async clearExpired(): Promise<void> {
    const keys = await StorageService.keys();
    const cacheKeys = keys.filter(k => k.startsWith('cache_'));
    
    for (const key of cacheKeys) {
      const entry = await StorageService.get<CacheEntry<any>>(key);
      if (entry && Date.now() - entry.timestamp > entry.ttl) {
        await StorageService.remove(key);
      }
    }
  }
}
```

## Migration from @capacitor/preferences

```typescript
// Old code using @capacitor/preferences
import { Preferences } from '@capacitor/preferences';
await Preferences.set({ key: 'name', value: 'John' });
const { value } = await Preferences.get({ key: 'name' });

// New code using StorageService
import { StorageService } from '@services/storage.service';
await StorageService.set('name', 'John');
const value = await StorageService.get('name');
```

## Platform-Specific Behavior

### Web
- Uses localStorage for small data
- Uses IndexedDB for large data
- Automatic fallback if quota exceeded

### iOS
- Uses UserDefaults for small data
- Uses Keychain for secure data
- Uses Documents directory for large data

### Android
- Uses SharedPreferences for small data
- Uses Android Keystore for secure data
- Uses Internal Storage for large data

## Best Practices

1. **Use type parameters** for type-safe retrieval
2. **Handle null values** when data might not exist
3. **Implement data versioning** for migrations
4. **Clear expired data** periodically
5. **Don't store sensitive data** without encryption
6. **Monitor storage quota** on web platform
7. **Use bulk operations** for better performance

## Storage Limits

| Platform | Limit | Notes |
|----------|-------|-------|
| Web | 5-10MB (localStorage) | Use IndexedDB for larger data |
| iOS | No hard limit | Practical limit ~100MB |
| Android | No hard limit | Practical limit ~100MB |

## Error Handling

```typescript
try {
  await StorageService.set('key', largeData);
} catch (error) {
  if (error.code === 'QUOTA_EXCEEDED') {
    // Handle storage quota exceeded
    await StorageService.clear();
  } else if (error.code === 'PERMISSION_DENIED') {
    // Handle permission issues
  } else {
    // Handle other errors
    console.error('Storage error:', error);
  }
}
```