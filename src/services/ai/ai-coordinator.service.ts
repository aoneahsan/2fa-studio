/**
 * AI Coordinator Service
 * Central orchestration for all AI/ML features in 2FA Studio
 */

import { MLKitService } from './ml-kit.service';
import { CategorizationService } from './categorization.service';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { RecommendationService } from './recommendation.service';
import { NLPService } from './nlp.service';
import { AnalyticsIntelligenceService } from './analytics-intelligence.service';

export interface AICapabilities {
  mlKit: boolean;
  categorization: boolean;
  anomalyDetection: boolean;
  recommendations: boolean;
  naturalLanguageProcessing: boolean;
  analyticsIntelligence: boolean;
}

export interface AIConfig {
  enableMlKit: boolean;
  enableCategorization: boolean;
  enableAnomalyDetection: boolean;
  enableRecommendations: boolean;
  enableNLP: boolean;
  enableAnalytics: boolean;
  privacyMode: 'strict' | 'balanced' | 'full';
  dataRetentionDays: number;
}

export interface AIInsights {
  accountInsights: {
    totalAccounts: number;
    categorizedAccounts: number;
    uncategorizedAccounts: number;
    duplicateAccounts: number;
    unusedAccounts: number;
  };
  securityInsights: {
    threatLevel: 'low' | 'medium' | 'high';
    anomaliesDetected: number;
    lastSecurityScan: Date;
    recommendedActions: string[];
  };
  usageInsights: {
    mostUsedAccounts: Array<{id: string, name: string, usage: number}>;
    usagePattern: 'regular' | 'irregular' | 'declining';
    averageCodesPerDay: number;
    peakUsageTime: string;
  };
  recommendations: Array<{
    type: string;
    priority: 'high' | 'medium' | 'low';
    message: string;
    action: string;
  }>;
}

export class AICoordinatorService {
  private static instance: AICoordinatorService;
  private static isInitialized = false;
  private static config: AIConfig | null = null;
  private static capabilities: AICapabilities = {
    mlKit: false,
    categorization: false,
    anomalyDetection: false,
    recommendations: false,
    naturalLanguageProcessing: false,
    analyticsIntelligence: false
  };

  private constructor() {}

  public static getInstance(): AICoordinatorService {
    if (!AICoordinatorService.instance) {
      AICoordinatorService.instance = new AICoordinatorService();
    }
    return AICoordinatorService.instance;
  }

  /**
   * Initialize AI services
   */
  public async initialize(config: Partial<AIConfig> = {}): Promise<void> {
    if (AICoordinatorService.isInitialized) return;

    try {
      // Set default configuration
      AICoordinatorService.config = {
        enableMlKit: true,
        enableCategorization: true,
        enableAnomalyDetection: true,
        enableRecommendations: true,
        enableNLP: true,
        enableAnalytics: true,
        privacyMode: 'balanced',
        dataRetentionDays: 30,
        ...config
      };

      console.log('Initializing AI services with config:', AICoordinatorService.config);

      // Initialize individual services based on config
      const initPromises: Promise<void>[] = [];

      if (AICoordinatorService.config.enableMlKit) {
        initPromises.push(
          MLKitService.initialize().then(() => {
            AICoordinatorService.capabilities.mlKit = true;
          }).catch(error => {
            console.warn('ML Kit initialization failed:', error);
          })
        );
      }

      if (AICoordinatorService.config.enableCategorization) {
        initPromises.push(
          CategorizationService.initialize().then(() => {
            AICoordinatorService.capabilities.categorization = true;
          }).catch(error => {
            console.warn('Categorization service initialization failed:', error);
          })
        );
      }

      if (AICoordinatorService.config.enableAnomalyDetection) {
        initPromises.push(
          AnomalyDetectionService.initialize().then(() => {
            AICoordinatorService.capabilities.anomalyDetection = true;
          }).catch(error => {
            console.warn('Anomaly detection initialization failed:', error);
          })
        );
      }

      if (AICoordinatorService.config.enableRecommendations) {
        initPromises.push(
          RecommendationService.initialize().then(() => {
            AICoordinatorService.capabilities.recommendations = true;
          }).catch(error => {
            console.warn('Recommendation service initialization failed:', error);
          })
        );
      }

      if (AICoordinatorService.config.enableNLP) {
        initPromises.push(
          NLPService.initialize().then(() => {
            AICoordinatorService.capabilities.naturalLanguageProcessing = true;
          }).catch(error => {
            console.warn('NLP service initialization failed:', error);
          })
        );
      }

      if (AICoordinatorService.config.enableAnalytics) {
        initPromises.push(
          AnalyticsIntelligenceService.initialize().then(() => {
            AICoordinatorService.capabilities.analyticsIntelligence = true;
          }).catch(error => {
            console.warn('Analytics intelligence initialization failed:', error);
          })
        );
      }

      // Wait for all services to initialize (or fail gracefully)
      await Promise.allSettled(initPromises);

      AICoordinatorService.isInitialized = true;
      
      console.log('AI services initialized. Capabilities:', AICoordinatorService.capabilities);
    } catch (error) {
      console.error('AI Coordinator initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get current AI capabilities
   */
  public getCapabilities(): AICapabilities {
    return { ...AICoordinatorService.capabilities };
  }

  /**
   * Check if AI features are available
   */
  public isAIEnabled(): boolean {
    return AICoordinatorService.isInitialized && 
           Object.values(AICoordinatorService.capabilities).some(capability => capability);
  }

  /**
   * Process account for AI insights
   */
  public async processAccount(account: any): Promise<{
    category?: string;
    confidence?: number;
    tags?: string[];
    riskLevel?: 'low' | 'medium' | 'high';
    recommendations?: string[];
  }> {
    const results: any = {};

    try {
      // Categorization
      if (AICoordinatorService.capabilities.categorization) {
        const categoryResult = await CategorizationService.categorizeAccount(account);
        results.category = categoryResult.category;
        results.confidence = categoryResult.confidence;
        results.tags = categoryResult.suggestedTags;
      }

      // Security analysis
      if (AICoordinatorService.capabilities.anomalyDetection) {
        const riskAssessment = await AnomalyDetectionService.assessAccountRisk(account);
        results.riskLevel = riskAssessment.level;
        results.recommendations = riskAssessment.recommendations;
      }

      return results;
    } catch (error) {
      console.error('Account processing failed:', error);
      return {};
    }
  }

  /**
   * Get comprehensive AI insights
   */
  public async getInsights(accounts: any[], userActivity: any[]): Promise<AIInsights> {
    try {
      const insights: AIInsights = {
        accountInsights: {
          totalAccounts: accounts.length,
          categorizedAccounts: 0,
          uncategorizedAccounts: 0,
          duplicateAccounts: 0,
          unusedAccounts: 0
        },
        securityInsights: {
          threatLevel: 'low',
          anomaliesDetected: 0,
          lastSecurityScan: new Date(),
          recommendedActions: []
        },
        usageInsights: {
          mostUsedAccounts: [],
          usagePattern: 'regular',
          averageCodesPerDay: 0,
          peakUsageTime: '09:00'
        },
        recommendations: []
      };

      // Account insights
      if (AICoordinatorService.capabilities.categorization) {
        const categorized = accounts.filter(acc => acc.category && acc.category !== 'uncategorized');
        insights.accountInsights.categorizedAccounts = categorized.length;
        insights.accountInsights.uncategorizedAccounts = accounts.length - categorized.length;
      }

      // Security insights
      if (AICoordinatorService.capabilities.anomalyDetection) {
        const securityAnalysis = await AnomalyDetectionService.analyzeOverallSecurity(accounts, userActivity);
        insights.securityInsights.threatLevel = securityAnalysis.overallThreatLevel;
        insights.securityInsights.anomaliesDetected = securityAnalysis.anomaliesFound;
        insights.securityInsights.recommendedActions = securityAnalysis.recommendations;
      }

      // Usage insights
      if (AICoordinatorService.capabilities.analyticsIntelligence) {
        const usageAnalysis = await AnalyticsIntelligenceService.analyzeUsagePatterns(userActivity);
        insights.usageInsights = usageAnalysis;
      }

      // Recommendations
      if (AICoordinatorService.capabilities.recommendations) {
        const recommendations = await RecommendationService.getRecommendations(accounts, userActivity);
        insights.recommendations = recommendations;
      }

      return insights;
    } catch (error) {
      console.error('Failed to get AI insights:', error);
      throw error;
    }
  }

  /**
   * Perform intelligent search
   */
  public async intelligentSearch(query: string, accounts: any[]): Promise<{
    results: any[];
    suggestions: string[];
    intent: string;
  }> {
    if (!AICoordinatorService.capabilities.naturalLanguageProcessing) {
      // Fallback to simple text search
      const results = accounts.filter(account => 
        account.issuer.toLowerCase().includes(query.toLowerCase()) ||
        account.label.toLowerCase().includes(query.toLowerCase())
      );
      return {
        results,
        suggestions: [],
        intent: 'simple_search'
      };
    }

    try {
      return await NLPService.performSearch(query, accounts);
    } catch (error) {
      console.error('Intelligent search failed:', error);
      // Fallback to simple search
      const results = accounts.filter(account => 
        account.issuer.toLowerCase().includes(query.toLowerCase()) ||
        account.label.toLowerCase().includes(query.toLowerCase())
      );
      return {
        results,
        suggestions: [],
        intent: 'simple_search'
      };
    }
  }

  /**
   * Update AI configuration
   */
  public async updateConfiguration(newConfig: Partial<AIConfig>): Promise<void> {
    if (!AICoordinatorService.isInitialized) {
      throw new Error('AI Coordinator not initialized');
    }

    AICoordinatorService.config = {
      ...AICoordinatorService.config!,
      ...newConfig
    };

    // Reinitialize services if needed
    if (newConfig.enableMlKit !== undefined || 
        newConfig.enableCategorization !== undefined ||
        newConfig.enableAnomalyDetection !== undefined ||
        newConfig.enableRecommendations !== undefined ||
        newConfig.enableNLP !== undefined ||
        newConfig.enableAnalytics !== undefined) {
      
      AICoordinatorService.isInitialized = false;
      await this.initialize(AICoordinatorService.config);
    }
  }

  /**
   * Get AI performance metrics
   */
  public getPerformanceMetrics(): {
    accuracy: Record<string, number>;
    latency: Record<string, number>;
    usage: Record<string, number>;
  } {
    const metrics = {
      accuracy: {},
      latency: {},
      usage: {}
    };

    if (AICoordinatorService.capabilities.categorization) {
      metrics.accuracy['categorization'] = CategorizationService.getAccuracyMetrics();
    }

    if (AICoordinatorService.capabilities.anomalyDetection) {
      metrics.accuracy['anomaly_detection'] = AnomalyDetectionService.getAccuracyMetrics();
    }

    if (AICoordinatorService.capabilities.recommendations) {
      metrics.accuracy['recommendations'] = RecommendationService.getAccuracyMetrics();
    }

    return metrics;
  }

  /**
   * Cleanup AI resources
   */
  public cleanup(): void {
    if (!AICoordinatorService.isInitialized) return;

    try {
      MLKitService.cleanup();
      CategorizationService.cleanup();
      AnomalyDetectionService.cleanup();
      RecommendationService.cleanup();
      NLPService.cleanup();
      AnalyticsIntelligenceService.cleanup();

      AICoordinatorService.isInitialized = false;
      AICoordinatorService.config = null;
      AICoordinatorService.capabilities = {
        mlKit: false,
        categorization: false,
        anomalyDetection: false,
        recommendations: false,
        naturalLanguageProcessing: false,
        analyticsIntelligence: false
      };

      console.log('AI services cleaned up');
    } catch (error) {
      console.error('AI cleanup failed:', error);
    }
  }
}