/**
 * Analytics Intelligence Service
 * Advanced analytics and pattern recognition for user behavior and security insights
 */

export interface UsagePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'irregular';
  frequency: number;
  peakHours: number[];
  peakDays: string[];
  averageSessionDuration: number;
  codeGenerationsPerSession: number;
}

export interface BehaviorAnalysis {
  userType: 'casual' | 'regular' | 'power_user' | 'security_focused';
  confidence: number;
  characteristics: string[];
  recommendations: string[];
  riskProfile: 'low' | 'medium' | 'high';
}

export interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable';
  magnitude: number; // Percentage change
  timeframe: 'week' | 'month' | 'quarter';
  significance: 'significant' | 'moderate' | 'minimal';
  factors: string[];
}

export interface SecurityInsight {
  type: 'positive' | 'negative' | 'neutral';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  data: any;
  actionRequired: boolean;
  suggestedActions: string[];
}

export interface PredictiveInsight {
  prediction: string;
  confidence: number;
  timeframe: string;
  factors: string[];
  preventativeActions: string[];
}

export class AnalyticsIntelligenceService {
  private static isInitialized = false;
  private static analyticsData = {
    userBehavior: new Map<string, any[]>(),
    securityEvents: new Map<string, any[]>(),
    usageMetrics: new Map<string, any[]>(),
    performanceMetrics: new Map<string, any[]>()
  };
  private static mlModels = {
    behaviorClassifier: null as any,
    anomalyDetector: null as any,
    trendPredictor: null as any
  };

  /**
   * Initialize analytics intelligence service
   */
  public static async initialize(): Promise<void> {
    if (AnalyticsIntelligenceService.isInitialized) return;

    try {
      // Initialize data storage
      await this.initializeDataStructures();
      
      // Initialize ML models (simplified for this implementation)
      await this.initializeModels();
      
      AnalyticsIntelligenceService.isInitialized = true;
      console.log('Analytics intelligence service initialized');
    } catch (error) {
      console.error('Failed to initialize analytics intelligence service:', error);
      throw error;
    }
  }

  /**
   * Analyze user usage patterns
   */
  public static async analyzeUsagePatterns(userActivity: any[]): Promise<{
    mostUsedAccounts: Array<{id: string, name: string, usage: number}>;
    usagePattern: 'regular' | 'irregular' | 'declining';
    averageCodesPerDay: number;
    peakUsageTime: string;
  }> {
    if (!AnalyticsIntelligenceService.isInitialized) {
      await this.initialize();
    }

    try {
      // Analyze account usage frequency
      const accountUsage = new Map<string, number>();
      const codeGenerations = userActivity.filter(activity => 
        activity.type === 'code_generated' || activity.type === 'account_access'
      );

      codeGenerations.forEach(activity => {
        if (activity.accountId) {
          accountUsage.set(activity.accountId, (accountUsage.get(activity.accountId) || 0) + 1);
        }
      });

      // Get most used accounts
      const mostUsedAccounts = Array.from(accountUsage.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, usage]) => ({
          id,
          name: `Account ${id}`, // In production, get actual account name
          usage
        }));

      // Analyze usage pattern
      const usagePattern = this.classifyUsagePattern(userActivity);

      // Calculate average codes per day
      const recentActivity = userActivity.filter(
        activity => Date.now() - new Date(activity.timestamp).getTime() < 30 * 24 * 60 * 60 * 1000
      );
      const averageCodesPerDay = recentActivity.length / 30;

      // Find peak usage time
      const peakUsageTime = this.findPeakUsageTime(userActivity);

      return {
        mostUsedAccounts,
        usagePattern,
        averageCodesPerDay,
        peakUsageTime
      };
    } catch (error) {
      console.error('Usage pattern analysis failed:', error);
      return this.getDefaultUsagePatterns();
    }
  }

  /**
   * Analyze user behavior and classify user type
   */
  public static async analyzeBehavior(
    accounts: any[],
    userActivity: any[]
  ): Promise<BehaviorAnalysis> {
    try {
      const characteristics: string[] = [];
      let userType: BehaviorAnalysis['userType'] = 'casual';
      let riskProfile: BehaviorAnalysis['riskProfile'] = 'low';
      let confidence = 0.7;

      // Analyze account count
      if (accounts.length > 20) {
        characteristics.push('Manages many accounts');
        userType = 'power_user';
      } else if (accounts.length > 10) {
        characteristics.push('Manages moderate number of accounts');
        userType = 'regular';
      } else {
        characteristics.push('Manages few accounts');
        userType = 'casual';
      }

      // Analyze usage frequency
      const recentActivity = userActivity.filter(
        activity => Date.now() - new Date(activity.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000
      );

      if (recentActivity.length > 50) {
        characteristics.push('Very active user');
        userType = 'power_user';
      } else if (recentActivity.length > 20) {
        characteristics.push('Regular user activity');
        userType = 'regular';
      } else {
        characteristics.push('Infrequent usage');
      }

      // Analyze security practices
      const backupEvents = userActivity.filter(activity => activity.type === 'backup_created');
      const settingsChanges = userActivity.filter(activity => activity.type === 'settings_changed');

      if (backupEvents.length > 0) {
        characteristics.push('Creates regular backups');
        userType = 'security_focused';
        riskProfile = 'low';
      } else {
        characteristics.push('No backup history');
        riskProfile = 'medium';
      }

      if (settingsChanges.length > 5) {
        characteristics.push('Frequently adjusts settings');
        userType = 'security_focused';
      }

      // Generate recommendations
      const recommendations = this.generateBehaviorRecommendations(userType, characteristics);

      return {
        userType,
        confidence,
        characteristics,
        recommendations,
        riskProfile
      };
    } catch (error) {
      console.error('Behavior analysis failed:', error);
      return this.getDefaultBehaviorAnalysis();
    }
  }

  /**
   * Analyze trends in user activity
   */
  public static async analyzeTrends(
    userActivity: any[],
    timeframe: 'week' | 'month' | 'quarter' = 'month'
  ): Promise<TrendAnalysis> {
    try {
      const now = Date.now();
      const timeframeDays = { week: 7, month: 30, quarter: 90 };
      const periodMs = timeframeDays[timeframe] * 24 * 60 * 60 * 1000;

      // Get current period activity
      const currentPeriod = userActivity.filter(
        activity => now - new Date(activity.timestamp).getTime() < periodMs
      );

      // Get previous period activity
      const previousPeriod = userActivity.filter(
        activity => {
          const age = now - new Date(activity.timestamp).getTime();
          return age >= periodMs && age < periodMs * 2;
        }
      );

      // Calculate trend
      const currentCount = currentPeriod.length;
      const previousCount = previousPeriod.length;
      
      let direction: TrendAnalysis['direction'] = 'stable';
      let magnitude = 0;

      if (previousCount > 0) {
        magnitude = ((currentCount - previousCount) / previousCount) * 100;
        
        if (magnitude > 10) {
          direction = 'increasing';
        } else if (magnitude < -10) {
          direction = 'decreasing';
        }
      } else if (currentCount > 0) {
        direction = 'increasing';
        magnitude = 100;
      }

      // Determine significance
      let significance: TrendAnalysis['significance'] = 'minimal';
      if (Math.abs(magnitude) > 50) {
        significance = 'significant';
      } else if (Math.abs(magnitude) > 25) {
        significance = 'moderate';
      }

      // Identify factors
      const factors = this.identifyTrendFactors(currentPeriod, previousPeriod, direction);

      return {
        direction,
        magnitude: Math.abs(magnitude),
        timeframe,
        significance,
        factors
      };
    } catch (error) {
      console.error('Trend analysis failed:', error);
      return this.getDefaultTrendAnalysis();
    }
  }

  /**
   * Generate security insights from activity patterns
   */
  public static async generateSecurityInsights(
    accounts: any[],
    userActivity: any[]
  ): Promise<SecurityInsight[]> {
    const insights: SecurityInsight[] = [];

    try {
      // Check for security positive indicators
      const recentBackups = userActivity.filter(
        activity => activity.type === 'backup_created' && 
        Date.now() - new Date(activity.timestamp).getTime() < 30 * 24 * 60 * 60 * 1000
      );

      if (recentBackups.length > 0) {
        insights.push({
          type: 'positive',
          severity: 'low',
          message: 'Regular backup activity detected',
          data: { backupCount: recentBackups.length },
          actionRequired: false,
          suggestedActions: ['Continue regular backup schedule']
        });
      }

      // Check for potential security issues
      const failedLogins = userActivity.filter(
        activity => activity.type === 'login' && activity.metadata?.success === false
      );

      if (failedLogins.length > 5) {
        insights.push({
          type: 'negative',
          severity: 'medium',
          message: `${failedLogins.length} failed login attempts detected`,
          data: { failedAttempts: failedLogins.length },
          actionRequired: true,
          suggestedActions: [
            'Review login attempts',
            'Consider enabling additional security measures',
            'Check for unauthorized access attempts'
          ]
        });
      }

      // Check for unusual activity patterns
      const nightActivity = userActivity.filter(activity => {
        const hour = new Date(activity.timestamp).getHours();
        return hour < 6 || hour > 22; // Night hours
      });

      if (nightActivity.length > userActivity.length * 0.3) {
        insights.push({
          type: 'neutral',
          severity: 'low',
          message: 'Significant night-time activity detected',
          data: { nightActivityPercent: (nightActivity.length / userActivity.length) * 100 },
          actionRequired: false,
          suggestedActions: ['Verify this activity pattern is expected']
        });
      }

      // Check for accounts without recent usage
      const oldAccounts = accounts.filter(account => {
        const daysSinceUsed = account.lastUsed ? 
          (Date.now() - new Date(account.lastUsed).getTime()) / (1000 * 60 * 60 * 24) : 999;
        return daysSinceUsed > 90;
      });

      if (oldAccounts.length > 0) {
        insights.push({
          type: 'neutral',
          severity: 'low',
          message: `${oldAccounts.length} accounts haven't been used in over 90 days`,
          data: { unusedAccounts: oldAccounts.length },
          actionRequired: false,
          suggestedActions: ['Review and potentially remove unused accounts']
        });
      }

      return insights;
    } catch (error) {
      console.error('Security insights generation failed:', error);
      return [];
    }
  }

  /**
   * Generate predictive insights
   */
  public static async generatePredictiveInsights(
    accounts: any[],
    userActivity: any[]
  ): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];

    try {
      // Predict backup needs
      const lastBackup = userActivity
        .filter(activity => activity.type === 'backup_created')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

      if (lastBackup) {
        const daysSinceBackup = (Date.now() - new Date(lastBackup.timestamp).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceBackup > 20) {
          insights.push({
            prediction: 'Backup recommended within next 7 days',
            confidence: 0.8,
            timeframe: '7 days',
            factors: [`${Math.floor(daysSinceBackup)} days since last backup`],
            preventativeActions: ['Schedule automatic backup', 'Set backup reminders']
          });
        }
      }

      // Predict account growth
      const accountCreationDates = accounts.map(acc => new Date(acc.createdAt).getTime());
      if (accountCreationDates.length >= 3) {
        const recentAccounts = accountCreationDates.filter(
          date => Date.now() - date < 30 * 24 * 60 * 60 * 1000
        );

        if (recentAccounts.length >= 2) {
          insights.push({
            prediction: 'Likely to add more accounts in the next month',
            confidence: 0.7,
            timeframe: '30 days',
            factors: [`${recentAccounts.length} accounts added recently`],
            preventativeActions: ['Consider premium features for account management']
          });
        }
      }

      // Predict usage pattern changes
      const recentUsage = userActivity.filter(
        activity => Date.now() - new Date(activity.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000
      );
      const previousUsage = userActivity.filter(
        activity => {
          const age = Date.now() - new Date(activity.timestamp).getTime();
          return age >= 7 * 24 * 60 * 60 * 1000 && age < 14 * 24 * 60 * 60 * 1000;
        }
      );

      if (recentUsage.length < previousUsage.length * 0.5) {
        insights.push({
          prediction: 'Usage may continue to decline',
          confidence: 0.6,
          timeframe: '14 days',
          factors: ['Significant decrease in recent activity'],
          preventativeActions: [
            'Engage with new features',
            'Set up shortcuts for frequent accounts',
            'Review and optimize workflow'
          ]
        });
      }

      return insights;
    } catch (error) {
      console.error('Predictive insights generation failed:', error);
      return [];
    }
  }

  /**
   * Get comprehensive analytics dashboard data
   */
  public static async getDashboardAnalytics(
    accounts: any[],
    userActivity: any[]
  ): Promise<{
    usagePatterns: any;
    behaviorAnalysis: BehaviorAnalysis;
    trends: TrendAnalysis;
    securityInsights: SecurityInsight[];
    predictiveInsights: PredictiveInsight[];
    performanceMetrics: any;
  }> {
    try {
      const [
        usagePatterns,
        behaviorAnalysis,
        trends,
        securityInsights,
        predictiveInsights
      ] = await Promise.all([
        this.analyzeUsagePatterns(userActivity),
        this.analyzeBehavior(accounts, userActivity),
        this.analyzeTrends(userActivity),
        this.generateSecurityInsights(accounts, userActivity),
        this.generatePredictiveInsights(accounts, userActivity)
      ]);

      const performanceMetrics = this.calculatePerformanceMetrics(userActivity);

      return {
        usagePatterns,
        behaviorAnalysis,
        trends,
        securityInsights,
        predictiveInsights,
        performanceMetrics
      };
    } catch (error) {
      console.error('Dashboard analytics generation failed:', error);
      throw error;
    }
  }

  // Private helper methods

  private static async initializeDataStructures(): Promise<void> {
    // Initialize analytics data storage
    AnalyticsIntelligenceService.analyticsData = {
      userBehavior: new Map(),
      securityEvents: new Map(),
      usageMetrics: new Map(),
      performanceMetrics: new Map()
    };
  }

  private static async initializeModels(): Promise<void> {
    // In production, load trained ML models
    // For now, use rule-based approaches
    AnalyticsIntelligenceService.mlModels = {
      behaviorClassifier: { type: 'rule_based' },
      anomalyDetector: { type: 'statistical' },
      trendPredictor: { type: 'linear_regression' }
    };
  }

  private static classifyUsagePattern(userActivity: any[]): 'regular' | 'irregular' | 'declining' {
    const recentActivity = userActivity.filter(
      activity => Date.now() - new Date(activity.timestamp).getTime() < 30 * 24 * 60 * 60 * 1000
    );

    if (recentActivity.length === 0) return 'declining';

    // Calculate daily activity distribution
    const dailyActivity = new Map<string, number>();
    recentActivity.forEach(activity => {
      const day = new Date(activity.timestamp).toDateString();
      dailyActivity.set(day, (dailyActivity.get(day) || 0) + 1);
    });

    const activeDays = dailyActivity.size;
    const averagePerDay = recentActivity.length / 30;

    if (activeDays > 20 && averagePerDay > 2) {
      return 'regular';
    } else if (activeDays < 10 || averagePerDay < 1) {
      return 'declining';
    } else {
      return 'irregular';
    }
  }

  private static findPeakUsageTime(userActivity: any[]): string {
    const hourCounts = new Map<number, number>();
    
    userActivity.forEach(activity => {
      const hour = new Date(activity.timestamp).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    const peakHour = Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 9;

    return `${peakHour.toString().padStart(2, '0')}:00`;
  }

  private static generateBehaviorRecommendations(
    userType: BehaviorAnalysis['userType'],
    characteristics: string[]
  ): string[] {
    const recommendations: string[] = [];

    switch (userType) {
      case 'casual':
        recommendations.push('Consider setting up shortcuts for your most used accounts');
        recommendations.push('Enable automatic backups to protect your data');
        break;
      case 'regular':
        recommendations.push('Explore advanced categorization features');
        recommendations.push('Set up backup scheduling');
        break;
      case 'power_user':
        recommendations.push('Consider premium features for advanced management');
        recommendations.push('Explore automation and bulk operations');
        break;
      case 'security_focused':
        recommendations.push('Enable all available security features');
        recommendations.push('Consider security monitoring and alerts');
        break;
    }

    if (characteristics.includes('No backup history')) {
      recommendations.push('Create your first backup immediately');
    }

    return recommendations;
  }

  private static identifyTrendFactors(
    currentPeriod: any[],
    previousPeriod: any[],
    direction: TrendAnalysis['direction']
  ): string[] {
    const factors: string[] = [];

    if (direction === 'increasing') {
      factors.push('Increased account usage');
      if (currentPeriod.filter(a => a.type === 'account_added').length > 0) {
        factors.push('New accounts added');
      }
    } else if (direction === 'decreasing') {
      factors.push('Reduced activity');
      if (currentPeriod.filter(a => a.type === 'login').length < previousPeriod.filter(a => a.type === 'login').length) {
        factors.push('Fewer login sessions');
      }
    }

    return factors;
  }

  private static calculatePerformanceMetrics(userActivity: any[]): any {
    const totalEvents = userActivity.length;
    const uniqueDays = new Set(
      userActivity.map(activity => new Date(activity.timestamp).toDateString())
    ).size;

    return {
      totalEvents,
      averageEventsPerDay: uniqueDays > 0 ? totalEvents / uniqueDays : 0,
      eventTypes: this.getEventTypeDistribution(userActivity),
      activeTimespan: uniqueDays
    };
  }

  private static getEventTypeDistribution(userActivity: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    userActivity.forEach(activity => {
      distribution[activity.type] = (distribution[activity.type] || 0) + 1;
    });

    return distribution;
  }

  // Default return values for error cases

  private static getDefaultUsagePatterns(): any {
    return {
      mostUsedAccounts: [],
      usagePattern: 'irregular' as const,
      averageCodesPerDay: 0,
      peakUsageTime: '09:00'
    };
  }

  private static getDefaultBehaviorAnalysis(): BehaviorAnalysis {
    return {
      userType: 'casual',
      confidence: 0.5,
      characteristics: ['Unknown user behavior'],
      recommendations: ['Explore the app features'],
      riskProfile: 'medium'
    };
  }

  private static getDefaultTrendAnalysis(): TrendAnalysis {
    return {
      direction: 'stable',
      magnitude: 0,
      timeframe: 'month',
      significance: 'minimal',
      factors: ['Insufficient data']
    };
  }

  /**
   * Cleanup service resources
   */
  public static cleanup(): void {
    AnalyticsIntelligenceService.isInitialized = false;
    AnalyticsIntelligenceService.analyticsData.userBehavior.clear();
    AnalyticsIntelligenceService.analyticsData.securityEvents.clear();
    AnalyticsIntelligenceService.analyticsData.usageMetrics.clear();
    AnalyticsIntelligenceService.analyticsData.performanceMetrics.clear();
  }
}