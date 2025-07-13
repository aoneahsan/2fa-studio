/**
 * Categories and Organization Service
 */

class CategoriesService {
  constructor() {
    this.defaultCategories = [
      { id: 'work', name: 'Work', icon: '💼', color: '#4285f4' },
      { id: 'personal', name: 'Personal', icon: '👤', color: '#34a853' },
      { id: 'finance', name: 'Finance', icon: '💰', color: '#fbbc04' },
      { id: 'social', name: 'Social', icon: '💬', color: '#ea4335' },
      { id: 'development', name: 'Development', icon: '💻', color: '#9c27b0' },
      { id: 'shopping', name: 'Shopping', icon: '🛒', color: '#ff5722' },
      { id: 'gaming', name: 'Gaming', icon: '🎮', color: '#00bcd4' },
      { id: 'other', name: 'Other', icon: '📌', color: '#607d8b' }
    ];
  }

  /**
   * Initialize categories if not exists
   */
  async initializeCategories() {
    try {
      const storage = await chrome.storage.local.get(['categories']);
      
      if (!storage.categories || storage.categories.length === 0) {
        await chrome.storage.local.set({ 
          categories: this.defaultCategories 
        });
        return this.defaultCategories;
      }
      
      return storage.categories;
    } catch (error) {
      console.error('Failed to initialize categories:', error);
      return this.defaultCategories;
    }
  }

  /**
   * Get all categories
   */
  async getCategories() {
    try {
      const storage = await chrome.storage.local.get(['categories']);
      return storage.categories || await this.initializeCategories();
    } catch (error) {
      console.error('Failed to get categories:', error);
      return this.defaultCategories;
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(categoryId) {
    const categories = await this.getCategories();
    return categories.find(cat => cat.id === categoryId);
  }

  /**
   * Create new category
   */
  async createCategory(categoryData) {
    try {
      const categories = await this.getCategories();
      
      // Generate ID if not provided
      const newCategory = {
        id: categoryData.id || this.generateCategoryId(categoryData.name),
        name: categoryData.name,
        icon: categoryData.icon || '📁',
        color: categoryData.color || '#607d8b',
        createdAt: Date.now()
      };
      
      // Check for duplicate
      if (categories.some(cat => cat.id === newCategory.id)) {
        throw new Error('Category already exists');
      }
      
      categories.push(newCategory);
      await chrome.storage.local.set({ categories });
      
      return newCategory;
    } catch (error) {
      console.error('Failed to create category:', error);
      throw error;
    }
  }

  /**
   * Update category
   */
  async updateCategory(categoryId, updates) {
    try {
      const categories = await this.getCategories();
      const index = categories.findIndex(cat => cat.id === categoryId);
      
      if (index === -1) {
        throw new Error('Category not found');
      }
      
      // Don't allow updating default categories' IDs
      if (this.defaultCategories.some(cat => cat.id === categoryId) && updates.id) {
        delete updates.id;
      }
      
      categories[index] = {
        ...categories[index],
        ...updates,
        updatedAt: Date.now()
      };
      
      await chrome.storage.local.set({ categories });
      
      return categories[index];
    } catch (error) {
      console.error('Failed to update category:', error);
      throw error;
    }
  }

  /**
   * Delete category
   */
  async deleteCategory(categoryId) {
    try {
      // Don't allow deleting default categories
      if (this.defaultCategories.some(cat => cat.id === categoryId)) {
        throw new Error('Cannot delete default category');
      }
      
      const categories = await this.getCategories();
      const filtered = categories.filter(cat => cat.id !== categoryId);
      
      if (filtered.length === categories.length) {
        throw new Error('Category not found');
      }
      
      await chrome.storage.local.set({ categories: filtered });
      
      // Move accounts from deleted category to 'other'
      await this.moveAccountsToCategory(categoryId, 'other');
      
      return { success: true };
    } catch (error) {
      console.error('Failed to delete category:', error);
      throw error;
    }
  }

  /**
   * Assign account to category
   */
  async assignAccountToCategory(accountId, categoryId) {
    try {
      const storage = await chrome.storage.local.get(['accounts']);
      const accounts = storage.accounts || [];
      
      const accountIndex = accounts.findIndex(acc => acc.id === accountId);
      if (accountIndex === -1) {
        throw new Error('Account not found');
      }
      
      accounts[accountIndex].category = categoryId;
      accounts[accountIndex].updatedAt = Date.now();
      
      await chrome.storage.local.set({ accounts });
      
      return accounts[accountIndex];
    } catch (error) {
      console.error('Failed to assign category:', error);
      throw error;
    }
  }

  /**
   * Get accounts by category
   */
  async getAccountsByCategory(categoryId) {
    try {
      const storage = await chrome.storage.local.get(['accounts']);
      const accounts = storage.accounts || [];
      
      if (categoryId === 'all') {
        return accounts;
      }
      
      if (categoryId === 'uncategorized') {
        return accounts.filter(acc => !acc.category);
      }
      
      return accounts.filter(acc => acc.category === categoryId);
    } catch (error) {
      console.error('Failed to get accounts by category:', error);
      return [];
    }
  }

  /**
   * Get category statistics
   */
  async getCategoryStats() {
    try {
      const [categories, accounts] = await Promise.all([
        this.getCategories(),
        chrome.storage.local.get(['accounts']).then(s => s.accounts || [])
      ]);
      
      const stats = {
        total: accounts.length,
        byCategory: {},
        uncategorized: 0
      };
      
      // Initialize category counts
      categories.forEach(cat => {
        stats.byCategory[cat.id] = {
          count: 0,
          percentage: 0,
          category: cat
        };
      });
      
      // Count accounts
      accounts.forEach(account => {
        if (account.category && stats.byCategory[account.category]) {
          stats.byCategory[account.category].count++;
        } else {
          stats.uncategorized++;
        }
      });
      
      // Calculate percentages
      Object.values(stats.byCategory).forEach(catStat => {
        catStat.percentage = stats.total > 0 
          ? Math.round((catStat.count / stats.total) * 100) 
          : 0;
      });
      
      stats.uncategorizedPercentage = stats.total > 0 
        ? Math.round((stats.uncategorized / stats.total) * 100) 
        : 0;
      
      return stats;
    } catch (error) {
      console.error('Failed to get category stats:', error);
      return null;
    }
  }

  /**
   * Move all accounts from one category to another
   */
  async moveAccountsToCategory(fromCategoryId, toCategoryId) {
    try {
      const storage = await chrome.storage.local.get(['accounts']);
      const accounts = storage.accounts || [];
      
      let movedCount = 0;
      accounts.forEach(account => {
        if (account.category === fromCategoryId) {
          account.category = toCategoryId;
          account.updatedAt = Date.now();
          movedCount++;
        }
      });
      
      if (movedCount > 0) {
        await chrome.storage.local.set({ accounts });
      }
      
      return { movedCount };
    } catch (error) {
      console.error('Failed to move accounts:', error);
      throw error;
    }
  }

  /**
   * Generate category ID from name
   */
  generateCategoryId(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  /**
   * Export categories
   */
  async exportCategories() {
    try {
      const categories = await this.getCategories();
      return {
        version: 1,
        categories: categories,
        exportedAt: Date.now()
      };
    } catch (error) {
      console.error('Failed to export categories:', error);
      throw error;
    }
  }

  /**
   * Import categories
   */
  async importCategories(data) {
    try {
      if (!data.categories || !Array.isArray(data.categories)) {
        throw new Error('Invalid import data');
      }
      
      const currentCategories = await this.getCategories();
      const imported = [];
      
      for (const category of data.categories) {
        // Skip if already exists
        if (!currentCategories.some(cat => cat.id === category.id)) {
          imported.push(category);
        }
      }
      
      if (imported.length > 0) {
        const newCategories = [...currentCategories, ...imported];
        await chrome.storage.local.set({ categories: newCategories });
      }
      
      return { imported: imported.length };
    } catch (error) {
      console.error('Failed to import categories:', error);
      throw error;
    }
  }
}

export default new CategoriesService();