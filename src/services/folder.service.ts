/**
 * Folder Service
 * @module services/folder
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
import { Folder, FolderTree, DEFAULT_FOLDERS } from '@types/folder';
import { Account } from '@types/account';

export class FolderService {
  private static readonly COLLECTION = 'folders';
  private static readonly PROJECT_PREFIX = 'fa2s_';

  /**
   * Initialize default folders for a new user
   */
  static async initializeDefaultFolders(userId: string): Promise<void> {
    const batch = writeBatch(db);

    for (const defaultFolder of DEFAULT_FOLDERS) {
      const folderRef = doc(collection(db, `users/${userId}/${this.COLLECTION}`));
      batch.set(folderRef, {
        ...defaultFolder,
        userId,
        accountCount: 0,
        subfolderCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  }

  /**
   * Get all folders for the current user
   */
  static async getUserFolders(userId: string): Promise<Folder[]> {
    const foldersRef = collection(db, `users/${userId}/${this.COLLECTION}`);
    const q = query(foldersRef, orderBy('name'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
      updatedAt: (doc.data().updatedAt as Timestamp)?.toDate() || new Date(),
    } as Folder));
  }

  /**
   * Get folder tree structure
   */
  static async getFolderTree(userId: string): Promise<FolderTree[]> {
    const folders = await this.getUserFolders(userId);
    return this.buildFolderTree(folders);
  }

  /**
   * Build folder tree from flat list
   */
  private static buildFolderTree(folders: Folder[], parentId: string | null = null, level: number = 0): FolderTree[] {
    return folders
      .filter(folder => folder.parentId === parentId)
      .map(folder => ({
        ...folder,
        level,
        children: this.buildFolderTree(folders, folder.id, level + 1),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Create a new folder
   */
  static async createFolder(userId: string, folder: Omit<Folder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Folder> {
    // Check if folder name already exists in the same parent
    const existingFolders = await this.getUserFolders(userId);
    const duplicate = existingFolders.find(f => 
      f.name.toLowerCase() === folder.name.toLowerCase() && 
      f.parentId === folder.parentId
    );
    
    if (duplicate) {
      throw new Error('A folder with this name already exists in the same location');
    }

    // Check for circular reference
    if (folder.parentId) {
      const parentPath = await this.getFolderPath(userId, folder.parentId);
      if (parentPath.length > 5) {
        throw new Error('Folder nesting is limited to 5 levels');
      }
    }

    const foldersRef = collection(db, `users/${userId}/${this.COLLECTION}`);
    const docRef = await addDoc(foldersRef, {
      ...folder,
      userId,
      accountCount: 0,
      subfolderCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Update parent's subfolder count
    if (folder.parentId) {
      await this.updateSubfolderCount(userId, folder.parentId);
    }

    return {
      id: docRef.id,
      ...folder,
      userId,
      accountCount: 0,
      subfolderCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Update a folder
   */
  static async updateFolder(userId: string, folderId: string, updates: Partial<Omit<Folder, 'id' | 'userId' | 'createdAt'>>): Promise<void> {
    const folderRef = doc(db, `users/${userId}/${this.COLLECTION}`, folderId);
    
    // If renaming, check for duplicates
    if (updates.name) {
      const existingFolders = await this.getUserFolders(userId);
      const currentFolder = existingFolders.find(f => f.id === folderId);
      const duplicate = existingFolders.find(f => 
        f.id !== folderId && 
        f.name.toLowerCase() === updates.name!.toLowerCase() && 
        f.parentId === (updates.parentId !== undefined ? updates.parentId : currentFolder?.parentId)
      );
      
      if (duplicate) {
        throw new Error('A folder with this name already exists in the same location');
      }
    }

    await updateDoc(folderRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Move a folder to a new parent
   */
  static async moveFolder(userId: string, folderId: string, newParentId: string | null): Promise<void> {
    // Check for circular reference
    if (newParentId) {
      const parentPath = await this.getFolderPath(userId, newParentId);
      if (parentPath.includes(folderId)) {
        throw new Error('Cannot move a folder into its own subfolder');
      }
      if (parentPath.length >= 5) {
        throw new Error('Folder nesting is limited to 5 levels');
      }
    }

    const folders = await this.getUserFolders(userId);
    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
      throw new Error('Folder not found');
    }

    const oldParentId = folder.parentId;

    // Update the folder
    await this.updateFolder(userId, folderId, { parentId: newParentId });

    // Update subfolder counts
    if (oldParentId) {
      await this.updateSubfolderCount(userId, oldParentId);
    }
    if (newParentId) {
      await this.updateSubfolderCount(userId, newParentId);
    }
  }

  /**
   * Delete a folder and optionally move its contents
   */
  static async deleteFolder(userId: string, folderId: string, moveContentsTo: string | null = null): Promise<void> {
    const batch = writeBatch(db);

    // Get all subfolders
    const folders = await this.getUserFolders(userId);
    const subfolders = this.getAllSubfolders(folders, folderId);

    // Get all accounts in this folder and subfolders
    const folderIds = [folderId, ...subfolders.map(f => f.id)];
    const accountsRef = collection(db, `users/${userId}/accounts`);
    const accountsQuery = query(accountsRef, where('folderId', 'in', folderIds));
    const accountsSnapshot = await getDocs(accountsQuery);

    if (moveContentsTo !== null) {
      // Move all accounts to the target folder
      accountsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { folderId: moveContentsTo });
      });

      // Move all immediate subfolders to the target folder
      const immediateSubfolders = folders.filter(f => f.parentId === folderId);
      immediateSubfolders.forEach(subfolder => {
        const subfolderRef = doc(db, `users/${userId}/${this.COLLECTION}`, subfolder.id);
        batch.update(subfolderRef, { parentId: moveContentsTo });
      });
    } else {
      // Delete all accounts in this folder and subfolders
      accountsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete all subfolders
      subfolders.forEach(subfolder => {
        const subfolderRef = doc(db, `users/${userId}/${this.COLLECTION}`, subfolder.id);
        batch.delete(subfolderRef);
      });
    }

    // Delete the folder itself
    const folderRef = doc(db, `users/${userId}/${this.COLLECTION}`, folderId);
    batch.delete(folderRef);

    await batch.commit();

    // Update parent's subfolder count
    const folder = folders.find(f => f.id === folderId);
    if (folder?.parentId) {
      await this.updateSubfolderCount(userId, folder.parentId);
    }
    if (moveContentsTo) {
      await this.updateSubfolderCount(userId, moveContentsTo);
    }
  }

  /**
   * Move accounts to a folder
   */
  static async moveAccountsToFolder(userId: string, accountIds: string[], folderId: string | null): Promise<void> {
    const batch = writeBatch(db);

    for (const accountId of accountIds) {
      const accountRef = doc(db, `users/${userId}/accounts`, accountId);
      batch.update(accountRef, {
        folderId,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();

    // Update account counts
    await this.updateAccountCounts(userId);
  }

  /**
   * Get accounts in a folder
   */
  static async getAccountsInFolder(userId: string, folderId: string | null): Promise<Account[]> {
    const accountsRef = collection(db, `users/${userId}/accounts`);
    const q = folderId 
      ? query(accountsRef, where('folderId', '==', folderId))
      : query(accountsRef, where('folderId', 'in', [null, '']));
    
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Account));
  }

  /**
   * Get folder path (breadcrumb)
   */
  static async getFolderPath(userId: string, folderId: string): Promise<string[]> {
    const folders = await this.getUserFolders(userId);
    const path: string[] = [];
    let currentId: string | null = folderId;

    while (currentId) {
      const folder = folders.find(f => f.id === currentId);
      if (!folder) break;
      path.unshift(currentId);
      currentId = folder.parentId;
    }

    return path;
  }

  /**
   * Get all subfolders recursively
   */
  private static getAllSubfolders(folders: Folder[], parentId: string): Folder[] {
    const subfolders: Folder[] = [];
    const immediateSubfolders = folders.filter(f => f.parentId === parentId);

    for (const subfolder of immediateSubfolders) {
      subfolders.push(subfolder);
      subfolders.push(...this.getAllSubfolders(folders, subfolder.id));
    }

    return subfolders;
  }

  /**
   * Update subfolder count for a folder
   */
  private static async updateSubfolderCount(userId: string, folderId: string): Promise<void> {
    const folders = await this.getUserFolders(userId);
    const subfolderCount = folders.filter(f => f.parentId === folderId).length;

    const folderRef = doc(db, `users/${userId}/${this.COLLECTION}`, folderId);
    await updateDoc(folderRef, {
      subfolderCount,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Update account counts for all folders
   */
  static async updateAccountCounts(userId: string): Promise<void> {
    const folders = await this.getUserFolders(userId);
    const batch = writeBatch(db);

    for (const folder of folders) {
      const accounts = await this.getAccountsInFolder(userId, folder.id);
      const folderRef = doc(db, `users/${userId}/${this.COLLECTION}`, folder.id);
      batch.update(folderRef, {
        accountCount: accounts.length,
      });
    }

    await batch.commit();
  }

  /**
   * Get folder statistics
   */
  static async getFolderStats(userId: string): Promise<{
    totalFolders: number;
    maxDepth: number;
    averageAccountsPerFolder: number;
    emptyFolders: Folder[];
  }> {
    const folders = await this.getUserFolders(userId);
    const tree = await this.getFolderTree(userId);
    
    const getMaxDepth = (nodes: FolderTree[]): number => {
      if (nodes.length === 0) return 0;
      return Math.max(...nodes.map(node => 
        node.children.length > 0 ? 1 + getMaxDepth(node.children) : 1
      ));
    };

    const totalAccounts = folders.reduce((sum, folder) => sum + (folder.accountCount || 0), 0);
    const averageAccountsPerFolder = folders.length > 0 ? totalAccounts / folders.length : 0;

    return {
      totalFolders: folders.length,
      maxDepth: getMaxDepth(tree),
      averageAccountsPerFolder,
      emptyFolders: folders.filter(f => (f.accountCount || 0) === 0),
    };
  }
}