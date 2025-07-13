/**
 * Tag Service
 * @module services/tag
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@src/config/firebase';
import { Tag, DEFAULT_TAGS } from '@app-types/tag';
import { Account } from '@app-types/account';
import { store } from '@store/index';

export class TagService {
  private static readonly COLLECTION = 'tags';
  private static readonly PROJECT_PREFIX = 'fa2s_';

  /**
   * Initialize default tags for a new user
   */
  static async initializeDefaultTags(userId: string): Promise<void> {
    const batch = writeBatch(db);

    for (const defaultTag of DEFAULT_TAGS) {
      const tagRef = doc(collection(db, `users/${userId}/${this.COLLECTION}`));
      batch.set(tagRef, {
        ...defaultTag,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  }

  /**
   * Get all tags for the current user
   */
  static async getUserTags(userId: string): Promise<Tag[]> {
    const tagsRef = collection(db, `users/${userId}/${this.COLLECTION}`);
    const q = query(tagsRef, orderBy('name'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
      updatedAt: (doc.data().updatedAt as Timestamp)?.toDate() || new Date(),
    } as Tag));
  }

  /**
   * Create a new tag
   */
  static async createTag(userId: string, tag: Omit<Tag, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Tag> {
    // Check if tag name already exists
    const existingTags = await this.getUserTags(userId);
    if (existingTags.some(t => t.name.toLowerCase() === tag.name.toLowerCase())) {
      throw new Error('A tag with this name already exists');
    }

    const tagsRef = collection(db, `users/${userId}/${this.COLLECTION}`);
    const docRef = await addDoc(tagsRef, {
      ...tag,
      userId,
      isDefault: false,
      accountCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: docRef.id,
      ...tag,
      userId,
      isDefault: false,
      accountCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Update a tag
   */
  static async updateTag(userId: string, tagId: string, updates: Partial<Omit<Tag, 'id' | 'userId' | 'createdAt'>>): Promise<void> {
    const tagRef = doc(db, `users/${userId}/${this.COLLECTION}`, tagId);
    
    // If renaming, check for duplicates
    if (updates.name) {
      const existingTags = await this.getUserTags(userId);
      const duplicate = existingTags.find(t => 
        t.id !== tagId && t.name.toLowerCase() === updates.name!.toLowerCase()
      );
      if (duplicate) {
        throw new Error('A tag with this name already exists');
      }
    }

    await updateDoc(tagRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Delete a tag and remove it from all accounts
   */
  static async deleteTag(userId: string, tagId: string): Promise<void> {
    const batch = writeBatch(db);

    // Delete the tag
    const tagRef = doc(db, `users/${userId}/${this.COLLECTION}`, tagId);
    batch.delete(tagRef);

    // Remove tag from all accounts
    const accountsRef = collection(db, `users/${userId}/accounts`);
    const q = query(accountsRef, where('tags', 'array-contains', tagId));
    const snapshot = await getDocs(q);

    snapshot.docs.forEach(doc => {
      const account = doc.data() as Account;
      const updatedTags = account.tags.filter(t => t !== tagId);
      batch.update(doc.ref, { tags: updatedTags });
    });

    await batch.commit();
  }

  /**
   * Add tags to an account
   */
  static async addTagsToAccount(userId: string, accountId: string, tagIds: string[]): Promise<void> {
    const accountRef = doc(db, `users/${userId}/accounts`, accountId);
    const accountDoc = await getDocs(query(collection(db, `users/${userId}/accounts`), where('__name__', '==', accountId)));
    
    if (accountDoc.empty) {
      throw new Error('Account not found');
    }

    const account = accountDoc.docs[0].data() as Account;
    const currentTags = account.tags || [];
    const newTags = Array.from(new Set([...currentTags, ...tagIds]));

    await updateDoc(accountRef, {
      tags: newTags,
      updatedAt: serverTimestamp(),
    });

    // Update account count for added tags
    await this.updateTagCounts(userId, tagIds, 1);
  }

  /**
   * Remove tags from an account
   */
  static async removeTagsFromAccount(userId: string, accountId: string, tagIds: string[]): Promise<void> {
    const accountRef = doc(db, `users/${userId}/accounts`, accountId);
    const accountDoc = await getDocs(query(collection(db, `users/${userId}/accounts`), where('__name__', '==', accountId)));
    
    if (accountDoc.empty) {
      throw new Error('Account not found');
    }

    const account = accountDoc.docs[0].data() as Account;
    const currentTags = account.tags || [];
    const newTags = currentTags.filter(tag => !tagIds.includes(tag));

    await updateDoc(accountRef, {
      tags: newTags,
      updatedAt: serverTimestamp(),
    });

    // Update account count for removed tags
    await this.updateTagCounts(userId, tagIds, -1);
  }

  /**
   * Bulk add tags to multiple accounts
   */
  static async bulkAddTags(userId: string, accountIds: string[], tagIds: string[]): Promise<void> {
    const batch = writeBatch(db);

    for (const accountId of accountIds) {
      const accountRef = doc(db, `users/${userId}/accounts`, accountId);
      const accountDoc = await getDocs(query(collection(db, `users/${userId}/accounts`), where('__name__', '==', accountId)));
      
      if (!accountDoc.empty) {
        const account = accountDoc.docs[0].data() as Account;
        const currentTags = account.tags || [];
        const newTags = Array.from(new Set([...currentTags, ...tagIds]));
        
        batch.update(accountRef, {
          tags: newTags,
          updatedAt: serverTimestamp(),
        });
      }
    }

    await batch.commit();
    
    // Update tag counts
    await this.updateTagCounts(userId, tagIds, accountIds.length);
  }

  /**
   * Get accounts by tag
   */
  static async getAccountsByTag(userId: string, tagId: string): Promise<Account[]> {
    const accountsRef = collection(db, `users/${userId}/accounts`);
    const q = query(accountsRef, where('tags', 'array-contains', tagId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Account));
  }

  /**
   * Get accounts by multiple tags
   */
  static async getAccountsByTags(userId: string, tagIds: string[], mode: 'AND' | 'OR' = 'OR'): Promise<Account[]> {
    const accountsRef = collection(db, `users/${userId}/accounts`);
    
    if (mode === 'OR') {
      // For OR mode, we need to get all accounts and filter client-side
      const snapshot = await getDocs(accountsRef);
      const accounts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Account));
      
      return accounts.filter(account => 
        account.tags?.some(tag => tagIds.includes(tag))
      );
    } else {
      // For AND mode, we need to get all accounts and filter client-side
      const snapshot = await getDocs(accountsRef);
      const accounts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Account));
      
      return accounts.filter(account => 
        tagIds.every(tagId => account.tags?.includes(tagId))
      );
    }
  }

  /**
   * Update tag counts
   */
  private static async updateTagCounts(userId: string, tagIds: string[], delta: number): Promise<void> {
    const batch = writeBatch(db);

    for (const tagId of tagIds) {
      const tagRef = doc(db, `users/${userId}/${this.COLLECTION}`, tagId);
      const accountsWithTag = await this.getAccountsByTag(userId, tagId);
      
      batch.update(tagRef, {
        accountCount: accountsWithTag.length,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  }

  /**
   * Get tag suggestions based on issuer name
   */
  static getTagSuggestions(issuerName: string): string[] {
    const suggestions: string[] = [];
    const lowerIssuer = issuerName.toLowerCase();

    // Check for common patterns
    if (lowerIssuer.includes('bank') || lowerIssuer.includes('paypal') || lowerIssuer.includes('stripe')) {
      suggestions.push('Finance');
    }
    
    if (lowerIssuer.includes('google') || lowerIssuer.includes('microsoft') || lowerIssuer.includes('apple')) {
      suggestions.push('Work', 'Personal');
    }
    
    if (lowerIssuer.includes('facebook') || lowerIssuer.includes('twitter') || lowerIssuer.includes('instagram')) {
      suggestions.push('Social');
    }
    
    if (lowerIssuer.includes('amazon') || lowerIssuer.includes('ebay') || lowerIssuer.includes('shopify')) {
      suggestions.push('Shopping');
    }
    
    if (lowerIssuer.includes('github') || lowerIssuer.includes('gitlab') || lowerIssuer.includes('bitbucket')) {
      suggestions.push('Development');
    }

    return [...new Set(suggestions)];
  }

  /**
   * Get tag statistics
   */
  static async getTagStats(userId: string): Promise<{
    totalTags: number;
    mostUsedTags: Array<{ tag: Tag; count: number }>;
    unusedTags: Tag[];
  }> {
    const tags = await this.getUserTags(userId);
    
    const tagUsage = await Promise.all(
      tags.map(async tag => ({
        tag,
        count: tag.accountCount || 0,
      }))
    );

    const sortedByUsage = tagUsage.sort((a, b) => b.count - a.count);
    
    return {
      totalTags: tags.length,
      mostUsedTags: sortedByUsage.slice(0, 5),
      unusedTags: tags.filter(tag => (tag.accountCount || 0) === 0),
    };
  }
}