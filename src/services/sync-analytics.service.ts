/**
 * Sync Analytics Service
 * Provides comprehensive analytics, monitoring, and performance tracking for sync operations
 * @module services/sync-analytics
 */

import { UnifiedTrackingService } from './unified-tracking.service';
import { MobileEncryptionService } from './mobile-encryption.service';

export interface SyncMetrics {
  operationType: string;
  duration: number; // milliseconds
  dataSize: number; // bytes
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  timestamp: Date;
  deviceId: string;
  userId: string;
  bandwidth?: 'high' | 'medium' | 'low';
  connectionType?: string;
  conflictResolved?: boolean;
  compressionRatio?: number;
  encryptionTime?: number;
}

export interface PerformanceMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageDuration: number;
  medianDuration: number;
  p95Duration: number;
  p99Duration: number;
  totalDataTransferred: number;
  averageDataSize: number;
  successRate: number;
  errorRate: number;
  retryRate: number;
  conflictRate: number;
  compressionSavings: number;
  bandwidthEfficiency: number;
}

export interface DevicePerformance {
  deviceId: string;
  platform: string;
  metrics: PerformanceMetrics;
  lastSync: Date;
  healthScore: number; // 0-100
  issues: string[];
  trends: {
    period: '1h' | '24h' | '7d' | '30d';
    successRate: number[];
    avgDuration: number[];
    dataTransferred: number[];
  }[];
}

export interface SyncHealthReport {
  overall: {
    status: 'healthy' | 'warning' | 'critical';
    score: number; // 0-100
    lastUpdated: Date;
  };
  performance: PerformanceMetrics;
  devices: DevicePerformance[];
  issues: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'performance' | 'reliability' | 'security' | 'data';
    message: string;
    count: number;
    firstSeen: Date;
    lastSeen: Date;
    devices: string[];
  }[];
  recommendations: {
    priority: 'low' | 'medium' | 'high';
    category: string;
    title: string;
    description: string;
    action: string;
    impact: string;
  }[];
}

export interface NetworkQualityMetrics {
  timestamp: Date;
  bandwidth: 'high' | 'medium' | 'low';
  connectionType: string;
  latency?: number;
  throughput?: number;
  packetLoss?: number;
  jitter?: number;
  signalStrength?: number;
}

const PROJECT_PREFIX = 'fa2s_';

export class SyncAnalyticsService {
  private static readonly METRICS_KEY = `${PROJECT_PREFIX}sync_metrics`;
  private static readonly PERFORMANCE_KEY = `${PROJECT_PREFIX}performance_metrics`;
  private static readonly DEVICE_METRICS_KEY = `${PROJECT_PREFIX}device_metrics`;
  private static readonly NETWORK_METRICS_KEY = `${PROJECT_PREFIX}network_metrics`;
  private static readonly HEALTH_REPORT_KEY = `${PROJECT_PREFIX}health_report`;
  
  private static metricsBuffer: SyncMetrics[] = [];
  private static networkMetrics: NetworkQualityMetrics[] = [];
  private static performanceCache: PerformanceMetrics | null = null;
  private static deviceMetricsCache: Map<string, DevicePerformance> = new Map();
  private static healthReport: SyncHealthReport | null = null;
  
  private static config = {
    bufferSize: 100,
    flushInterval: 30000, // 30 seconds
    retentionDays: 30,
    performanceCacheExpiry: 60000, // 1 minute
    healthReportInterval: 300000, // 5 minutes
    enableRealTimeMonitoring: true,
    enableNetworkMonitoring: true,
    enablePerformanceAlerts: true,
  };

  private static flushInterval: NodeJS.Timeout | null = null;
  private static healthReportInterval: NodeJS.Timeout | null = null;
  private static networkMonitorInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the sync analytics service
   */
  static async initialize(userId: string, deviceId: string): Promise<void> {
    try {
      await this.loadStoredData();
      
      // Start periodic operations
      this.startPeriodicFlush();
      this.startHealthReportGeneration();
      
      if (this.config.enableNetworkMonitoring) {
        this.startNetworkMonitoring();
      }

      console.log('SyncAnalyticsService initialized', {
        bufferSize: this.metricsBuffer.length,
        deviceMetrics: this.deviceMetricsCache.size,
      });

      await UnifiedTrackingService.track('sync_analytics_initialized', {
        userId,
        deviceId,
        enabledFeatures: {
          realTimeMonitoring: this.config.enableRealTimeMonitoring,
          networkMonitoring: this.config.enableNetworkMonitoring,
          performanceAlerts: this.config.enablePerformanceAlerts,
        },
      });
    } catch (error) {
      console.error('Error initializing sync analytics service:', error);
    }
  }

  /**
   * Record sync operation metrics
   */
  static async recordSyncMetrics(
    operationType: string,
    duration: number,
    dataSize: number,
    success: boolean,
    userId: string,
    deviceId: string,
    options: {
      errorCode?: string;
      errorMessage?: string;
      retryCount?: number;
      bandwidth?: 'high' | 'medium' | 'low';
      connectionType?: string;
      conflictResolved?: boolean;
      compressionRatio?: number;
      encryptionTime?: number;
    } = {}
  ): Promise<void> {
    const metrics: SyncMetrics = {
      operationType,
      duration,
      dataSize,
      success,
      errorCode: options.errorCode,
      errorMessage: options.errorMessage,
      retryCount: options.retryCount || 0,
      timestamp: new Date(),
      deviceId,
      userId,
      bandwidth: options.bandwidth,
      connectionType: options.connectionType,
      conflictResolved: options.conflictResolved,
      compressionRatio: options.compressionRatio,
      encryptionTime: options.encryptionTime,
    };

    this.metricsBuffer.push(metrics);

    // Flush if buffer is full
    if (this.metricsBuffer.length >= this.config.bufferSize) {
      await this.flushMetrics();
    }

    // Invalidate performance cache
    this.performanceCache = null;

    // Real-time monitoring
    if (this.config.enableRealTimeMonitoring) {
      await this.performRealTimeAnalysis(metrics);
    }

    // Track in unified tracking
    await UnifiedTrackingService.track('sync_operation_recorded', {
      operationType,
      duration,
      success,
      retryCount: options.retryCount || 0,
    });
  }

  /**
   * Record network quality metrics
   */
  static recordNetworkMetrics(
    bandwidth: 'high' | 'medium' | 'low',
    connectionType: string,
    options: {
      latency?: number;
      throughput?: number;
      packetLoss?: number;
      jitter?: number;
      signalStrength?: number;
    } = {}
  ): void {
    const networkMetric: NetworkQualityMetrics = {
      timestamp: new Date(),
      bandwidth,
      connectionType,
      latency: options.latency,
      throughput: options.throughput,
      packetLoss: options.packetLoss,
      jitter: options.jitter,
      signalStrength: options.signalStrength,
    };

    this.networkMetrics.push(networkMetric);

    // Keep only recent network metrics
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
    this.networkMetrics = this.networkMetrics.filter(m => m.timestamp.getTime() > cutoffTime);
  }

  /**
   * Get performance metrics
   */
  static async getPerformanceMetrics(deviceId?: string, timeRange?: {
    start: Date;
    end: Date;
  }): Promise<PerformanceMetrics> {
    // Return cached performance if available and not expired
    if (this.performanceCache && !deviceId && !timeRange) {
      return this.performanceCache;
    }

    const allMetrics = await this.getAllMetrics();
    let filteredMetrics = allMetrics;

    // Filter by device
    if (deviceId) {
      filteredMetrics = filteredMetrics.filter(m => m.deviceId === deviceId);
    }

    // Filter by time range
    if (timeRange) {
      filteredMetrics = filteredMetrics.filter(m => 
        m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }

    const performance = this.calculatePerformanceMetrics(filteredMetrics);

    // Cache if no filters applied
    if (!deviceId && !timeRange) {
      this.performanceCache = performance;
      setTimeout(() => {
        this.performanceCache = null;
      }, this.config.performanceCacheExpiry);
    }

    return performance;
  }

  /**
   * Get device performance metrics
   */
  static async getDevicePerformance(deviceId: string): Promise<DevicePerformance | null> {
    // Check cache first
    if (this.deviceMetricsCache.has(deviceId)) {
      return this.deviceMetricsCache.get(deviceId)!;
    }

    const deviceMetrics = await this.getAllMetrics();
    const filteredMetrics = deviceMetrics.filter(m => m.deviceId === deviceId);

    if (filteredMetrics.length === 0) {
      return null;
    }

    const performance = this.calculatePerformanceMetrics(filteredMetrics);
    const lastSync = new Date(Math.max(...filteredMetrics.map(m => m.timestamp.getTime())));
    const healthScore = this.calculateHealthScore(performance);
    const issues = this.identifyDeviceIssues(filteredMetrics);
    const trends = this.calculateTrends(filteredMetrics);

    // Determine platform from metrics
    const platform = this.determinePlatform(filteredMetrics);

    const devicePerformance: DevicePerformance = {
      deviceId,
      platform,
      metrics: performance,
      lastSync,
      healthScore,
      issues,
      trends,
    };

    // Cache the result
    this.deviceMetricsCache.set(deviceId, devicePerformance);
    setTimeout(() => {
      this.deviceMetricsCache.delete(deviceId);
    }, this.config.performanceCacheExpiry);

    return devicePerformance;
  }

  /**
   * Get sync health report
   */
  static async getSyncHealthReport(): Promise<SyncHealthReport> {
    if (this.healthReport && this.isHealthReportFresh()) {
      return this.healthReport;
    }

    return await this.generateHealthReport();
  }

  /**
   * Get network quality history
   */
  static getNetworkQualityHistory(hours = 24): NetworkQualityMetrics[] {
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
    return this.networkMetrics.filter(m => m.timestamp.getTime() > cutoffTime);
  }

  /**
   * Get sync operation trends
   */
  static async getSyncTrends(period: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<{
    labels: string[];
    successful: number[];
    failed: number[];
    avgDuration: number[];
    dataTransferred: number[];
  }> {
    const metrics = await this.getAllMetrics();
    const periodMs = this.getPeriodInMs(period);
    const buckets = this.createTimeBuckets(periodMs, period);
    
    return this.calculateTrendData(metrics, buckets);
  }

  /**
   * Update analytics configuration
   */
  static updateConfig(config: Partial<typeof SyncAnalyticsService.config>): void {
    this.config = { ...this.config, ...config };
    
    // Restart intervals if needed
    if ('flushInterval' in config) {
      this.startPeriodicFlush();
    }
    if ('healthReportInterval' in config) {
      this.startHealthReportGeneration();
    }
    if ('enableNetworkMonitoring' in config) {
      if (config.enableNetworkMonitoring) {
        this.startNetworkMonitoring();
      } else {
        this.stopNetworkMonitoring();
      }
    }
  }

  /**
   * Export analytics data
   */
  static async exportAnalyticsData(format: 'json' | 'csv' = 'json'): Promise<string> {
    const data = {
      metrics: await this.getAllMetrics(),
      performance: await this.getPerformanceMetrics(),
      networkMetrics: this.networkMetrics,
      healthReport: await this.getSyncHealthReport(),
      exportTimestamp: new Date(),
    };

    if (format === 'csv') {
      return this.convertToCSV(data);
    }
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * Clear analytics data
   */
  static async clearAnalyticsData(): Promise<void> {
    this.metricsBuffer = [];
    this.networkMetrics = [];
    this.performanceCache = null;
    this.deviceMetricsCache.clear();
    this.healthReport = null;

    await this.saveStoredData();

    await UnifiedTrackingService.track('sync_analytics_cleared', {
      timestamp: new Date(),
    });
  }

  /**
   * Start periodic metrics flush
   */
  private static startPeriodicFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    this.flushInterval = setInterval(async () => {
      await this.flushMetrics();
    }, this.config.flushInterval);
  }

  /**
   * Start health report generation
   */
  private static startHealthReportGeneration(): void {
    if (this.healthReportInterval) {
      clearInterval(this.healthReportInterval);
    }

    this.healthReportInterval = setInterval(async () => {
      await this.generateHealthReport();
    }, this.config.healthReportInterval);
  }

  /**
   * Start network monitoring
   */
  private static startNetworkMonitoring(): void {
    if (this.networkMonitorInterval) {
      clearInterval(this.networkMonitorInterval);
    }

    this.networkMonitorInterval = setInterval(() => {
      this.collectNetworkMetrics();
    }, 60000); // Every minute
  }

  /**
   * Stop network monitoring
   */
  private static stopNetworkMonitoring(): void {
    if (this.networkMonitorInterval) {
      clearInterval(this.networkMonitorInterval);
      this.networkMonitorInterval = null;
    }
  }

  /**
   * Flush metrics to storage
   */
  private static async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    try {
      const existingMetrics = await this.getAllMetrics();
      const allMetrics = [...existingMetrics, ...this.metricsBuffer];
      
      // Keep only recent metrics
      const retentionCutoff = Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000;
      const filteredMetrics = allMetrics.filter(m => m.timestamp.getTime() > retentionCutoff);
      
      await MobileEncryptionService.secureStore(this.METRICS_KEY, JSON.stringify(filteredMetrics));
      
      console.log(`Flushed ${this.metricsBuffer.length} metrics to storage`);
      this.metricsBuffer = [];
    } catch (error) {
      console.error('Error flushing metrics:', error);
    }
  }

  /**
   * Perform real-time analysis on metrics
   */
  private static async performRealTimeAnalysis(metrics: SyncMetrics): Promise<void> {
    // Check for performance issues
    if (metrics.duration > 10000) { // > 10 seconds
      console.warn('Slow sync operation detected:', {
        operation: metrics.operationType,
        duration: metrics.duration,
        dataSize: metrics.dataSize,
      });
    }

    // Check for repeated failures
    if (!metrics.success && metrics.retryCount > 2) {
      console.warn('Repeated sync failure detected:', {
        operation: metrics.operationType,
        retryCount: metrics.retryCount,
        error: metrics.errorMessage,
      });
    }

    // Alert on performance degradation
    if (this.config.enablePerformanceAlerts) {
      await this.checkPerformanceAlerts(metrics);
    }
  }

  /**
   * Check for performance alerts
   */
  private static async checkPerformanceAlerts(metrics: SyncMetrics): Promise<void> {
    const recentMetrics = this.metricsBuffer
      .filter(m => m.operationType === metrics.operationType)
      .slice(-10); // Last 10 operations of same type

    if (recentMetrics.length >= 5) {
      const avgDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length;
      const successRate = recentMetrics.filter(m => m.success).length / recentMetrics.length;

      // Alert if average duration increased significantly
      if (metrics.duration > avgDuration * 2) {
        await UnifiedTrackingService.track('sync_performance_alert', {
          type: 'duration_spike',
          operation: metrics.operationType,
          currentDuration: metrics.duration,
          avgDuration,
          deviceId: metrics.deviceId,
        });
      }

      // Alert if success rate is low
      if (successRate < 0.8) {
        await UnifiedTrackingService.track('sync_performance_alert', {
          type: 'low_success_rate',
          operation: metrics.operationType,
          successRate,
          recentFailures: recentMetrics.filter(m => !m.success).length,
          deviceId: metrics.deviceId,
        });
      }
    }
  }

  /**
   * Generate comprehensive health report
   */
  private static async generateHealthReport(): Promise<SyncHealthReport> {
    const allMetrics = await this.getAllMetrics();
    const performance = this.calculatePerformanceMetrics(allMetrics);
    const devices = await this.generateDeviceReports(allMetrics);
    const issues = this.identifySystemIssues(allMetrics);
    const recommendations = this.generateRecommendations(performance, issues);
    
    const overallScore = this.calculateOverallHealthScore(performance, devices, issues);
    const status = this.determineHealthStatus(overallScore, issues);

    this.healthReport = {
      overall: {
        status,
        score: overallScore,
        lastUpdated: new Date(),
      },
      performance,
      devices,
      issues,
      recommendations,
    };

    await this.saveHealthReport();
    return this.healthReport;
  }

  /**
   * Calculate performance metrics from raw metrics
   */
  private static calculatePerformanceMetrics(metrics: SyncMetrics[]): PerformanceMetrics {
    if (metrics.length === 0) {
      return {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        averageDuration: 0,
        medianDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        totalDataTransferred: 0,
        averageDataSize: 0,
        successRate: 100,
        errorRate: 0,
        retryRate: 0,
        conflictRate: 0,
        compressionSavings: 0,
        bandwidthEfficiency: 0,
      };
    }

    const successful = metrics.filter(m => m.success);
    const failed = metrics.filter(m => !m.success);
    const retried = metrics.filter(m => m.retryCount > 0);
    const conflicts = metrics.filter(m => m.conflictResolved);
    const compressed = metrics.filter(m => m.compressionRatio && m.compressionRatio > 0);

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const totalDataTransferred = metrics.reduce((sum, m) => sum + m.dataSize, 0);
    const totalCompressionSavings = compressed.reduce((sum, m) => {
      const originalSize = m.dataSize / (1 - (m.compressionRatio || 0));
      return sum + (originalSize - m.dataSize);
    }, 0);

    return {
      totalOperations: metrics.length,
      successfulOperations: successful.length,
      failedOperations: failed.length,
      averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      medianDuration: durations[Math.floor(durations.length / 2)],
      p95Duration: durations[Math.floor(durations.length * 0.95)],
      p99Duration: durations[Math.floor(durations.length * 0.99)],
      totalDataTransferred,
      averageDataSize: totalDataTransferred / metrics.length,
      successRate: (successful.length / metrics.length) * 100,
      errorRate: (failed.length / metrics.length) * 100,
      retryRate: (retried.length / metrics.length) * 100,
      conflictRate: (conflicts.length / metrics.length) * 100,
      compressionSavings: totalCompressionSavings,
      bandwidthEfficiency: totalDataTransferred > 0 ? (totalCompressionSavings / totalDataTransferred) * 100 : 0,
    };
  }

  /**
   * Calculate health score (0-100)
   */
  private static calculateHealthScore(performance: PerformanceMetrics): number {
    let score = 100;
    
    // Deduct points for poor performance
    if (performance.successRate < 95) {
      score -= (95 - performance.successRate) * 2; // 2 points per percent below 95%
    }
    
    if (performance.averageDuration > 5000) { // > 5 seconds
      score -= Math.min(20, (performance.averageDuration - 5000) / 1000); // 1 point per extra second
    }
    
    if (performance.retryRate > 10) { // > 10%
      score -= (performance.retryRate - 10) * 0.5; // 0.5 points per percent above 10%
    }
    
    if (performance.conflictRate > 5) { // > 5%
      score -= (performance.conflictRate - 5) * 1; // 1 point per percent above 5%
    }
    
    return Math.max(0, Math.round(score));
  }

  /**
   * Collect network metrics
   */
  private static collectNetworkMetrics(): void {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      
      let bandwidth: 'high' | 'medium' | 'low' = 'high';
      if (connection.effectiveType) {
        switch (connection.effectiveType) {
          case 'slow-2g':
          case '2g':
            bandwidth = 'low';
            break;
          case '3g':
            bandwidth = 'medium';
            break;
          case '4g':
          default:
            bandwidth = 'high';
            break;
        }
      }

      this.recordNetworkMetrics(bandwidth, connection.type || 'unknown', {
        latency: connection.rtt,
        throughput: connection.downlink,
      });
    }
  }

  /**
   * Helper methods for calculations and utilities
   */
  private static getPeriodInMs(period: '1h' | '24h' | '7d' | '30d'): number {
    const periods = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };
    return periods[period];
  }

  private static createTimeBuckets(periodMs: number, period: string): string[] {
    const buckets = [];
    const bucketCount = period === '1h' ? 60 : period === '24h' ? 24 : period === '7d' ? 7 : 30;
    const bucketSize = periodMs / bucketCount;
    const now = Date.now();

    for (let i = bucketCount - 1; i >= 0; i--) {
      const bucketTime = new Date(now - i * bucketSize);
      buckets.push(bucketTime.toISOString());
    }

    return buckets;
  }

  private static calculateTrendData(metrics: SyncMetrics[], buckets: string[]): any {
    // Implementation for trend calculation would go here
    // This is a placeholder structure
    return {
      labels: buckets,
      successful: new Array(buckets.length).fill(0),
      failed: new Array(buckets.length).fill(0),
      avgDuration: new Array(buckets.length).fill(0),
      dataTransferred: new Array(buckets.length).fill(0),
    };
  }

  private static calculateTrends(metrics: SyncMetrics[]): any[] {
    // Implementation for trend calculation would go here
    return [];
  }

  private static determinePlatform(metrics: SyncMetrics[]): string {
    // This would be enhanced to actually determine platform from metrics
    return 'unknown';
  }

  private static identifyDeviceIssues(metrics: SyncMetrics[]): string[] {
    const issues = [];
    const performance = this.calculatePerformanceMetrics(metrics);
    
    if (performance.successRate < 90) {
      issues.push('Low sync success rate');
    }
    
    if (performance.averageDuration > 10000) {
      issues.push('Slow sync performance');
    }
    
    if (performance.retryRate > 15) {
      issues.push('High retry rate');
    }
    
    return issues;
  }

  private static identifySystemIssues(metrics: SyncMetrics[]): any[] {
    // Implementation for system-wide issue identification
    return [];
  }

  private static generateDeviceReports(metrics: SyncMetrics[]): Promise<DevicePerformance[]> {
    // Implementation for generating device reports
    return Promise.resolve([]);
  }

  private static generateRecommendations(performance: PerformanceMetrics, issues: any[]): any[] {
    // Implementation for generating recommendations
    return [];
  }

  private static calculateOverallHealthScore(performance: PerformanceMetrics, devices: DevicePerformance[], issues: any[]): number {
    // Implementation for calculating overall health score
    return this.calculateHealthScore(performance);
  }

  private static determineHealthStatus(score: number, issues: any[]): 'healthy' | 'warning' | 'critical' {
    if (score >= 90 && issues.length === 0) return 'healthy';
    if (score >= 70) return 'warning';
    return 'critical';
  }

  private static isHealthReportFresh(): boolean {
    return this.healthReport !== null && 
           (Date.now() - this.healthReport.overall.lastUpdated.getTime()) < this.config.healthReportInterval;
  }

  private static convertToCSV(data: any): string {
    // Implementation for CSV conversion
    return 'CSV conversion not implemented';
  }

  /**
   * Storage operations
   */
  private static async getAllMetrics(): Promise<SyncMetrics[]> {
    try {
      const metricsStr = await MobileEncryptionService.secureGet(this.METRICS_KEY);
      if (!metricsStr) return [...this.metricsBuffer];
      
      const stored = JSON.parse(metricsStr);
      const parsedMetrics = stored.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
      
      return [...parsedMetrics, ...this.metricsBuffer];
    } catch (error) {
      console.error('Error loading metrics:', error);
      return [...this.metricsBuffer];
    }
  }

  private static async loadStoredData(): Promise<void> {
    try {
      // Load network metrics
      const networkStr = await MobileEncryptionService.secureGet(this.NETWORK_METRICS_KEY);
      if (networkStr) {
        const storedNetwork = JSON.parse(networkStr);
        this.networkMetrics = storedNetwork.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
      }

      // Load health report
      const healthStr = await MobileEncryptionService.secureGet(this.HEALTH_REPORT_KEY);
      if (healthStr) {
        const storedHealth = JSON.parse(healthStr);
        this.healthReport = {
          ...storedHealth,
          overall: {
            ...storedHealth.overall,
            lastUpdated: new Date(storedHealth.overall.lastUpdated),
          },
        };
      }
    } catch (error) {
      console.error('Error loading stored analytics data:', error);
    }
  }

  private static async saveStoredData(): Promise<void> {
    try {
      // Save network metrics
      await MobileEncryptionService.secureStore(
        this.NETWORK_METRICS_KEY,
        JSON.stringify(this.networkMetrics)
      );
    } catch (error) {
      console.error('Error saving analytics data:', error);
    }
  }

  private static async saveHealthReport(): Promise<void> {
    try {
      if (this.healthReport) {
        await MobileEncryptionService.secureStore(
          this.HEALTH_REPORT_KEY,
          JSON.stringify(this.healthReport)
        );
      }
    } catch (error) {
      console.error('Error saving health report:', error);
    }
  }

  /**
   * Cleanup and shutdown
   */
  static cleanup(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    if (this.healthReportInterval) {
      clearInterval(this.healthReportInterval);
      this.healthReportInterval = null;
    }
    
    if (this.networkMonitorInterval) {
      clearInterval(this.networkMonitorInterval);
      this.networkMonitorInterval = null;
    }

    // Final flush
    this.flushMetrics();
    
    this.metricsBuffer = [];
    this.networkMetrics = [];
    this.performanceCache = null;
    this.deviceMetricsCache.clear();
    this.healthReport = null;
  }
}