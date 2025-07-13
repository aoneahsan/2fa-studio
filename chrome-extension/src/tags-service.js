/**
 * Tags and Favorites Service
 */

class TagsService {
  constructor() {
    this.maxTagsPerAccount = 10;
    this.maxTagLength = 20;
  }

  /**
   * Initialize tags storage
   */
  async initializeTags() {
    try {
      const storage = await chrome.storage.local.get(['tags']);
      
      if (!storage.tags) {
        await chrome.storage.local.set({ 
          tags: {
            allTags: [],
            tagColors: {}
          }
        });
      }
    } catch (error) {
      console.error('Failed to initialize tags:', error);
    }
  }

  /**
   * Get all unique tags
   */
  async getAllTags() {
    try {
      const storage = await chrome.storage.local.get(['tags', 'accounts']);
      const accounts = storage.accounts || [];
      const tagColors = storage.tags?.tagColors || {};
      
      // Collect all unique tags
      const tagSet = new Set();
      accounts.forEach(account => {
        if (account.tags && Array.isArray(account.tags)) {
          account.tags.forEach(tag => tagSet.add(tag));
        }
      });
      
      // Convert to array with colors
      const allTags = Array.from(tagSet).map(tag => ({
        name: tag,
        color: tagColors[tag] || this.generateTagColor(tag),
        count: accounts.filter(acc => 
          acc.tags && acc.tags.includes(tag)
        ).length
      }));
      
      // Sort by usage count
      allTags.sort((a, b) => b.count - a.count);
      
      return allTags;
    } catch (error) {
      console.error('Failed to get all tags:', error);
      return [];
    }
  }

  /**
   * Add tags to account
   */
  async addTagsToAccount(accountId, tags) {
    try {
      const storage = await chrome.storage.local.get(['accounts', 'tags']);
      const accounts = storage.accounts || [];
      const tagData = storage.tags || { allTags: [], tagColors: {} };
      
      const accountIndex = accounts.findIndex(acc => acc.id === accountId);
      if (accountIndex === -1) {
        throw new Error('Account not found');
      }
      
      // Normalize and validate tags
      const normalizedTags = tags
        .map(tag => this.normalizeTag(tag))
        .filter(tag => tag && tag.length <= this.maxTagLength);
      
      // Initialize tags array if needed
      if (!accounts[accountIndex].tags) {
        accounts[accountIndex].tags = [];
      }
      
      // Add new tags (avoid duplicates)
      const currentTags = new Set(accounts[accountIndex].tags);
      normalizedTags.forEach(tag => currentTags.add(tag));
      
      // Enforce max tags limit
      const tagsArray = Array.from(currentTags);
      if (tagsArray.length > this.maxTagsPerAccount) {
        throw new Error(`Maximum ${this.maxTagsPerAccount} tags allowed per account`);
      }
      
      accounts[accountIndex].tags = tagsArray;
      accounts[accountIndex].updatedAt = Date.now();
      
      // Update tag colors
      normalizedTags.forEach(tag => {
        if (!tagData.tagColors[tag]) {
          tagData.tagColors[tag] = this.generateTagColor(tag);
        }
      });
      
      await chrome.storage.local.set({ 
        accounts,
        tags: tagData
      });
      
      return accounts[accountIndex];
    } catch (error) {
      console.error('Failed to add tags:', error);
      throw error;
    }
  }

  /**
   * Remove tag from account
   */
  async removeTagFromAccount(accountId, tag) {
    try {
      const storage = await chrome.storage.local.get(['accounts']);
      const accounts = storage.accounts || [];
      
      const accountIndex = accounts.findIndex(acc => acc.id === accountId);
      if (accountIndex === -1) {
        throw new Error('Account not found');
      }
      
      if (!accounts[accountIndex].tags) {
        return accounts[accountIndex];
      }
      
      accounts[accountIndex].tags = accounts[accountIndex].tags.filter(
        t => t !== tag
      );
      accounts[accountIndex].updatedAt = Date.now();
      
      await chrome.storage.local.set({ accounts });
      
      return accounts[accountIndex];
    } catch (error) {
      console.error('Failed to remove tag:', error);
      throw error;
    }
  }

  /**
   * Get accounts by tag
   */
  async getAccountsByTag(tag) {
    try {
      const storage = await chrome.storage.local.get(['accounts']);
      const accounts = storage.accounts || [];
      
      return accounts.filter(account => 
        account.tags && account.tags.includes(tag)
      );
    } catch (error) {
      console.error('Failed to get accounts by tag:', error);
      return [];
    }
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(accountId) {
    try {
      const storage = await chrome.storage.local.get(['accounts']);
      const accounts = storage.accounts || [];
      
      const accountIndex = accounts.findIndex(acc => acc.id === accountId);
      if (accountIndex === -1) {
        throw new Error('Account not found');
      }
      
      accounts[accountIndex].isFavorite = !accounts[accountIndex].isFavorite;
      accounts[accountIndex].updatedAt = Date.now();
      
      await chrome.storage.local.set({ accounts });
      
      return accounts[accountIndex];
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      throw error;
    }
  }

  /**
   * Get favorite accounts
   */
  async getFavoriteAccounts() {
    try {
      const storage = await chrome.storage.local.get(['accounts']);
      const accounts = storage.accounts || [];
      
      return accounts.filter(account => account.isFavorite);
    } catch (error) {
      console.error('Failed to get favorites:', error);
      return [];
    }
  }

  /**
   * Sort accounts
   */
  async sortAccounts(sortBy = 'name', order = 'asc') {
    try {
      const storage = await chrome.storage.local.get(['accounts']);
      const accounts = storage.accounts || [];
      
      // Define sort functions
      const sortFunctions = {
        name: (a, b) => a.issuer.localeCompare(b.issuer),
        usage: (a, b) => (b.lastUsed || 0) - (a.lastUsed || 0),
        date: (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
        category: (a, b) => (a.category || '').localeCompare(b.category || ''),
        favorite: (a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0)
      };
      
      const sortFunction = sortFunctions[sortBy] || sortFunctions.name;
      accounts.sort(sortFunction);
      
      if (order === 'desc') {
        accounts.reverse();
      }
      
      // Favorites always first if not sorting by favorite
      if (sortBy !== 'favorite') {
        const favorites = accounts.filter(a => a.isFavorite);
        const nonFavorites = accounts.filter(a => !a.isFavorite);
        return [...favorites, ...nonFavorites];
      }
      
      return accounts;
    } catch (error) {
      console.error('Failed to sort accounts:', error);
      return [];
    }
  }

  /**
   * Update account usage stats
   */
  async updateAccountUsage(accountId) {
    try {
      const storage = await chrome.storage.local.get(['accounts']);
      const accounts = storage.accounts || [];
      
      const accountIndex = accounts.findIndex(acc => acc.id === accountId);
      if (accountIndex === -1) {
        return;
      }
      
      accounts[accountIndex].lastUsed = Date.now();
      accounts[accountIndex].usageCount = (accounts[accountIndex].usageCount || 0) + 1;
      
      await chrome.storage.local.set({ accounts });
    } catch (error) {
      console.error('Failed to update usage:', error);
    }
  }

  /**
   * Get tag suggestions based on issuer
   */
  getTagSuggestions(issuer) {
    const suggestions = [];
    const issuerLower = issuer.toLowerCase();
    
    // Category-based suggestions
    if (issuerLower.includes('google') || issuerLower.includes('microsoft') || 
        issuerLower.includes('slack') || issuerLower.includes('zoom')) {
      suggestions.push('work');
    }
    
    if (issuerLower.includes('bank') || issuerLower.includes('paypal') || 
        issuerLower.includes('stripe') || issuerLower.includes('coinbase')) {
      suggestions.push('finance', 'important');
    }
    
    if (issuerLower.includes('facebook') || issuerLower.includes('twitter') || 
        issuerLower.includes('instagram') || issuerLower.includes('linkedin')) {
      suggestions.push('social');
    }
    
    if (issuerLower.includes('github') || issuerLower.includes('gitlab') || 
        issuerLower.includes('aws') || issuerLower.includes('digitalocean')) {
      suggestions.push('development', 'code');
    }
    
    if (issuerLower.includes('amazon') || issuerLower.includes('ebay') || 
        issuerLower.includes('shopify')) {
      suggestions.push('shopping');
    }
    
    if (issuerLower.includes('steam') || issuerLower.includes('xbox') || 
        issuerLower.includes('playstation') || issuerLower.includes('nintendo')) {
      suggestions.push('gaming');
    }
    
    return [...new Set(suggestions)];
  }

  /**
   * Normalize tag
   */
  normalizeTag(tag) {
    return tag
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Generate color for tag
   */
  generateTagColor(tag) {
    const colors = [
      '#4285f4', '#ea4335', '#fbbc04', '#34a853',
      '#9c27b0', '#673ab7', '#3f51b5', '#2196f3',
      '#00bcd4', '#009688', '#4caf50', '#8bc34a',
      '#ff9800', '#ff5722', '#795548', '#607d8b'
    ];
    
    // Generate consistent color based on tag name
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Export tags data
   */
  async exportTagsData() {
    try {
      const [tags, accounts] = await Promise.all([
        this.getAllTags(),
        chrome.storage.local.get(['accounts']).then(s => s.accounts || [])
      ]);
      
      return {
        version: 1,
        tags: tags,
        accountTags: accounts.map(acc => ({
          id: acc.id,
          issuer: acc.issuer,
          tags: acc.tags || [],
          isFavorite: acc.isFavorite || false
        })),
        exportedAt: Date.now()
      };
    } catch (error) {
      console.error('Failed to export tags:', error);
      throw error;
    }
  }
}

export default new TagsService();