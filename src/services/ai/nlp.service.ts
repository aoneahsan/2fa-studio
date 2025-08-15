/**
 * Natural Language Processing Service
 * Intelligent search, text analysis, and language understanding
 */

export interface SearchResult {
  item: any;
  score: number;
  matchedFields: string[];
  highlights: Array<{
    field: string;
    text: string;
    positions: Array<{ start: number; end: number }>;
  }>;
}

export interface SearchResponse {
  results: SearchResult[];
  suggestions: string[];
  intent: string;
  totalResults: number;
  processingTime: number;
}

export interface TextAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  entities: Array<{
    text: string;
    type: 'service' | 'category' | 'action' | 'security_term';
    confidence: number;
  }>;
  intent: string;
  keywords: string[];
}

export interface QueryIntent {
  type: 'search' | 'filter' | 'action' | 'question';
  confidence: number;
  entities: Array<{ text: string; type: string }>;
  parameters: Record<string, any>;
}

export class NLPService {
  private static isInitialized = false;
  private static searchIndex = new Map<string, any>();
  private static synonyms = new Map<string, string[]>();
  private static stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must', 'shall'
  ]);

  /**
   * Initialize NLP service
   */
  public static async initialize(): Promise<void> {
    if (NLPService.isInitialized) return;

    try {
      // Initialize synonyms for better search
      await this.initializeSynonyms();
      
      // Initialize intent patterns
      await this.initializeIntentPatterns();
      
      NLPService.isInitialized = true;
      console.log('NLP service initialized');
    } catch (error) {
      console.error('Failed to initialize NLP service:', error);
      throw error;
    }
  }

  /**
   * Perform intelligent search with NLP
   */
  public static async performSearch(query: string, items: any[]): Promise<SearchResponse> {
    if (!NLPService.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    try {
      // Analyze query intent
      const intent = await this.analyzeIntent(query);
      
      // Process and expand query
      const processedQuery = this.processQuery(query);
      
      // Build search index if not exists
      if (NLPService.searchIndex.size === 0) {
        this.buildSearchIndex(items);
      }

      // Perform search
      const results = this.executeSearch(processedQuery, items, intent);
      
      // Generate suggestions
      const suggestions = this.generateSearchSuggestions(query, items);

      const processingTime = Date.now() - startTime;

      return {
        results,
        suggestions,
        intent: intent.type,
        totalResults: results.length,
        processingTime
      };
    } catch (error) {
      console.error('Search failed:', error);
      return this.getFallbackSearchResults(query, items, Date.now() - startTime);
    }
  }

  /**
   * Analyze text for sentiment, entities, and intent
   */
  public static async analyzeText(text: string): Promise<TextAnalysis> {
    if (!NLPService.isInitialized) {
      await this.initialize();
    }

    try {
      const words = this.tokenize(text);
      
      // Simple sentiment analysis
      const sentiment = this.analyzeSentiment(words);
      
      // Named entity recognition
      const entities = this.extractEntities(text);
      
      // Intent classification
      const intent = await this.classifyIntent(text);
      
      // Extract keywords
      const keywords = this.extractKeywords(words);

      return {
        sentiment: sentiment.label,
        confidence: sentiment.confidence,
        entities,
        intent,
        keywords
      };
    } catch (error) {
      console.error('Text analysis failed:', error);
      return this.getDefaultTextAnalysis();
    }
  }

  /**
   * Generate search suggestions based on query
   */
  public static generateSearchSuggestions(query: string, items: any[]): string[] {
    const suggestions: string[] = [];
    const queryLower = query.toLowerCase();

    // Extract common terms from items
    const terms = new Set<string>();
    items.forEach(item => {
      if (item.issuer) {
        terms.add(item.issuer.toLowerCase());
      }
      if (item.category) {
        terms.add(item.category.replace('_', ' '));
      }
      if (item.label) {
        terms.add(item.label.toLowerCase());
      }
    });

    // Find similar terms
    terms.forEach(term => {
      if (term.includes(queryLower) && term !== queryLower) {
        suggestions.push(term);
      }
    });

    // Add category-based suggestions
    if (queryLower.includes('bank') || queryLower.includes('finance')) {
      suggestions.push('banking accounts', 'financial services');
    }
    if (queryLower.includes('social')) {
      suggestions.push('social media accounts', 'social networks');
    }
    if (queryLower.includes('work') || queryLower.includes('office')) {
      suggestions.push('work accounts', 'productivity tools');
    }

    // Add action-based suggestions
    if (queryLower.includes('unused') || queryLower.includes('old')) {
      suggestions.push('show unused accounts', 'accounts not used recently');
    }

    return suggestions.slice(0, 5);
  }

  /**
   * Analyze query intent and extract parameters
   */
  public static async analyzeIntent(query: string): Promise<QueryIntent> {
    const queryLower = query.toLowerCase();
    
    // Intent patterns
    const patterns = [
      {
        type: 'filter' as const,
        patterns: [/show (.*) accounts?/, /filter by (.*)/, /find (.*) accounts?/],
        confidence: 0.9
      },
      {
        type: 'search' as const,
        patterns: [/search for (.*)/, /find (.*)/, /look for (.*)/],
        confidence: 0.8
      },
      {
        type: 'action' as const,
        patterns: [/delete (.*)/, /remove (.*)/, /backup (.*)/, /export (.*)/],
        confidence: 0.95
      },
      {
        type: 'question' as const,
        patterns: [/how many (.*)/, /what is (.*)/, /which (.*)/, /when (.*)/],
        confidence: 0.7
      }
    ];

    for (const pattern of patterns) {
      for (const regex of pattern.patterns) {
        const match = queryLower.match(regex);
        if (match) {
          const entities = this.extractEntities(query);
          return {
            type: pattern.type,
            confidence: pattern.confidence,
            entities,
            parameters: { matched: match[1] || '' }
          };
        }
      }
    }

    // Default to search intent
    return {
      type: 'search',
      confidence: 0.5,
      entities: this.extractEntities(query),
      parameters: {}
    };
  }

  /**
   * Smart auto-complete for search queries
   */
  public static getAutocompleteSuggestions(
    partialQuery: string,
    items: any[],
    limit: number = 5
  ): string[] {
    const suggestions: string[] = [];
    const queryLower = partialQuery.toLowerCase();

    if (queryLower.length < 2) return suggestions;

    // Collect potential completions
    const completions = new Set<string>();

    items.forEach(item => {
      // Issuer completions
      if (item.issuer && item.issuer.toLowerCase().startsWith(queryLower)) {
        completions.add(item.issuer);
      }
      
      // Category completions
      if (item.category) {
        const categoryDisplay = item.category.replace('_', ' ');
        if (categoryDisplay.toLowerCase().startsWith(queryLower)) {
          completions.add(categoryDisplay);
        }
      }
      
      // Label completions
      if (item.label && item.label.toLowerCase().startsWith(queryLower)) {
        completions.add(item.label);
      }
    });

    // Add semantic completions
    this.addSemanticCompletions(queryLower, completions);

    return Array.from(completions).slice(0, limit);
  }

  /**
   * Extract meaningful keywords from text
   */
  public static extractKeywords(text: string | string[], maxKeywords: number = 10): string[] {
    const words = Array.isArray(text) ? text : this.tokenize(text);
    
    // Filter out stop words and short words
    const filteredWords = words.filter(word => 
      !NLPService.stopWords.has(word.toLowerCase()) && 
      word.length > 2
    );

    // Count word frequency
    const wordCount = new Map<string, number>();
    filteredWords.forEach(word => {
      const lowerWord = word.toLowerCase();
      wordCount.set(lowerWord, (wordCount.get(lowerWord) || 0) + 1);
    });

    // Sort by frequency and return top keywords
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  // Private helper methods

  private static async initializeSynonyms(): Promise<void> {
    NLPService.synonyms.set('bank', ['banking', 'finance', 'financial', 'money']);
    NLPService.synonyms.set('social', ['social media', 'facebook', 'twitter', 'instagram']);
    NLPService.synonyms.set('work', ['office', 'business', 'productivity', 'enterprise']);
    NLPService.synonyms.set('game', ['gaming', 'games', 'entertainment']);
    NLPService.synonyms.set('shop', ['shopping', 'store', 'ecommerce', 'retail']);
    NLPService.synonyms.set('dev', ['developer', 'development', 'coding', 'programming']);
    NLPService.synonyms.set('security', ['safety', 'protection', 'privacy']);
  }

  private static async initializeIntentPatterns(): Promise<void> {
    // Intent patterns would be loaded here in production
    // This could be from a trained model or predefined rules
  }

  private static processQuery(query: string): string {
    let processed = query.toLowerCase().trim();
    
    // Expand synonyms
    NLPService.synonyms.forEach((synonyms, word) => {
      synonyms.forEach(synonym => {
        processed = processed.replace(new RegExp(`\\b${synonym}\\b`, 'g'), word);
      });
    });

    return processed;
  }

  private static buildSearchIndex(items: any[]): void {
    NLPService.searchIndex.clear();
    
    items.forEach((item, index) => {
      const searchableText = [
        item.issuer || '',
        item.label || '',
        item.category ? item.category.replace('_', ' ') : '',
        item.notes || ''
      ].join(' ').toLowerCase();

      NLPService.searchIndex.set(index.toString(), {
        item,
        searchableText,
        keywords: this.extractKeywords(searchableText)
      });
    });
  }

  private static executeSearch(query: string, items: any[], intent: QueryIntent): SearchResult[] {
    const results: SearchResult[] = [];
    const queryTerms = this.tokenize(query);

    NLPService.searchIndex.forEach((indexEntry, id) => {
      const score = this.calculateSearchScore(queryTerms, indexEntry, intent);
      
      if (score > 0.1) { // Minimum relevance threshold
        const highlights = this.generateHighlights(queryTerms, indexEntry);
        const matchedFields = this.getMatchedFields(queryTerms, indexEntry.item);

        results.push({
          item: indexEntry.item,
          score,
          matchedFields,
          highlights
        });
      }
    });

    return results.sort((a, b) => b.score - a.score);
  }

  private static calculateSearchScore(queryTerms: string[], indexEntry: any, intent: QueryIntent): number {
    let score = 0;
    const { searchableText, keywords } = indexEntry;

    // Exact match bonus
    queryTerms.forEach(term => {
      if (searchableText.includes(term)) {
        score += 1.0;
        
        // Bonus for exact field matches
        if (indexEntry.item.issuer?.toLowerCase().includes(term)) {
          score += 0.5;
        }
        if (indexEntry.item.label?.toLowerCase().includes(term)) {
          score += 0.3;
        }
      }
    });

    // Keyword match bonus
    queryTerms.forEach(term => {
      if (keywords.includes(term)) {
        score += 0.3;
      }
    });

    // Intent-based scoring
    if (intent.type === 'filter' && intent.parameters.matched) {
      const filterTerm = intent.parameters.matched.toLowerCase();
      if (indexEntry.item.category?.replace('_', ' ').includes(filterTerm)) {
        score += 1.0;
      }
    }

    // Normalize score
    return Math.min(score / queryTerms.length, 1.0);
  }

  private static generateHighlights(queryTerms: string[], indexEntry: any): Array<{
    field: string;
    text: string;
    positions: Array<{ start: number; end: number }>;
  }> {
    const highlights: Array<{
      field: string;
      text: string;
      positions: Array<{ start: number; end: number }>;
    }> = [];

    const fields = [
      { name: 'issuer', value: indexEntry.item.issuer || '' },
      { name: 'label', value: indexEntry.item.label || '' },
      { name: 'category', value: indexEntry.item.category?.replace('_', ' ') || '' }
    ];

    fields.forEach(field => {
      if (field.value) {
        const positions: Array<{ start: number; end: number }> = [];
        queryTerms.forEach(term => {
          const regex = new RegExp(term, 'gi');
          let match;
          while ((match = regex.exec(field.value)) !== null) {
            positions.push({
              start: match.index,
              end: match.index + match[0].length
            });
          }
        });

        if (positions.length > 0) {
          highlights.push({
            field: field.name,
            text: field.value,
            positions
          });
        }
      }
    });

    return highlights;
  }

  private static getMatchedFields(queryTerms: string[], item: any): string[] {
    const matchedFields: string[] = [];
    
    queryTerms.forEach(term => {
      if (item.issuer?.toLowerCase().includes(term)) {
        matchedFields.push('issuer');
      }
      if (item.label?.toLowerCase().includes(term)) {
        matchedFields.push('label');
      }
      if (item.category?.replace('_', ' ').toLowerCase().includes(term)) {
        matchedFields.push('category');
      }
    });

    return [...new Set(matchedFields)];
  }

  private static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  private static analyzeSentiment(words: string[]): { label: 'positive' | 'negative' | 'neutral'; confidence: number } {
    // Simple rule-based sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'perfect', 'love', 'like'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'broken', 'error'];

    let positiveScore = 0;
    let negativeScore = 0;

    words.forEach(word => {
      if (positiveWords.includes(word)) positiveScore++;
      if (negativeWords.includes(word)) negativeScore++;
    });

    if (positiveScore > negativeScore) {
      return { label: 'positive', confidence: Math.min(positiveScore / words.length * 3, 1) };
    } else if (negativeScore > positiveScore) {
      return { label: 'negative', confidence: Math.min(negativeScore / words.length * 3, 1) };
    } else {
      return { label: 'neutral', confidence: 0.5 };
    }
  }

  private static extractEntities(text: string): Array<{
    text: string;
    type: 'service' | 'category' | 'action' | 'security_term';
    confidence: number;
  }> {
    const entities: Array<{
      text: string;
      type: 'service' | 'category' | 'action' | 'security_term';
      confidence: number;
    }> = [];

    // Service names
    const servicePatterns = [
      /\b(google|microsoft|facebook|github|amazon|apple|twitter)\b/gi,
      /\b(paypal|stripe|bank|visa|mastercard)\b/gi
    ];

    // Categories
    const categoryPatterns = [
      /\b(banking|finance|social|work|gaming|shopping|security)\b/gi
    ];

    // Actions
    const actionPatterns = [
      /\b(delete|remove|add|create|backup|export|import)\b/gi
    ];

    // Security terms
    const securityPatterns = [
      /\b(2fa|totp|otp|backup|codes|authentication|security)\b/gi
    ];

    const patterns = [
      { regex: servicePatterns, type: 'service' as const },
      { regex: categoryPatterns, type: 'category' as const },
      { regex: actionPatterns, type: 'action' as const },
      { regex: securityPatterns, type: 'security_term' as const }
    ];

    patterns.forEach(({ regex, type }) => {
      if (Array.isArray(regex)) {
        regex.forEach(r => {
          let match;
          while ((match = r.exec(text)) !== null) {
            entities.push({
              text: match[0],
              type,
              confidence: 0.8
            });
          }
        });
      }
    });

    return entities;
  }

  private static async classifyIntent(text: string): Promise<string> {
    const textLower = text.toLowerCase();
    
    if (textLower.includes('show') || textLower.includes('find') || textLower.includes('search')) {
      return 'search_intent';
    }
    if (textLower.includes('delete') || textLower.includes('remove')) {
      return 'delete_intent';
    }
    if (textLower.includes('add') || textLower.includes('create')) {
      return 'create_intent';
    }
    if (textLower.includes('backup') || textLower.includes('export')) {
      return 'backup_intent';
    }
    
    return 'general_intent';
  }

  private static addSemanticCompletions(query: string, completions: Set<string>): void {
    // Add semantic suggestions based on query
    const semanticSuggestions = [
      { pattern: /bank/, suggestions: ['banking accounts', 'financial services'] },
      { pattern: /social/, suggestions: ['social media', 'social networks'] },
      { pattern: /work/, suggestions: ['work accounts', 'productivity tools'] },
      { pattern: /unused/, suggestions: ['unused accounts', 'inactive accounts'] },
      { pattern: /recent/, suggestions: ['recent accounts', 'recently added'] }
    ];

    semanticSuggestions.forEach(({ pattern, suggestions }) => {
      if (pattern.test(query)) {
        suggestions.forEach(suggestion => completions.add(suggestion));
      }
    });
  }

  private static getFallbackSearchResults(query: string, items: any[], processingTime: number): SearchResponse {
    // Simple fallback search
    const results = items
      .filter(item => 
        item.issuer?.toLowerCase().includes(query.toLowerCase()) ||
        item.label?.toLowerCase().includes(query.toLowerCase())
      )
      .map(item => ({
        item,
        score: 0.5,
        matchedFields: ['issuer'],
        highlights: []
      }));

    return {
      results,
      suggestions: [],
      intent: 'simple_search',
      totalResults: results.length,
      processingTime
    };
  }

  private static getDefaultTextAnalysis(): TextAnalysis {
    return {
      sentiment: 'neutral',
      confidence: 0.1,
      entities: [],
      intent: 'unknown',
      keywords: []
    };
  }

  /**
   * Cleanup service resources
   */
  public static cleanup(): void {
    NLPService.isInitialized = false;
    NLPService.searchIndex.clear();
    NLPService.synonyms.clear();
  }
}