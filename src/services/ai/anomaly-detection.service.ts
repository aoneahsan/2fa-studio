/**
 * Security Anomaly Detection Service
 * ML-powered detection of suspicious activities and security threats
 */

import * as tf from '@tensorflow/tfjs';

export interface SecurityEvent {
  id: string;
  userId: string;
  timestamp: Date;
  type: 'login' | 'account_access' | 'backup_created' | 'settings_changed' | 'code_generated';
  metadata: {
    ip?: string;
    userAgent?: string;
    location?: { lat: number; lng: number };
    deviceFingerprint?: string;
    accountId?: string;
    success?: boolean;
  };
}

export interface AnomalyResult {
  isAnomalous: boolean;
  score: number; // 0-1, higher = more suspicious
  reasons: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendedActions: string[];
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high';
  score: number;
  factors: string[];
  recommendations: string[];
}

export interface SecurityAnalysis {
  overallThreatLevel: 'low' | 'medium' | 'high';
  anomaliesFound: number;
  recommendations: string[];
  riskFactors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
}

export class AnomalyDetectionService {
  private static isInitialized = false;
  private static model: tf.LayersModel | null = null;
  private static baselineMetrics = {
    averageSessionDuration: 0,
    typicalAccessTimes: [] as number[], // hours of day
    commonLocations: [] as Array<{ lat: number; lng: number; frequency: number }>,
    deviceFingerprints: new Set<string>(),
    ipAddresses: new Set<string>()
  };
  private static accuracyMetrics = {
    truePositives: 0,
    falsePositives: 0,
    trueNegatives: 0,
    falseNegatives: 0,
    lastUpdated: new Date()
  };

  /**
   * Initialize anomaly detection service
   */
  public static async initialize(): Promise<void> {
    if (AnomalyDetectionService.isInitialized) return;

    try {
      // Initialize baseline metrics from historical data
      await this.initializeBaseline();
      
      // In production, you would load a pre-trained model for anomaly detection
      // For now, we'll use rule-based detection with statistical analysis
      
      AnomalyDetectionService.isInitialized = true;
      console.log('Anomaly detection service initialized');
    } catch (error) {
      console.error('Failed to initialize anomaly detection service:', error);
      throw error;
    }
  }

  /**
   * Analyze a security event for anomalies
   */
  public static async analyzeEvent(event: SecurityEvent): Promise<AnomalyResult> {
    if (!AnomalyDetectionService.isInitialized) {
      await this.initialize();
    }

    try {
      const anomalyChecks = await Promise.allSettled([
        this.checkLocationAnomaly(event),
        this.checkTimeAnomaly(event),
        this.checkDeviceAnomaly(event),
        this.checkFrequencyAnomaly(event),
        this.checkBehaviorAnomaly(event)
      ]);

      const results = anomalyChecks
        .filter(check => check.status === 'fulfilled')
        .map(check => (check as PromiseFulfilledResult<Partial<AnomalyResult>>).value);

      return this.combineAnomalyResults(results, event);
    } catch (error) {
      console.error('Event analysis failed:', error);
      return this.getDefaultResult();
    }
  }

  /**
   * Assess risk level for an account
   */
  public static async assessAccountRisk(account: {
    id: string;
    issuer: string;
    createdAt: Date;
    lastUsed?: Date;
    usageCount?: number;
    category?: string;
  }): Promise<RiskAssessment> {
    const factors: string[] = [];
    let riskScore = 0;

    // Age-based risk (newer accounts might be more risky)
    const accountAge = Date.now() - account.createdAt.getTime();
    const daysSinceCreated = accountAge / (1000 * 60 * 60 * 24);
    
    if (daysSinceCreated < 1) {
      factors.push('Very new account (less than 1 day old)');
      riskScore += 0.3;
    } else if (daysSinceCreated < 7) {
      factors.push('New account (less than 1 week old)');
      riskScore += 0.1;
    }

    // Usage-based risk
    if (!account.lastUsed) {
      factors.push('Account never used');
      riskScore += 0.2;
    } else {
      const daysSinceUsed = (Date.now() - account.lastUsed.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUsed > 30) {
        factors.push('Account unused for over 30 days');
        riskScore += 0.15;
      }
    }

    // Usage frequency risk
    if ((account.usageCount || 0) === 0) {
      factors.push('Account has no usage history');
      riskScore += 0.1;
    }

    // Category-based risk assessment
    const highRiskCategories = ['banking_finance', 'developer_tools', 'security_privacy'];
    if (account.category && highRiskCategories.includes(account.category)) {
      factors.push('High-value account category');
      riskScore += 0.1;
    }

    // Determine risk level and recommendations
    let level: 'low' | 'medium' | 'high';
    const recommendations: string[] = [];

    if (riskScore >= 0.5) {
      level = 'high';
      recommendations.push('Enable biometric authentication');
      recommendations.push('Set up backup codes immediately');
      recommendations.push('Monitor usage closely');
    } else if (riskScore >= 0.25) {
      level = 'medium';
      recommendations.push('Consider additional security measures');
      recommendations.push('Regular usage monitoring recommended');
    } else {
      level = 'low';
      recommendations.push('Maintain current security practices');
    }

    return {
      level,
      score: Math.min(riskScore, 1.0),
      factors,
      recommendations
    };
  }

  /**
   * Analyze overall security posture
   */
  public static async analyzeOverallSecurity(
    accounts: any[],
    userActivity: SecurityEvent[]
  ): Promise<SecurityAnalysis> {
    const recentEvents = userActivity.filter(
      event => Date.now() - event.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000 // Last 7 days
    );

    let anomaliesCount = 0;
    const riskFactors: Array<{
      factor: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
    }> = [];

    // Analyze recent events for anomalies
    for (const event of recentEvents.slice(-50)) { // Last 50 events
      const result = await this.analyzeEvent(event);
      if (result.isAnomalous && result.severity !== 'low') {
        anomaliesCount++;
      }
    }

    // Check for security risk factors
    const uncategorizedAccounts = accounts.filter(acc => !acc.category || acc.category === 'uncategorized');
    if (uncategorizedAccounts.length > accounts.length * 0.3) {
      riskFactors.push({
        factor: 'High percentage of uncategorized accounts',
        severity: 'medium',
        description: 'Many accounts lack proper categorization, making security monitoring difficult'
      });
    }

    const oldAccounts = accounts.filter(acc => {
      const daysSinceUsed = acc.lastUsed ? 
        (Date.now() - new Date(acc.lastUsed).getTime()) / (1000 * 60 * 60 * 24) : 999;
      return daysSinceUsed > 90;
    });

    if (oldAccounts.length > 0) {
      riskFactors.push({
        factor: 'Unused accounts detected',
        severity: 'medium',
        description: `${oldAccounts.length} accounts haven't been used in over 90 days`
      });
    }

    // Determine overall threat level
    let overallThreatLevel: 'low' | 'medium' | 'high';
    if (anomaliesCount > 5 || riskFactors.some(rf => rf.severity === 'high')) {
      overallThreatLevel = 'high';
    } else if (anomaliesCount > 2 || riskFactors.some(rf => rf.severity === 'medium')) {
      overallThreatLevel = 'medium';
    } else {
      overallThreatLevel = 'low';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (anomaliesCount > 0) {
      recommendations.push('Review recent security alerts');
    }
    if (uncategorizedAccounts.length > 0) {
      recommendations.push('Categorize your accounts for better security insights');
    }
    if (oldAccounts.length > 0) {
      recommendations.push('Review and clean up unused accounts');
    }
    if (recommendations.length === 0) {
      recommendations.push('Your security posture looks good - maintain current practices');
    }

    return {
      overallThreatLevel,
      anomaliesFound: anomaliesCount,
      recommendations,
      riskFactors
    };
  }

  /**
   * Learn from anomaly feedback
   */
  public static async learnFromFeedback(
    event: SecurityEvent,
    predictedAnomaly: boolean,
    actualAnomaly: boolean
  ): Promise<void> {
    if (predictedAnomaly && actualAnomaly) {
      AnomalyDetectionService.accuracyMetrics.truePositives++;
    } else if (predictedAnomaly && !actualAnomaly) {
      AnomalyDetectionService.accuracyMetrics.falsePositives++;
    } else if (!predictedAnomaly && actualAnomaly) {
      AnomalyDetectionService.accuracyMetrics.falseNegatives++;
    } else {
      AnomalyDetectionService.accuracyMetrics.trueNegatives++;
    }

    AnomalyDetectionService.accuracyMetrics.lastUpdated = new Date();

    // In production, you would:
    // 1. Store the feedback in a database
    // 2. Retrain the model with new data
    // 3. Update detection thresholds based on feedback

    console.log(`Anomaly feedback recorded: predicted=${predictedAnomaly}, actual=${actualAnomaly}`);
  }

  /**
   * Get accuracy metrics
   */
  public static getAccuracyMetrics(): number {
    const { truePositives, falsePositives, trueNegatives, falseNegatives } = 
      AnomalyDetectionService.accuracyMetrics;
    
    const total = truePositives + falsePositives + trueNegatives + falseNegatives;
    return total > 0 ? (truePositives + trueNegatives) / total : 0;
  }

  // Private helper methods

  private static async initializeBaseline(): Promise<void> {
    // In production, this would load historical data from the database
    // For now, we'll set reasonable defaults
    AnomalyDetectionService.baselineMetrics = {
      averageSessionDuration: 5 * 60 * 1000, // 5 minutes
      typicalAccessTimes: [9, 10, 11, 14, 15, 16, 17, 18, 19, 20], // Business hours + evening
      commonLocations: [],
      deviceFingerprints: new Set(),
      ipAddresses: new Set()
    };
  }

  private static async checkLocationAnomaly(event: SecurityEvent): Promise<Partial<AnomalyResult>> {
    if (!event.metadata.location) {
      return { score: 0 };
    }

    const { lat, lng } = event.metadata.location;
    const anomalyReasons: string[] = [];
    let score = 0;

    // Check against known locations
    const isKnownLocation = AnomalyDetectionService.baselineMetrics.commonLocations.some(loc => {
      const distance = this.calculateDistance(lat, lng, loc.lat, loc.lng);
      return distance < 50; // Within 50km
    });

    if (!isKnownLocation && AnomalyDetectionService.baselineMetrics.commonLocations.length > 0) {
      anomalyReasons.push('Access from unknown location');
      score += 0.4;
    }

    // Check for impossible travel (if we have recent location data)
    // This would require more sophisticated tracking in production

    return {
      score,
      reasons: anomalyReasons
    };
  }

  private static async checkTimeAnomaly(event: SecurityEvent): Promise<Partial<AnomalyResult>> {
    const hour = event.timestamp.getHours();
    const anomalyReasons: string[] = [];
    let score = 0;

    const typicalHours = AnomalyDetectionService.baselineMetrics.typicalAccessTimes;
    
    if (!typicalHours.includes(hour)) {
      anomalyReasons.push('Access at unusual time');
      
      // Night hours (11 PM - 6 AM) are more suspicious
      if (hour >= 23 || hour <= 6) {
        score += 0.3;
      } else {
        score += 0.1;
      }
    }

    return {
      score,
      reasons: anomalyReasons
    };
  }

  private static async checkDeviceAnomaly(event: SecurityEvent): Promise<Partial<AnomalyResult>> {
    const { deviceFingerprint, userAgent } = event.metadata;
    const anomalyReasons: string[] = [];
    let score = 0;

    if (deviceFingerprint && !AnomalyDetectionService.baselineMetrics.deviceFingerprints.has(deviceFingerprint)) {
      anomalyReasons.push('Access from unknown device');
      score += 0.3;
    }

    // Basic user agent analysis
    if (userAgent) {
      const suspiciousPatterns = [
        /bot/i,
        /crawler/i,
        /scanner/i,
        /automated/i
      ];

      if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
        anomalyReasons.push('Suspicious user agent detected');
        score += 0.5;
      }
    }

    return {
      score,
      reasons: anomalyReasons
    };
  }

  private static async checkFrequencyAnomaly(event: SecurityEvent): Promise<Partial<AnomalyResult>> {
    // This would require storing and analyzing recent event frequency
    // For now, we'll do basic checks
    const anomalyReasons: string[] = [];
    let score = 0;

    // In production, you would:
    // 1. Count events from same IP/device in last hour
    // 2. Check for burst patterns
    // 3. Analyze typical usage frequency

    return {
      score,
      reasons: anomalyReasons
    };
  }

  private static async checkBehaviorAnomaly(event: SecurityEvent): Promise<Partial<AnomalyResult>> {
    const anomalyReasons: string[] = [];
    let score = 0;

    // Check for failed login attempts
    if (event.type === 'login' && event.metadata.success === false) {
      anomalyReasons.push('Failed login attempt');
      score += 0.2;
    }

    // Check for rapid account access
    if (event.type === 'account_access') {
      // In production, you would check the time between account accesses
      // Rapid access to many accounts could indicate automated behavior
    }

    return {
      score,
      reasons: anomalyReasons
    };
  }

  private static combineAnomalyResults(
    results: Partial<AnomalyResult>[],
    event: SecurityEvent
  ): AnomalyResult {
    let totalScore = 0;
    const allReasons: string[] = [];

    results.forEach(result => {
      if (result.score) totalScore += result.score;
      if (result.reasons) allReasons.push(...result.reasons);
    });

    // Normalize score
    totalScore = Math.min(totalScore, 1.0);

    // Determine if anomalous
    const isAnomalous = totalScore >= 0.3;

    // Determine severity
    let severity: 'low' | 'medium' | 'high' | 'critical';
    if (totalScore >= 0.8) severity = 'critical';
    else if (totalScore >= 0.6) severity = 'high';
    else if (totalScore >= 0.3) severity = 'medium';
    else severity = 'low';

    // Generate recommendations
    const recommendedActions: string[] = [];
    if (isAnomalous) {
      if (severity === 'critical' || severity === 'high') {
        recommendedActions.push('Immediately verify this activity');
        recommendedActions.push('Consider changing passwords');
        recommendedActions.push('Enable additional security measures');
      } else {
        recommendedActions.push('Monitor this activity');
        recommendedActions.push('Verify if this was you');
      }
    }

    return {
      isAnomalous,
      score: totalScore,
      reasons: allReasons,
      severity,
      recommendedActions
    };
  }

  private static getDefaultResult(): AnomalyResult {
    return {
      isAnomalous: false,
      score: 0,
      reasons: ['Analysis failed - assuming normal behavior'],
      severity: 'low',
      recommendedActions: []
    };
  }

  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Cleanup service resources
   */
  public static cleanup(): void {
    AnomalyDetectionService.model?.dispose();
    AnomalyDetectionService.model = null;
    AnomalyDetectionService.isInitialized = false;
  }
}