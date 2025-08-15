/**
 * AI Recommendation Service
 * Provides intelligent recommendations for 2FA accounts and security improvements
 */

import { CategorizationService } from './categorization.service';
import { AnomalyDetectionService } from './anomaly-detection.service';

export interface Recommendation {
  id: string;
  type: 'security' | 'organization' | 'backup' | 'usage' | 'cleanup';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionText: string;
  actionData?: any;
  estimatedImpact: string;
  learnMoreUrl?: string;
}

export interface SmartSuggestion {
  type: 'add_account' | 'categorize' | 'backup' | 'security_check';
  confidence: number;
  suggestion: string;
  reasoning: string[];
  data?: any;
}

export interface UsageInsight {
  type: 'frequent_access' | 'unused_account' | 'pattern_change' | 'new_device';
  account?: any;
  message: string;
  actionable: boolean;
  suggestedAction?: string;
}

export class RecommendationService {
  private static isInitialized = false;
  private static userPreferences = {
    securityLevel: 'balanced' as 'strict' | 'balanced' | 'relaxed',
    organizationStyle: 'category' as 'category' | 'frequency' | 'alphabetical',
    backupFrequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    notificationLevel: 'normal' as 'minimal' | 'normal' | 'detailed'
  };
  private static recommendationHistory: string[] = [];
  private static accuracyMetrics = {
    accepted: 0,
    dismissed: 0,
    implemented: 0,
    lastUpdated: new Date()
  };

  /**
   * Initialize recommendation service
   */
  public static async initialize(): Promise<void> {
    if (RecommendationService.isInitialized) return;

    try {
      // Load user preferences from storage
      await this.loadUserPreferences();
      
      RecommendationService.isInitialized = true;
      console.log('Recommendation service initialized');
    } catch (error) {
      console.error('Failed to initialize recommendation service:', error);
      throw error;
    }
  }

  /**
   * Get personalized recommendations for user
   */
  public static async getRecommendations(
    accounts: any[],
    userActivity: any[],
    options: {
      limit?: number;
      types?: Recommendation['type'][];
      minPriority?: Recommendation['priority'];
    } = {}
  ): Promise<Recommendation[]> {
    if (!RecommendationService.isInitialized) {
      await this.initialize();
    }

    try {
      const recommendations: Recommendation[] = [];

      // Generate different types of recommendations
      const generators = [
        () => this.generateSecurityRecommendations(accounts, userActivity),
        () => this.generateOrganizationRecommendations(accounts),
        () => this.generateBackupRecommendations(accounts, userActivity),
        () => this.generateUsageRecommendations(accounts, userActivity),
        () => this.generateCleanupRecommendations(accounts, userActivity)
      ];

      for (const generator of generators) {
        try {
          const recs = await generator();
          recommendations.push(...recs);
        } catch (error) {
          console.warn('Recommendation generator failed:', error);
        }
      }

      // Filter and sort recommendations
      let filteredRecs = recommendations;

      if (options.types) {
        filteredRecs = filteredRecs.filter(rec => options.types!.includes(rec.type));
      }

      if (options.minPriority) {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const minLevel = priorityOrder[options.minPriority];
        filteredRecs = filteredRecs.filter(rec => priorityOrder[rec.priority] >= minLevel);
      }

      // Sort by priority and relevance
      filteredRecs.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      // Apply limit
      if (options.limit) {
        filteredRecs = filteredRecs.slice(0, options.limit);
      }

      return filteredRecs;
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      return [];
    }
  }

  /**
   * Get smart suggestions based on current context
   */
  public static async getSmartSuggestions(
    currentContext: {
      accounts: any[];
      recentActivity: any[];
      currentPage?: string;
      selectedAccount?: any;
    }
  ): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];

    try {
      // Context-aware suggestions
      if (currentContext.currentPage === 'add-account') {
        suggestions.push(...await this.getAddAccountSuggestions(currentContext.accounts));
      }

      if (currentContext.selectedAccount) {
        suggestions.push(...await this.getAccountSpecificSuggestions(currentContext.selectedAccount));
      }

      // General smart suggestions
      suggestions.push(...await this.getGeneralSuggestions(currentContext));

      return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
    } catch (error) {
      console.error('Failed to generate smart suggestions:', error);
      return [];
    }
  }

  /**
   * Get usage insights and patterns
   */
  public static async getUsageInsights(
    accounts: any[],
    userActivity: any[]
  ): Promise<UsageInsight[]> {
    const insights: UsageInsight[] = [];

    try {
      // Analyze usage patterns
      const recentActivity = userActivity.filter(
        activity => Date.now() - new Date(activity.timestamp).getTime() < 30 * 24 * 60 * 60 * 1000 // Last 30 days
      );

      // Find frequently accessed accounts
      const accessCounts = new Map<string, number>();
      recentActivity.forEach(activity => {
        if (activity.accountId) {
          accessCounts.set(activity.accountId, (accessCounts.get(activity.accountId) || 0) + 1);
        }
      });

      const sortedAccounts = Array.from(accessCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      if (sortedAccounts.length > 0) {
        const topAccount = accounts.find(acc => acc.id === sortedAccounts[0][0]);
        if (topAccount) {
          insights.push({
            type: 'frequent_access',
            account: topAccount,
            message: `${topAccount.issuer} is your most used account this month (${sortedAccounts[0][1]} times)`,
            actionable: true,
            suggestedAction: 'Consider pinning this account for quick access'
          });
        }
      }

      // Find unused accounts
      const unusedAccounts = accounts.filter(account => {
        const lastUsed = account.lastUsed ? new Date(account.lastUsed) : null;
        if (!lastUsed) return true;
        
        const daysSinceUsed = (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceUsed > 60;
      });

      if (unusedAccounts.length > 0) {
        insights.push({
          type: 'unused_account',
          message: `You have ${unusedAccounts.length} account(s) not used in over 60 days`,
          actionable: true,
          suggestedAction: 'Review and consider removing unused accounts'
        });
      }

      // Detect pattern changes
      const thisWeekActivity = recentActivity.filter(
        activity => Date.now() - new Date(activity.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000
      );

      const lastWeekActivity = recentActivity.filter(
        activity => {
          const age = Date.now() - new Date(activity.timestamp).getTime();
          return age >= 7 * 24 * 60 * 60 * 1000 && age < 14 * 24 * 60 * 60 * 1000;
        }
      );

      if (thisWeekActivity.length > lastWeekActivity.length * 1.5) {
        insights.push({
          type: 'pattern_change',
          message: 'Your 2FA usage has increased significantly this week',
          actionable: false
        });
      }

      return insights;
    } catch (error) {
      console.error('Failed to generate usage insights:', error);
      return [];
    }
  }

  /**
   * Learn from user feedback on recommendations
   */
  public static async recordFeedback(
    recommendationId: string,
    action: 'accepted' | 'dismissed' | 'implemented'
  ): Promise<void> {
    try {
      switch (action) {
        case 'accepted':
          RecommendationService.accuracyMetrics.accepted++;
          break;
        case 'dismissed':
          RecommendationService.accuracyMetrics.dismissed++;
          break;
        case 'implemented':
          RecommendationService.accuracyMetrics.implemented++;
          break;
      }

      RecommendationService.accuracyMetrics.lastUpdated = new Date();
      RecommendationService.recommendationHistory.push(recommendationId);

      // In production, you would store this feedback for ML model training
      console.log(`Recommendation feedback recorded: ${recommendationId} -> ${action}`);
    } catch (error) {
      console.error('Failed to record recommendation feedback:', error);
    }
  }

  /**
   * Get recommendation accuracy metrics
   */
  public static getAccuracyMetrics(): number {
    const { accepted, dismissed, implemented } = RecommendationService.accuracyMetrics;
    const total = accepted + dismissed + implemented;
    
    if (total === 0) return 0;
    
    // Calculate acceptance rate (accepted + implemented / total)
    return (accepted + implemented) / total;
  }

  // Private helper methods

  private static async loadUserPreferences(): Promise<void> {
    // In production, load from user preferences storage
    // For now, use defaults
  }

  private static async generateSecurityRecommendations(
    accounts: any[],
    userActivity: any[]
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Check for accounts without backup codes
    const accountsWithoutBackup = accounts.filter(acc => !acc.backupCodes || acc.backupCodes.length === 0);
    if (accountsWithoutBackup.length > 0) {
      recommendations.push({
        id: `security-backup-${Date.now()}`,
        type: 'security',
        priority: 'high',
        title: 'Set up backup codes',
        description: `${accountsWithoutBackup.length} account(s) don't have backup codes configured`,
        actionText: 'Add backup codes',
        actionData: { accounts: accountsWithoutBackup.map(acc => acc.id) },
        estimatedImpact: 'Prevents account lockout if device is lost',
        learnMoreUrl: '/help/backup-codes'
      });
    }

    // Check for high-risk accounts
    for (const account of accounts.slice(0, 10)) { // Check first 10 to avoid performance issues
      try {
        const riskAssessment = await AnomalyDetectionService.assessAccountRisk(account);
        if (riskAssessment.level === 'high') {
          recommendations.push({
            id: `security-risk-${account.id}`,
            type: 'security',
            priority: 'high',
            title: `Review security for ${account.issuer}`,
            description: riskAssessment.factors.join(', '),
            actionText: 'Review account',
            actionData: { accountId: account.id },
            estimatedImpact: 'Improves account security',
            learnMoreUrl: '/help/account-security'
          });
        }
      } catch (error) {
        console.warn('Risk assessment failed for account:', account.id);
      }
    }

    // Check for old accounts that might need attention
    const oldAccounts = accounts.filter(acc => {
      const daysSinceCreated = (Date.now() - new Date(acc.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      const daysSinceUsed = acc.lastUsed ? 
        (Date.now() - new Date(acc.lastUsed).getTime()) / (1000 * 60 * 60 * 24) : 999;
      return daysSinceCreated > 90 && daysSinceUsed > 30;
    });

    if (oldAccounts.length > 0) {
      recommendations.push({
        id: `security-old-accounts-${Date.now()}`,
        type: 'security',
        priority: 'medium',
        title: 'Review old accounts',
        description: `${oldAccounts.length} account(s) are old and rarely used`,
        actionText: 'Review accounts',
        actionData: { accounts: oldAccounts.map(acc => acc.id) },
        estimatedImpact: 'Reduces security surface area'
      });
    }

    return recommendations;
  }

  private static async generateOrganizationRecommendations(accounts: any[]): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Check for uncategorized accounts
    const uncategorizedAccounts = accounts.filter(acc => !acc.category || acc.category === 'uncategorized');
    if (uncategorizedAccounts.length > 5) {
      recommendations.push({
        id: `organization-categorize-${Date.now()}`,
        type: 'organization',
        priority: 'medium',
        title: 'Categorize your accounts',
        description: `${uncategorizedAccounts.length} accounts need categorization for better organization`,
        actionText: 'Auto-categorize',
        actionData: { accounts: uncategorizedAccounts.map(acc => acc.id) },
        estimatedImpact: 'Easier to find and manage accounts'
      });
    }

    // Check for duplicate accounts
    const duplicates = this.findDuplicateAccounts(accounts);
    if (duplicates.length > 0) {
      recommendations.push({
        id: `organization-duplicates-${Date.now()}`,
        type: 'organization',
        priority: 'medium',
        title: 'Review duplicate accounts',
        description: `Found ${duplicates.length} potential duplicate account(s)`,
        actionText: 'Review duplicates',
        actionData: { duplicates },
        estimatedImpact: 'Cleaner account list'
      });
    }

    return recommendations;
  }

  private static async generateBackupRecommendations(
    accounts: any[],
    userActivity: any[]
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Check backup frequency
    const lastBackup = userActivity
      .filter(activity => activity.type === 'backup_created')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    if (!lastBackup) {
      recommendations.push({
        id: `backup-first-${Date.now()}`,
        type: 'backup',
        priority: 'high',
        title: 'Create your first backup',
        description: 'Protect your accounts with an encrypted backup',
        actionText: 'Create backup',
        estimatedImpact: 'Prevents data loss'
      });
    } else {
      const daysSinceBackup = (Date.now() - new Date(lastBackup.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      const recommendedFrequency = this.getRecommendedBackupFrequency();
      
      if (daysSinceBackup > recommendedFrequency) {
        recommendations.push({
          id: `backup-overdue-${Date.now()}`,
          type: 'backup',
          priority: 'medium',
          title: 'Backup is overdue',
          description: `Last backup was ${Math.floor(daysSinceBackup)} days ago`,
          actionText: 'Create backup',
          estimatedImpact: 'Keeps backup current'
        });
      }
    }

    return recommendations;
  }

  private static async generateUsageRecommendations(
    accounts: any[],
    userActivity: any[]
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Check for accounts that could benefit from shortcuts
    const frequentAccounts = accounts
      .filter(acc => (acc.usageCount || 0) > 10)
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 3);

    if (frequentAccounts.length > 0 && !this.hasCustomShortcuts()) {
      recommendations.push({
        id: `usage-shortcuts-${Date.now()}`,
        type: 'usage',
        priority: 'low',
        title: 'Set up quick access',
        description: 'Create shortcuts for your most used accounts',
        actionText: 'Configure shortcuts',
        actionData: { accounts: frequentAccounts.map(acc => acc.id) },
        estimatedImpact: 'Faster access to frequent accounts'
      });
    }

    return recommendations;
  }

  private static async generateCleanupRecommendations(
    accounts: any[],
    userActivity: any[]
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Find really old unused accounts
    const veryOldAccounts = accounts.filter(acc => {
      const daysSinceUsed = acc.lastUsed ? 
        (Date.now() - new Date(acc.lastUsed).getTime()) / (1000 * 60 * 60 * 24) : 999;
      return daysSinceUsed > 180; // 6 months
    });

    if (veryOldAccounts.length > 0) {
      recommendations.push({
        id: `cleanup-old-${Date.now()}`,
        type: 'cleanup',
        priority: 'low',
        title: 'Clean up old accounts',
        description: `${veryOldAccounts.length} account(s) haven't been used in over 6 months`,
        actionText: 'Review for removal',
        actionData: { accounts: veryOldAccounts.map(acc => acc.id) },
        estimatedImpact: 'Simplified account management'
      });
    }

    return recommendations;
  }

  private static async getAddAccountSuggestions(accounts: any[]): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];

    // Suggest common missing services
    const existingIssuers = new Set(accounts.map(acc => acc.issuer.toLowerCase()));
    const commonServices = [
      'Google', 'Microsoft', 'Facebook', 'GitHub', 'Dropbox', 'PayPal'
    ];

    const missingServices = commonServices.filter(service => 
      !existingIssuers.has(service.toLowerCase())
    );

    if (missingServices.length > 0) {
      suggestions.push({
        type: 'add_account',
        confidence: 0.7,
        suggestion: `Consider adding ${missingServices[0]} for better security`,
        reasoning: ['Common service not yet secured with 2FA'],
        data: { suggestedService: missingServices[0] }
      });
    }

    return suggestions;
  }

  private static async getAccountSpecificSuggestions(account: any): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];

    // Suggest categorization if uncategorized
    if (!account.category || account.category === 'uncategorized') {
      const categoryResult = await CategorizationService.categorizeAccount(account);
      if (categoryResult.confidence > 0.7) {
        suggestions.push({
          type: 'categorize',
          confidence: categoryResult.confidence,
          suggestion: `This looks like a ${categoryResult.category.replace('_', ' ')} account`,
          reasoning: categoryResult.reasoning,
          data: { suggestedCategory: categoryResult.category }
        });
      }
    }

    return suggestions;
  }

  private static async getGeneralSuggestions(context: any): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];

    // Suggest backup if none exists
    const hasRecentBackup = context.recentActivity.some(
      (activity: any) => activity.type === 'backup_created' && 
      Date.now() - new Date(activity.timestamp).getTime() < 30 * 24 * 60 * 60 * 1000
    );

    if (!hasRecentBackup) {
      suggestions.push({
        type: 'backup',
        confidence: 0.8,
        suggestion: 'Create a backup to protect your accounts',
        reasoning: ['No recent backup found', 'Backup prevents data loss']
      });
    }

    return suggestions;
  }

  private static findDuplicateAccounts(accounts: any[]): Array<{ accounts: any[]; reason: string }> {
    const duplicates: Array<{ accounts: any[]; reason: string }> = [];
    
    // Group by issuer
    const issuerGroups = new Map<string, any[]>();
    accounts.forEach(account => {
      const issuer = account.issuer.toLowerCase().trim();
      if (!issuerGroups.has(issuer)) {
        issuerGroups.set(issuer, []);
      }
      issuerGroups.get(issuer)!.push(account);
    });

    // Find groups with multiple accounts
    issuerGroups.forEach((accountGroup, issuer) => {
      if (accountGroup.length > 1) {
        duplicates.push({
          accounts: accountGroup,
          reason: `Multiple accounts for ${issuer}`
        });
      }
    });

    return duplicates;
  }

  private static getRecommendedBackupFrequency(): number {
    const preferences = RecommendationService.userPreferences;
    const frequencyMap = {
      daily: 1,
      weekly: 7,
      monthly: 30
    };
    return frequencyMap[preferences.backupFrequency];
  }

  private static hasCustomShortcuts(): boolean {
    // In production, check if user has configured any shortcuts
    return false;
  }

  /**
   * Cleanup service resources
   */
  public static cleanup(): void {
    RecommendationService.isInitialized = false;
    RecommendationService.recommendationHistory = [];
  }
}