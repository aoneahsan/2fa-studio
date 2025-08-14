/**
 * API Service
 * Handles API endpoints for SDK integration
 * @module services/api
 */

// Unified error handling is handled by UnifiedErrorService
import FirebaseService from './firebase.service';
import { OTPService } from './otp.service';
import { EncryptionService } from './encryption.service';

export interface APIKey {
  id: string;
  userId: string;
  key: string;
  name: string;
  permissions: string[];
  createdAt: Date;
  lastUsed?: Date;
  expiresAt?: Date;
}

export class APIService {
  private static readonly API_KEY_PREFIX = 'sk_';
  private static readonly API_KEY_LENGTH = 32;

  /**
   * Generate new API key
   */
  static async generateAPIKey(
    userId: string,
    name: string,
    permissions: string[] = ['read:accounts', 'generate:codes']
  ): Promise<APIKey> {
    return UnifiedErrorHandling.withTryCatch(
      async () => {
        const key = this.API_KEY_PREFIX + EncryptionService.generateRandomKey(this.API_KEY_LENGTH);
        const hashedKey = await EncryptionService.hash(key);

        const apiKey: APIKey = {
          id: `apikey_${Date.now()}`,
          userId,
          key: hashedKey, // Store hashed version
          name,
          permissions,
          createdAt: new Date()
        };

        // Store in Firestore
        await FirebaseService.firestore
          .collection('apiKeys')
          .doc(apiKey.id)
          .set({
            ...apiKey,
            createdAt: FirebaseService.timestamp()
          });

        // Return with actual key (only shown once)
        return { ...apiKey, key };
      },
      {
        operation: 'APIService.generateAPIKey',
        metadata: { userId, name }
      }
    );
  }

  /**
   * Validate API key
   */
  static async validateAPIKey(apiKey: string): Promise<APIKey | null> {
    return UnifiedErrorHandling.withTryCatch(
      async () => {
        if (!apiKey.startsWith(this.API_KEY_PREFIX)) {
          return null;
        }

        const hashedKey = await EncryptionService.hash(apiKey);

        // Find API key by hash
        const snapshot = await FirebaseService.firestore
          .collection('apiKeys')
          .where('key', '==', hashedKey)
          .limit(1)
          .get();

        if (snapshot.empty) {
          return null;
        }

        const doc = snapshot.docs[0];
        const data = doc.data() as APIKey;

        // Check expiration
        if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
          return null;
        }

        // Update last used
        await doc.ref.update({
          lastUsed: FirebaseService.timestamp()
        });

        return { ...data, id: doc.id };
      },
      {
        operation: 'APIService.validateAPIKey',
        metadata: { hasKey: !!apiKey }
      }
    );
  }

  /**
   * Check if API key has permission
   */
  static hasPermission(apiKey: APIKey, permission: string): boolean {
    return apiKey.permissions.includes(permission) || apiKey.permissions.includes('*');
  }

  /**
   * List user's API keys
   */
  static async listAPIKeys(userId: string): Promise<APIKey[]> {
    return UnifiedErrorHandling.withTryCatch(
      async () => {
        const snapshot = await FirebaseService.firestore
          .collection('apiKeys')
          .where('userId', '==', userId)
          .orderBy('createdAt', 'desc')
          .get();

        return snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          key: '***' // Don't return actual keys
        } as APIKey));
      },
      {
        operation: 'APIService.listAPIKeys',
        metadata: { userId }
      }
    );
  }

  /**
   * Revoke API key
   */
  static async revokeAPIKey(userId: string, apiKeyId: string): Promise<void> {
    return UnifiedErrorHandling.withTryCatch(
      async () => {
        const doc = await FirebaseService.firestore
          .collection('apiKeys')
          .doc(apiKeyId)
          .get();

        if (!doc.exists || doc.data()?.userId !== userId) {
          throw new Error('API key not found');
        }

        await doc.ref.delete();
      },
      {
        operation: 'APIService.revokeAPIKey',
        metadata: { userId, apiKeyId }
      }
    );
  }
}