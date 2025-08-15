/**
 * Intelligent Account Categorization Service
 * Uses ML to automatically categorize 2FA accounts
 */

import * as tf from '@tensorflow/tfjs';
import { MLKitService } from './ml-kit.service';

export enum AccountCategory {
  BANKING_FINANCE = 'banking_finance',
  SOCIAL_MEDIA = 'social_media',
  WORK_PRODUCTIVITY = 'work_productivity',
  GAMING_ENTERTAINMENT = 'gaming_entertainment',
  SHOPPING_ECOMMERCE = 'shopping_ecommerce',
  DEVELOPER_TOOLS = 'developer_tools',
  SECURITY_PRIVACY = 'security_privacy',
  EDUCATION = 'education',
  HEALTH_FITNESS = 'health_fitness',
  TRAVEL_TRANSPORT = 'travel_transport',
  UTILITIES = 'utilities',
  UNCATEGORIZED = 'uncategorized'
}

export interface CategorizationResult {
  category: AccountCategory;
  confidence: number;
  suggestedTags: string[];
  reasoning: string[];
  alternatives: Array<{
    category: AccountCategory;
    confidence: number;
  }>;
}

export interface ServicePattern {
  keywords: string[];
  domains: string[];
  category: AccountCategory;
  weight: number;
}

export class CategorizationService {
  private static isInitialized = false;
  private static model: tf.LayersModel | null = null;
  private static patterns: ServicePattern[] = [];
  private static accuracyMetrics = {
    correctPredictions: 0,
    totalPredictions: 0,
    lastUpdated: new Date()
  };

  /**
   * Initialize categorization service
   */
  public static async initialize(): Promise<void> {
    if (CategorizationService.isInitialized) return;

    try {
      // Initialize ML model (simple approach for now)
      await this.initializePatterns();
      
      // In production, you would load a pre-trained TensorFlow model
      // For now, we'll use pattern matching with ML enhancement
      
      CategorizationService.isInitialized = true;
      console.log('Categorization service initialized');
    } catch (error) {
      console.error('Failed to initialize categorization service:', error);
      throw error;
    }
  }

  /**
   * Categorize an account using multiple techniques
   */
  public static async categorizeAccount(account: {
    issuer: string;
    label?: string;
    icon?: string;
    domain?: string;
  }): Promise<CategorizationResult> {
    if (!CategorizationService.isInitialized) {
      await this.initialize();
    }

    try {
      const results = await Promise.allSettled([
        this.categorizeByPatternMatching(account),
        this.categorizeByNLP(account),
        account.icon ? this.categorizeByIcon(account.icon) : null
      ]);

      // Combine results with weighted scoring
      const patternResult = results[0].status === 'fulfilled' ? results[0].value : null;
      const nlpResult = results[1].status === 'fulfilled' ? results[1].value : null;
      const iconResult = results[2]?.status === 'fulfilled' ? results[2].value : null;

      return this.combineResults(patternResult, nlpResult, iconResult, account);
    } catch (error) {
      console.error('Categorization failed:', error);
      return this.getDefaultResult(account);
    }
  }

  /**
   * Batch categorize multiple accounts
   */
  public static async categorizeAccounts(accounts: any[]): Promise<Map<string, CategorizationResult>> {
    const results = new Map<string, CategorizationResult>();
    const batchSize = 10;

    for (let i = 0; i < accounts.length; i += batchSize) {
      const batch = accounts.slice(i, i + batchSize);
      const batchPromises = batch.map(async (account) => {
        const result = await this.categorizeAccount(account);
        return { id: account.id, result };
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ id, result }) => {
        results.set(id, result);
      });
    }

    return results;
  }

  /**
   * Learn from user corrections
   */
  public static async learnFromCorrection(
    account: any,
    predictedCategory: AccountCategory,
    actualCategory: AccountCategory
  ): Promise<void> {
    if (predictedCategory === actualCategory) {
      CategorizationService.accuracyMetrics.correctPredictions++;
    }
    
    CategorizationService.accuracyMetrics.totalPredictions++;
    CategorizationService.accuracyMetrics.lastUpdated = new Date();

    // In a production system, you would:
    // 1. Store the correction in a database
    // 2. Retrain the model periodically
    // 3. Update pattern weights based on corrections

    console.log(`Learning: ${account.issuer} -> ${actualCategory} (was ${predictedCategory})`);
  }

  /**
   * Get category suggestions for manual categorization
   */
  public static getCategorySuggestions(query: string): Array<{
    category: AccountCategory;
    relevance: number;
  }> {
    const suggestions: Array<{ category: AccountCategory; relevance: number }> = [];
    const queryLower = query.toLowerCase();

    CategorizationService.patterns.forEach(pattern => {
      let relevance = 0;
      
      pattern.keywords.forEach(keyword => {
        if (queryLower.includes(keyword.toLowerCase())) {
          relevance += pattern.weight;
        }
      });

      if (relevance > 0) {
        suggestions.push({ category: pattern.category, relevance });
      }
    });

    return suggestions
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5);
  }

  /**
   * Get accuracy metrics
   */
  public static getAccuracyMetrics(): number {
    const { correctPredictions, totalPredictions } = CategorizationService.accuracyMetrics;
    return totalPredictions > 0 ? correctPredictions / totalPredictions : 0;
  }

  // Private helper methods

  private static async initializePatterns(): Promise<void> {
    CategorizationService.patterns = [
      // Banking & Finance
      {
        keywords: ['bank', 'visa', 'mastercard', 'paypal', 'stripe', 'finance', 'credit', 'loan', 'investment', 'bitcoin', 'crypto', 'wallet', 'exchange'],
        domains: ['paypal.com', 'stripe.com', 'chase.com', 'bankofamerica.com', 'wellsfargo.com', 'coinbase.com', 'binance.com'],
        category: AccountCategory.BANKING_FINANCE,
        weight: 1.0
      },
      // Social Media
      {
        keywords: ['facebook', 'twitter', 'instagram', 'linkedin', 'tiktok', 'snapchat', 'discord', 'telegram', 'whatsapp', 'social'],
        domains: ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'tiktok.com', 'discord.com'],
        category: AccountCategory.SOCIAL_MEDIA,
        weight: 1.0
      },
      // Work & Productivity
      {
        keywords: ['microsoft', 'office', 'outlook', 'teams', 'slack', 'zoom', 'google workspace', 'dropbox', 'notion', 'asana', 'trello'],
        domains: ['microsoft.com', 'office.com', 'slack.com', 'zoom.us', 'dropbox.com', 'notion.so'],
        category: AccountCategory.WORK_PRODUCTIVITY,
        weight: 1.0
      },
      // Gaming & Entertainment
      {
        keywords: ['steam', 'xbox', 'playstation', 'nintendo', 'twitch', 'youtube', 'netflix', 'spotify', 'gaming', 'game'],
        domains: ['steampowered.com', 'xbox.com', 'playstation.com', 'nintendo.com', 'twitch.tv', 'youtube.com', 'netflix.com'],
        category: AccountCategory.GAMING_ENTERTAINMENT,
        weight: 1.0
      },
      // Shopping & E-commerce
      {
        keywords: ['amazon', 'ebay', 'shopify', 'etsy', 'shop', 'store', 'marketplace', 'shopping', 'ecommerce'],
        domains: ['amazon.com', 'ebay.com', 'shopify.com', 'etsy.com'],
        category: AccountCategory.SHOPPING_ECOMMERCE,
        weight: 1.0
      },
      // Developer Tools
      {
        keywords: ['github', 'gitlab', 'bitbucket', 'aws', 'azure', 'vercel', 'netlify', 'heroku', 'developer', 'code', 'git'],
        domains: ['github.com', 'gitlab.com', 'aws.amazon.com', 'vercel.com', 'netlify.com'],
        category: AccountCategory.DEVELOPER_TOOLS,
        weight: 1.0
      },
      // Security & Privacy
      {
        keywords: ['vpn', '1password', 'bitwarden', 'lastpass', 'nordvpn', 'security', 'privacy', 'firewall'],
        domains: ['1password.com', 'bitwarden.com', 'lastpass.com', 'nordvpn.com'],
        category: AccountCategory.SECURITY_PRIVACY,
        weight: 1.0
      },
      // Education
      {
        keywords: ['university', 'college', 'coursera', 'udemy', 'khan', 'education', 'learning', 'school'],
        domains: ['coursera.org', 'udemy.com', 'khanacademy.org'],
        category: AccountCategory.EDUCATION,
        weight: 1.0
      },
      // Health & Fitness
      {
        keywords: ['fitbit', 'myfitnesspal', 'health', 'fitness', 'medical', 'hospital', 'doctor'],
        domains: ['fitbit.com', 'myfitnesspal.com'],
        category: AccountCategory.HEALTH_FITNESS,
        weight: 1.0
      },
      // Travel & Transport
      {
        keywords: ['uber', 'lyft', 'airbnb', 'booking', 'expedia', 'travel', 'flight', 'hotel'],
        domains: ['uber.com', 'lyft.com', 'airbnb.com', 'booking.com', 'expedia.com'],
        category: AccountCategory.TRAVEL_TRANSPORT,
        weight: 1.0
      },
      // Utilities
      {
        keywords: ['electric', 'gas', 'water', 'internet', 'phone', 'utility', 'bill', 'verizon', 'att'],
        domains: ['verizon.com', 'att.com'],
        category: AccountCategory.UTILITIES,
        weight: 1.0
      }
    ];
  }

  private static async categorizeByPatternMatching(account: {
    issuer: string;
    label?: string;
    domain?: string;
  }): Promise<Partial<CategorizationResult>> {
    const text = `${account.issuer} ${account.label || ''} ${account.domain || ''}`.toLowerCase();
    const scores = new Map<AccountCategory, number>();

    CategorizationService.patterns.forEach(pattern => {
      let score = 0;

      // Check keywords
      pattern.keywords.forEach(keyword => {
        if (text.includes(keyword.toLowerCase())) {
          score += pattern.weight;
        }
      });

      // Check domains
      if (account.domain) {
        pattern.domains.forEach(domain => {
          if (account.domain?.includes(domain)) {
            score += pattern.weight * 1.5; // Domain matches are more reliable
          }
        });
      }

      if (score > 0) {
        scores.set(pattern.category, (scores.get(pattern.category) || 0) + score);
      }
    });

    if (scores.size === 0) {
      return {
        category: AccountCategory.UNCATEGORIZED,
        confidence: 0.1
      };
    }

    const sortedScores = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1]);

    const topCategory = sortedScores[0];
    const totalScore = Array.from(scores.values()).reduce((sum, score) => sum + score, 0);

    return {
      category: topCategory[0],
      confidence: Math.min(topCategory[1] / totalScore, 0.95),
      alternatives: sortedScores.slice(1, 3).map(([category, score]) => ({
        category,
        confidence: score / totalScore
      }))
    };
  }

  private static async categorizeByNLP(account: {
    issuer: string;
    label?: string;
  }): Promise<Partial<CategorizationResult>> {
    // Simple NLP approach - in production you'd use more sophisticated models
    const text = `${account.issuer} ${account.label || ''}`;
    
    // This would typically involve:
    // 1. Text preprocessing (tokenization, stemming, etc.)
    // 2. Feature extraction (TF-IDF, embeddings, etc.)
    // 3. Classification using trained model
    
    // For now, return a basic result
    return {
      confidence: 0.3,
      reasoning: ['NLP analysis of service name and description']
    };
  }

  private static async categorizeByIcon(iconUrl: string): Promise<Partial<CategorizationResult>> {
    try {
      // Use ML Kit for image analysis
      if (MLKitService.isAvailable()) {
        const labels = await MLKitService.analyzeImage(iconUrl);
        
        // Map image labels to categories
        const categoryMappings: Record<string, AccountCategory> = {
          'bank': AccountCategory.BANKING_FINANCE,
          'money': AccountCategory.BANKING_FINANCE,
          'social': AccountCategory.SOCIAL_MEDIA,
          'chat': AccountCategory.SOCIAL_MEDIA,
          'game': AccountCategory.GAMING_ENTERTAINMENT,
          'shopping': AccountCategory.SHOPPING_ECOMMERCE,
          'code': AccountCategory.DEVELOPER_TOOLS,
          'security': AccountCategory.SECURITY_PRIVACY,
          'education': AccountCategory.EDUCATION,
          'health': AccountCategory.HEALTH_FITNESS,
          'travel': AccountCategory.TRAVEL_TRANSPORT
        };

        for (const label of labels) {
          const category = categoryMappings[label.label.toLowerCase()];
          if (category) {
            return {
              category,
              confidence: label.confidence * 0.7, // Icon analysis is less reliable
              reasoning: [`Icon analysis detected: ${label.label}`]
            };
          }
        }
      }
    } catch (error) {
      console.error('Icon categorization failed:', error);
    }

    return { confidence: 0.1 };
  }

  private static combineResults(
    patternResult: Partial<CategorizationResult> | null,
    nlpResult: Partial<CategorizationResult> | null,
    iconResult: Partial<CategorizationResult> | null,
    account: any
  ): CategorizationResult {
    // Weighted combination of results
    const patternWeight = 0.6;
    const nlpWeight = 0.3;
    const iconWeight = 0.1;

    let bestCategory = AccountCategory.UNCATEGORIZED;
    let bestConfidence = 0;
    const reasoning: string[] = [];
    const alternatives: Array<{ category: AccountCategory; confidence: number }> = [];

    // Pattern matching result (highest weight)
    if (patternResult?.category && patternResult.confidence) {
      const weightedConfidence = patternResult.confidence * patternWeight;
      if (weightedConfidence > bestConfidence) {
        bestCategory = patternResult.category;
        bestConfidence = weightedConfidence;
        reasoning.push(`Pattern matching: ${Math.round(patternResult.confidence * 100)}% confidence`);
      }
      
      if (patternResult.alternatives) {
        alternatives.push(...patternResult.alternatives);
      }
    }

    // NLP result
    if (nlpResult?.category && nlpResult.confidence) {
      const weightedConfidence = nlpResult.confidence * nlpWeight;
      if (weightedConfidence > bestConfidence) {
        bestCategory = nlpResult.category;
        bestConfidence = weightedConfidence;
      }
      
      if (nlpResult.reasoning) {
        reasoning.push(...nlpResult.reasoning);
      }
    }

    // Icon result
    if (iconResult?.category && iconResult.confidence) {
      const weightedConfidence = iconResult.confidence * iconWeight;
      if (weightedConfidence > bestConfidence) {
        bestCategory = iconResult.category;
        bestConfidence = weightedConfidence;
      }
      
      if (iconResult.reasoning) {
        reasoning.push(...iconResult.reasoning);
      }
    }

    // Generate suggested tags
    const suggestedTags = this.generateTags(bestCategory, account);

    return {
      category: bestCategory,
      confidence: Math.min(bestConfidence, 0.95),
      suggestedTags,
      reasoning: reasoning.length > 0 ? reasoning : [`Categorized as ${bestCategory}`],
      alternatives: alternatives.slice(0, 2)
    };
  }

  private static generateTags(category: AccountCategory, account: any): string[] {
    const tags: string[] = [];

    // Category-based tags
    const categoryTags: Record<AccountCategory, string[]> = {
      [AccountCategory.BANKING_FINANCE]: ['money', 'banking', 'finance'],
      [AccountCategory.SOCIAL_MEDIA]: ['social', 'communication'],
      [AccountCategory.WORK_PRODUCTIVITY]: ['work', 'productivity', 'business'],
      [AccountCategory.GAMING_ENTERTAINMENT]: ['gaming', 'entertainment'],
      [AccountCategory.SHOPPING_ECOMMERCE]: ['shopping', 'ecommerce'],
      [AccountCategory.DEVELOPER_TOOLS]: ['development', 'coding', 'tech'],
      [AccountCategory.SECURITY_PRIVACY]: ['security', 'privacy', 'protection'],
      [AccountCategory.EDUCATION]: ['education', 'learning'],
      [AccountCategory.HEALTH_FITNESS]: ['health', 'fitness', 'wellness'],
      [AccountCategory.TRAVEL_TRANSPORT]: ['travel', 'transport'],
      [AccountCategory.UTILITIES]: ['utilities', 'bills'],
      [AccountCategory.UNCATEGORIZED]: ['miscellaneous']
    };

    tags.push(...(categoryTags[category] || []));

    // Add issuer-based tag
    if (account.issuer) {
      tags.push(account.issuer.toLowerCase().replace(/\s+/g, '-'));
    }

    return [...new Set(tags)].slice(0, 5); // Remove duplicates and limit to 5 tags
  }

  private static getDefaultResult(account: any): CategorizationResult {
    return {
      category: AccountCategory.UNCATEGORIZED,
      confidence: 0.1,
      suggestedTags: account.issuer ? [account.issuer.toLowerCase().replace(/\s+/g, '-')] : [],
      reasoning: ['Unable to categorize automatically'],
      alternatives: []
    };
  }

  /**
   * Cleanup service resources
   */
  public static cleanup(): void {
    CategorizationService.model?.dispose();
    CategorizationService.model = null;
    CategorizationService.isInitialized = false;
  }
}