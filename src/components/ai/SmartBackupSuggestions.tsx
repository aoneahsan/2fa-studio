/**
 * Smart Backup Suggestions Component
 * AI-powered backup recommendations and scheduling
 */

import React, { useState, useEffect } from 'react';
import { RecommendationService } from '../../services/ai/recommendation.service';
import { AnalyticsIntelligenceService } from '../../services/ai/analytics-intelligence.service';
import { BackupService } from '../../services/backup.service';
import './SmartBackupSuggestions.css';

interface BackupSuggestion {
  id: string;
  type: 'overdue' | 'scheduled' | 'critical' | 'optimization';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  actionText: string;
  estimatedTime: string;
  dataSize?: string;
  benefits: string[];
}

interface BackupAnalytics {
  lastBackupDate?: Date;
  daysSinceLastBackup: number;
  backupFrequency: 'never' | 'rare' | 'regular' | 'frequent';
  totalAccounts: number;
  unbackedUpAccounts: number;
  recommendedInterval: number; // days
}

export const SmartBackupSuggestions: React.FC = () => {
  const [suggestions, setSuggestions] = useState<BackupSuggestion[]>([]);
  const [analytics, setAnalytics] = useState<BackupAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [showDetailed, setShowDetailed] = useState(false);

  useEffect(() => {
    loadBackupSuggestions();
  }, []);

  const loadBackupSuggestions = async () => {
    try {
      setLoading(true);
      
      // Get user's backup history and account data
      const backupHistory = await BackupService.getBackupHistory();
      const accounts = await getAccounts(); // This would come from your account service
      const userActivity = await getUserActivity(); // This would come from your activity service

      // Analyze backup patterns
      const backupAnalytics = analyzeBackupPatterns(backupHistory, accounts);
      setAnalytics(backupAnalytics);

      // Generate AI-powered suggestions
      const aiSuggestions = await generateSmartSuggestions(backupAnalytics, accounts, userActivity);
      setSuggestions(aiSuggestions);

    } catch (error) {
      console.error('Failed to load backup suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeBackupPatterns = (backupHistory: any[], accounts: any[]): BackupAnalytics => {
    const lastBackup = backupHistory
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    const daysSinceLastBackup = lastBackup 
      ? Math.floor((Date.now() - new Date(lastBackup.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : Infinity;

    let backupFrequency: BackupAnalytics['backupFrequency'] = 'never';
    if (backupHistory.length === 0) {
      backupFrequency = 'never';
    } else if (backupHistory.length >= 10) {
      backupFrequency = 'frequent';
    } else if (backupHistory.length >= 3) {
      backupFrequency = 'regular';
    } else {
      backupFrequency = 'rare';
    }

    const unbackedUpAccounts = accounts.filter(acc => !acc.backedUp).length;

    // Recommend backup interval based on usage patterns
    let recommendedInterval = 30; // Default: monthly
    if (accounts.length > 20) recommendedInterval = 14; // Bi-weekly for power users
    if (accounts.length > 50) recommendedInterval = 7;  // Weekly for heavy users

    return {
      lastBackupDate: lastBackup?.createdAt ? new Date(lastBackup.createdAt) : undefined,
      daysSinceLastBackup,
      backupFrequency,
      totalAccounts: accounts.length,
      unbackedUpAccounts,
      recommendedInterval
    };
  };

  const generateSmartSuggestions = async (
    analytics: BackupAnalytics,
    accounts: any[],
    userActivity: any[]
  ): Promise<BackupSuggestion[]> => {
    const suggestions: BackupSuggestion[] = [];

    // Critical: No backup ever created
    if (analytics.backupFrequency === 'never') {
      suggestions.push({
        id: 'first-backup',
        type: 'critical',
        priority: 'high',
        title: 'Create Your First Backup',
        message: 'Protect your 2FA codes with an encrypted backup. Without a backup, you could lose access to all your accounts if your device is lost or damaged.',
        actionText: 'Create First Backup',
        estimatedTime: '2 minutes',
        dataSize: estimateDataSize(accounts),
        benefits: [
          'Prevents permanent account lockout',
          'Peace of mind with data protection',
          'Easy account recovery on new devices',
          'Encrypted and secure storage'
        ]
      });
    }

    // High Priority: Backup overdue
    else if (analytics.daysSinceLastBackup > analytics.recommendedInterval) {
      const overdueBy = analytics.daysSinceLastBackup - analytics.recommendedInterval;
      suggestions.push({
        id: 'overdue-backup',
        type: 'overdue',
        priority: 'high',
        title: 'Backup Overdue',
        message: `Your last backup was ${analytics.daysSinceLastBackup} days ago (${overdueBy} days overdue). Recent changes to your accounts may not be protected.`,
        actionText: 'Update Backup Now',
        estimatedTime: '1 minute',
        dataSize: estimateDataSize(accounts),
        benefits: [
          'Includes recent account additions',
          'Updates security settings',
          'Maintains data freshness'
        ]
      });
    }

    // Medium Priority: New accounts not backed up
    if (analytics.unbackedUpAccounts > 0) {
      suggestions.push({
        id: 'unbacked-accounts',
        type: 'optimization',
        priority: 'medium',
        title: 'New Accounts Need Backup',
        message: `${analytics.unbackedUpAccounts} account${analytics.unbackedUpAccounts > 1 ? 's' : ''} added since your last backup. Include them in your next backup to ensure complete protection.`,
        actionText: 'Backup New Accounts',
        estimatedTime: '30 seconds',
        benefits: [
          'Complete account protection',
          'Include recent additions',
          'Maintain backup completeness'
        ]
      });
    }

    // Low Priority: Schedule regular backups
    if (analytics.backupFrequency === 'rare' || analytics.backupFrequency === 'regular') {
      suggestions.push({
        id: 'schedule-backup',
        type: 'scheduled',
        priority: 'low',
        title: 'Set Up Automatic Backups',
        message: `Based on your ${analytics.totalAccounts} accounts, we recommend ${getFrequencyText(analytics.recommendedInterval)} backups. Set up automatic scheduling to never miss a backup.`,
        actionText: 'Schedule Backups',
        estimatedTime: '1 minute setup',
        benefits: [
          'Never miss a backup',
          'Automatic protection',
          'Customizable schedule',
          'Smart notifications'
        ]
      });
    }

    // AI-powered predictive suggestions
    try {
      const predictiveInsights = await AnalyticsIntelligenceService.generatePredictiveInsights(accounts, userActivity);
      const backupInsights = predictiveInsights.filter(insight => 
        insight.prediction.toLowerCase().includes('backup')
      );

      backupInsights.forEach((insight, index) => {
        suggestions.push({
          id: `ai-suggestion-${index}`,
          type: 'optimization',
          priority: 'medium',
          title: 'AI Recommendation',
          message: insight.prediction,
          actionText: 'Take Action',
          estimatedTime: insight.timeframe,
          benefits: insight.preventativeActions
        });
      });
    } catch (error) {
      console.warn('AI suggestions failed:', error);
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };

  const handleCreateBackup = async (suggestion: BackupSuggestion) => {
    try {
      setIsCreatingBackup(true);
      
      // Create backup with AI optimization
      const backupOptions = {
        includeRecentAccounts: true,
        optimizeSize: true,
        aiEnhanced: true
      };

      const backup = await BackupService.createBackup(backupOptions);
      
      // Record AI recommendation feedback
      await RecommendationService.recordFeedback(suggestion.id, 'implemented');
      
      // Refresh suggestions
      await loadBackupSuggestions();

      // Show success message (you'd implement this with your notification system)
      showNotification('Backup created successfully!', 'success');

    } catch (error) {
      console.error('Backup creation failed:', error);
      showNotification('Backup failed. Please try again.', 'error');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDismissSuggestion = async (suggestion: BackupSuggestion) => {
    await RecommendationService.recordFeedback(suggestion.id, 'dismissed');
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  };

  const handleScheduleBackup = async () => {
    // Open backup scheduling modal/page
    // This would navigate to your backup settings
  };

  const getPriorityColor = (priority: BackupSuggestion['priority']) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type: BackupSuggestion['type']) => {
    switch (type) {
      case 'critical': return '⚠️';
      case 'overdue': return '⏰';
      case 'scheduled': return '📅';
      case 'optimization': return '✨';
      default: return '💡';
    }
  };

  if (loading) {
    return (
      <div className="smart-backup-suggestions loading">
        <div className="loading-spinner"></div>
        <p>Analyzing your backup patterns...</p>
      </div>
    );
  }

  if (!suggestions.length) {
    return (
      <div className="smart-backup-suggestions empty">
        <div className="backup-status-good">
          <span className="icon">✅</span>
          <h3>Your Backups Are Up to Date!</h3>
          <p>No backup recommendations at this time. Your data is well protected.</p>
          {analytics && (
            <div className="backup-stats">
              <span>Last backup: {analytics.lastBackupDate?.toLocaleDateString()}</span>
              <span>Total accounts: {analytics.totalAccounts}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="smart-backup-suggestions">
      <div className="suggestions-header">
        <h2>Smart Backup Recommendations</h2>
        <button 
          className="toggle-detailed"
          onClick={() => setShowDetailed(!showDetailed)}
        >
          {showDetailed ? 'Simple View' : 'Detailed View'}
        </button>
      </div>

      {analytics && (
        <div className="backup-overview">
          <div className="stat">
            <span className="label">Last Backup:</span>
            <span className="value">
              {analytics.lastBackupDate 
                ? `${analytics.daysSinceLastBackup} days ago`
                : 'Never'
              }
            </span>
          </div>
          <div className="stat">
            <span className="label">Accounts:</span>
            <span className="value">{analytics.totalAccounts}</span>
          </div>
          <div className="stat">
            <span className="label">Frequency:</span>
            <span className="value">{analytics.backupFrequency}</span>
          </div>
        </div>
      )}

      <div className="suggestions-list">
        {suggestions.map((suggestion) => (
          <div 
            key={suggestion.id} 
            className={`suggestion-card ${getPriorityColor(suggestion.priority)}`}
          >
            <div className="suggestion-header">
              <div className="suggestion-info">
                <span className="type-icon">{getTypeIcon(suggestion.type)}</span>
                <div>
                  <h3>{suggestion.title}</h3>
                  <span className="priority-badge">{suggestion.priority} priority</span>
                </div>
              </div>
              <button 
                className="dismiss-button"
                onClick={() => handleDismissSuggestion(suggestion)}
                aria-label="Dismiss suggestion"
              >
                ✕
              </button>
            </div>

            <div className="suggestion-body">
              <p className="message">{suggestion.message}</p>
              
              {showDetailed && (
                <div className="suggestion-details">
                  {suggestion.dataSize && (
                    <div className="detail">
                      <strong>Backup Size:</strong> {suggestion.dataSize}
                    </div>
                  )}
                  <div className="detail">
                    <strong>Estimated Time:</strong> {suggestion.estimatedTime}
                  </div>
                  {suggestion.benefits.length > 0 && (
                    <div className="benefits">
                      <strong>Benefits:</strong>
                      <ul>
                        {suggestion.benefits.map((benefit, index) => (
                          <li key={index}>{benefit}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="suggestion-actions">
              {suggestion.type === 'scheduled' ? (
                <button 
                  className="action-button schedule"
                  onClick={handleScheduleBackup}
                >
                  {suggestion.actionText}
                </button>
              ) : (
                <button 
                  className="action-button primary"
                  onClick={() => handleCreateBackup(suggestion)}
                  disabled={isCreatingBackup}
                >
                  {isCreatingBackup ? 'Creating...' : suggestion.actionText}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="ai-attribution">
        <small>Powered by AI • Suggestions personalized to your usage patterns</small>
      </div>
    </div>
  );
};

// Helper functions
const getAccounts = async (): Promise<any[]> => {
  // This would integrate with your existing account service
  // For now, return mock data
  return [];
};

const getUserActivity = async (): Promise<any[]> => {
  // This would integrate with your existing activity tracking
  // For now, return mock data
  return [];
};

const estimateDataSize = (accounts: any[]): string => {
  const baseSize = 1; // KB per account
  const totalSize = accounts.length * baseSize;
  
  if (totalSize < 1024) {
    return `${totalSize} KB`;
  } else {
    return `${(totalSize / 1024).toFixed(1)} MB`;
  }
};

const getFrequencyText = (days: number): string => {
  if (days <= 7) return 'weekly';
  if (days <= 14) return 'bi-weekly';
  if (days <= 30) return 'monthly';
  return 'periodic';
};

const showNotification = (message: string, type: 'success' | 'error') => {
  // This would integrate with your notification system
  console.log(`${type.toUpperCase()}: ${message}`);
};

export default SmartBackupSuggestions;