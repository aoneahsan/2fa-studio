/**
 * AI Integration Demo Component
 * Demonstrates all AI features working together
 */

import React, { useState, useEffect } from 'react';
import { AICoordinatorService } from '../../services/ai/ai-coordinator.service';
import { CategorizationService } from '../../services/ai/categorization.service';
import { AnomalyDetectionService } from '../../services/ai/anomaly-detection.service';
import { RecommendationService } from '../../services/ai/recommendation.service';
import { NLPService } from '../../services/ai/nlp.service';
import { AnalyticsIntelligenceService } from '../../services/ai/analytics-intelligence.service';
import { MLKitService } from '../../services/ai/ml-kit.service';
import SmartBackupSuggestions from './SmartBackupSuggestions';
import IntelligentSearch from './IntelligentSearch';
import SmartOnboarding from './SmartOnboarding';

interface DemoProps {
  onClose: () => void;
}

interface DemoStep {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
  isComplete: boolean;
}

export const AIIntegrationDemo: React.FC<DemoProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);
  const [capabilities, setCapabilities] = useState<any>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [demoData] = useState({
    accounts: [
      {
        id: '1',
        issuer: 'Google',
        label: 'work@example.com',
        icon: '🔍',
        category: 'work_productivity',
        createdAt: new Date('2024-01-15'),
        lastUsed: new Date('2024-08-10'),
        usageCount: 45
      },
      {
        id: '2',
        issuer: 'GitHub',
        label: 'developer account',
        icon: '🐙',
        category: 'developer_tools',
        createdAt: new Date('2024-02-01'),
        lastUsed: new Date('2024-08-12'),
        usageCount: 78
      },
      {
        id: '3',
        issuer: 'Chase Bank',
        label: 'Personal Banking',
        icon: '🏦',
        createdAt: new Date('2024-03-01'),
        lastUsed: new Date('2024-07-20'),
        usageCount: 12
      },
      {
        id: '4',
        issuer: 'Facebook',
        label: 'Social Media',
        icon: '📘',
        createdAt: new Date('2024-04-01'),
        lastUsed: new Date('2024-08-13'),
        usageCount: 23
      },
      {
        id: '5',
        issuer: 'Steam',
        label: 'Gaming Account',
        icon: '🎮',
        createdAt: new Date('2024-05-01'),
        lastUsed: new Date('2024-08-14'),
        usageCount: 67
      }
    ],
    userActivity: [
      {
        id: '1',
        userId: 'demo-user',
        timestamp: new Date('2024-08-14T10:30:00'),
        type: 'code_generated',
        accountId: '2',
        metadata: { ip: '192.168.1.100', userAgent: 'Chrome/116.0' }
      },
      {
        id: '2',
        userId: 'demo-user',
        timestamp: new Date('2024-08-14T09:15:00'),
        type: 'account_access',
        accountId: '1',
        metadata: { ip: '192.168.1.100', userAgent: 'Chrome/116.0' }
      },
      {
        id: '3',
        userId: 'demo-user',
        timestamp: new Date('2024-08-13T14:20:00'),
        type: 'backup_created',
        metadata: { size: '2.5MB', accountCount: 5 }
      },
      {
        id: '4',
        userId: 'demo-user',
        timestamp: new Date('2024-08-12T16:45:00'),
        type: 'code_generated',
        accountId: '5',
        metadata: { ip: '192.168.1.100', userAgent: 'Chrome/116.0' }
      }
    ]
  });

  const [demoSteps, setDemoSteps] = useState<DemoStep[]>([]);
  const [demoResults, setDemoResults] = useState<any>({});

  useEffect(() => {
    initializeAIDemo();
  }, []);

  const initializeAIDemo = async () => {
    try {
      setIsInitializing(true);

      // Initialize AI Coordinator with all services
      const coordinator = AICoordinatorService.getInstance();
      await coordinator.initialize({
        enableMlKit: true,
        enableCategorization: true,
        enableAnomalyDetection: true,
        enableRecommendations: true,
        enableNLP: true,
        enableAnalytics: true,
        privacyMode: 'balanced',
        dataRetentionDays: 30
      });

      // Get capabilities
      const caps = coordinator.getCapabilities();
      setCapabilities(caps);

      // Get performance metrics
      const metrics = coordinator.getPerformanceMetrics();
      setPerformanceMetrics(metrics);

      // Set up demo steps
      const steps = createDemoSteps();
      setDemoSteps(steps);

      console.log('AI Demo initialized with capabilities:', caps);

    } catch (error) {
      console.error('AI Demo initialization failed:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const createDemoSteps = (): DemoStep[] => [
    {
      id: 'categorization',
      title: 'Intelligent Account Categorization',
      description: 'Watch AI automatically categorize accounts based on service type and usage patterns',
      component: <CategorizationDemo accounts={demoData.accounts} onResult={handleDemoResult} />,
      isComplete: false
    },
    {
      id: 'anomaly-detection',
      title: 'Security Anomaly Detection',
      description: 'See how AI detects suspicious activities and potential security threats',
      component: <AnomalyDetectionDemo activity={demoData.userActivity} onResult={handleDemoResult} />,
      isComplete: false
    },
    {
      id: 'recommendations',
      title: 'Smart Recommendations',
      description: 'Get personalized recommendations for security improvements and account management',
      component: <RecommendationsDemo accounts={demoData.accounts} activity={demoData.userActivity} onResult={handleDemoResult} />,
      isComplete: false
    },
    {
      id: 'intelligent-search',
      title: 'Natural Language Search',
      description: 'Search your accounts using natural language queries',
      component: <SearchDemo accounts={demoData.accounts} onResult={handleDemoResult} />,
      isComplete: false
    },
    {
      id: 'analytics',
      title: 'Usage Analytics & Insights',
      description: 'Advanced analytics to understand your 2FA usage patterns and security posture',
      component: <AnalyticsDemo accounts={demoData.accounts} activity={demoData.userActivity} onResult={handleDemoResult} />,
      isComplete: false
    }
  ];

  const handleDemoResult = (stepId: string, result: any) => {
    setDemoResults(prev => ({ ...prev, [stepId]: result }));
    setDemoSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, isComplete: true } : step
    ));
  };

  const nextStep = () => {
    if (currentStep < demoSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (isInitializing) {
    return (
      <div className="ai-demo-container">
        <div className="demo-loading">
          <div className="ai-loading-animation">
            <div className="brain-icon">🧠</div>
            <div className="loading-text">Initializing AI Services...</div>
          </div>
          <div className="initialization-progress">
            <div className="service-status">
              <span>• ML Kit Service</span>
              <span className="status-indicator">✓</span>
            </div>
            <div className="service-status">
              <span>• Categorization Engine</span>
              <span className="status-indicator">✓</span>
            </div>
            <div className="service-status">
              <span>• Anomaly Detection</span>
              <span className="status-indicator">✓</span>
            </div>
            <div className="service-status">
              <span>• NLP Search</span>
              <span className="status-indicator">✓</span>
            </div>
            <div className="service-status">
              <span>• Analytics Intelligence</span>
              <span className="status-indicator">✓</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentDemoStep = demoSteps[currentStep];

  return (
    <div className="ai-demo-container">
      <div className="demo-header">
        <div className="demo-title">
          <h1>🤖 AI Integration Demo</h1>
          <p>Experience the power of AI-enhanced 2FA management</p>
        </div>
        
        <div className="demo-controls">
          <button className="demo-close" onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="demo-capabilities">
        <div className="capabilities-grid">
          {capabilities && Object.entries(capabilities).map(([service, enabled]) => (
            <div key={service} className={`capability-item ${enabled ? 'enabled' : 'disabled'}`}>
              <span className="capability-icon">{enabled ? '✅' : '❌'}</span>
              <span className="capability-name">
                {service.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="demo-progress">
        <div className="progress-indicator">
          {demoSteps.map((step, index) => (
            <div 
              key={step.id}
              className={`progress-step ${index === currentStep ? 'active' : ''} ${step.isComplete ? 'complete' : ''}`}
              onClick={() => setCurrentStep(index)}
            >
              <div className="step-number">{step.isComplete ? '✓' : index + 1}</div>
              <div className="step-label">{step.title}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="demo-content">
        <div className="demo-step-header">
          <h2>{currentDemoStep.title}</h2>
          <p>{currentDemoStep.description}</p>
        </div>

        <div className="demo-step-content">
          {currentDemoStep.component}
        </div>

        {demoResults[currentDemoStep.id] && (
          <div className="demo-results">
            <h3>Demo Results:</h3>
            <pre>{JSON.stringify(demoResults[currentDemoStep.id], null, 2)}</pre>
          </div>
        )}
      </div>

      <div className="demo-navigation">
        <button 
          onClick={prevStep} 
          disabled={currentStep === 0}
          className="demo-nav-btn prev"
        >
          ← Previous
        </button>

        <div className="demo-step-counter">
          {currentStep + 1} of {demoSteps.length}
        </div>

        <button 
          onClick={nextStep}
          disabled={currentStep === demoSteps.length - 1}
          className="demo-nav-btn next"
        >
          Next →
        </button>
      </div>

      {performanceMetrics && (
        <div className="demo-performance">
          <h3>AI Performance Metrics</h3>
          <div className="metrics-grid">
            {Object.entries(performanceMetrics.accuracy).map(([service, accuracy]) => (
              <div key={service} className="metric-item">
                <span className="metric-label">{service} accuracy:</span>
                <span className="metric-value">{Math.round((accuracy as number) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Demo Components
const CategorizationDemo: React.FC<{ accounts: any[], onResult: (stepId: string, result: any) => void }> = ({ 
  accounts, 
  onResult 
}) => {
  const [results, setResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runCategorization = async () => {
    setIsRunning(true);
    try {
      const categorizationResults = [];
      
      for (const account of accounts) {
        const result = await CategorizationService.categorizeAccount(account);
        categorizationResults.push({ account: account.issuer, result });
      }
      
      setResults(categorizationResults);
      onResult('categorization', categorizationResults);
    } catch (error) {
      console.error('Categorization demo failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="demo-component">
      <button onClick={runCategorization} disabled={isRunning} className="demo-action-btn">
        {isRunning ? 'Categorizing...' : 'Run AI Categorization'}
      </button>
      
      {results.length > 0 && (
        <div className="categorization-results">
          {results.map((item, index) => (
            <div key={index} className="result-item">
              <strong>{item.account}:</strong> {item.result.category.replace('_', ' ')} 
              <span className="confidence">({Math.round(item.result.confidence * 100)}% confidence)</span>
              <div className="tags">Tags: {item.result.suggestedTags.join(', ')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AnomalyDetectionDemo: React.FC<{ activity: any[], onResult: (stepId: string, result: any) => void }> = ({ 
  activity, 
  onResult 
}) => {
  const [results, setResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runAnomalyDetection = async () => {
    setIsRunning(true);
    try {
      const anomalyResults = [];
      
      for (const event of activity) {
        const result = await AnomalyDetectionService.analyzeEvent(event);
        if (result.isAnomalous || result.score > 0.1) {
          anomalyResults.push({ event: event.type, result });
        }
      }
      
      setResults(anomalyResults);
      onResult('anomaly-detection', anomalyResults);
    } catch (error) {
      console.error('Anomaly detection demo failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="demo-component">
      <button onClick={runAnomalyDetection} disabled={isRunning} className="demo-action-btn">
        {isRunning ? 'Analyzing...' : 'Run Anomaly Detection'}
      </button>
      
      {results.length > 0 ? (
        <div className="anomaly-results">
          {results.map((item, index) => (
            <div key={index} className={`result-item ${item.result.severity}`}>
              <strong>{item.event}:</strong> 
              <span className="anomaly-score">Score: {Math.round(item.result.score * 100)}%</span>
              <span className="severity">{item.result.severity} risk</span>
              {item.result.reasons.length > 0 && (
                <div className="reasons">Reasons: {item.result.reasons.join(', ')}</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="no-anomalies">No significant anomalies detected - your account activity looks normal! ✅</div>
      )}
    </div>
  );
};

const RecommendationsDemo: React.FC<{ 
  accounts: any[], 
  activity: any[], 
  onResult: (stepId: string, result: any) => void 
}> = ({ accounts, activity, onResult }) => {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runRecommendations = async () => {
    setIsRunning(true);
    try {
      const recs = await RecommendationService.getRecommendations(accounts, activity, { limit: 5 });
      setRecommendations(recs);
      onResult('recommendations', recs);
    } catch (error) {
      console.error('Recommendations demo failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="demo-component">
      <button onClick={runRecommendations} disabled={isRunning} className="demo-action-btn">
        {isRunning ? 'Generating...' : 'Get AI Recommendations'}
      </button>
      
      {recommendations.length > 0 && (
        <div className="recommendations-results">
          {recommendations.map((rec, index) => (
            <div key={index} className={`recommendation-item ${rec.priority}`}>
              <div className="rec-header">
                <strong>{rec.title}</strong>
                <span className="priority-badge">{rec.priority}</span>
              </div>
              <div className="rec-description">{rec.description}</div>
              <div className="rec-impact">Impact: {rec.estimatedImpact}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SearchDemo: React.FC<{ accounts: any[], onResult: (stepId: string, result: any) => void }> = ({ 
  accounts, 
  onResult 
}) => {
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSearch = async (results: any[]) => {
    setSearchResults(results);
    onResult('intelligent-search', results);
  };

  return (
    <div className="demo-component">
      <div className="search-demo">
        <IntelligentSearch 
          accounts={accounts}
          onResultSelect={(account) => console.log('Selected:', account)}
          placeholder="Try: 'show my banking apps' or 'developer tools'"
        />
        
        <div className="search-suggestions">
          <h4>Try these queries:</h4>
          <div className="query-examples">
            <span>"show my banking apps"</span>
            <span>"developer tools"</span>
            <span>"work accounts"</span>
            <span>"unused accounts"</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const AnalyticsDemo: React.FC<{ 
  accounts: any[], 
  activity: any[], 
  onResult: (stepId: string, result: any) => void 
}> = ({ accounts, activity, onResult }) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runAnalytics = async () => {
    setIsRunning(true);
    try {
      const dashboardAnalytics = await AnalyticsIntelligenceService.getDashboardAnalytics(accounts, activity);
      setAnalytics(dashboardAnalytics);
      onResult('analytics', dashboardAnalytics);
    } catch (error) {
      console.error('Analytics demo failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="demo-component">
      <button onClick={runAnalytics} disabled={isRunning} className="demo-action-btn">
        {isRunning ? 'Analyzing...' : 'Generate Usage Analytics'}
      </button>
      
      {analytics && (
        <div className="analytics-results">
          <div className="analytics-grid">
            <div className="analytics-card">
              <h4>Usage Patterns</h4>
              <p>Most used: {analytics.usagePatterns.mostUsedAccounts[0]?.name || 'N/A'}</p>
              <p>Pattern: {analytics.usagePatterns.usagePattern}</p>
              <p>Avg codes/day: {Math.round(analytics.usagePatterns.averageCodesPerDay)}</p>
            </div>
            
            <div className="analytics-card">
              <h4>User Profile</h4>
              <p>Type: {analytics.behaviorAnalysis.userType}</p>
              <p>Risk: {analytics.behaviorAnalysis.riskProfile}</p>
              <p>Confidence: {Math.round(analytics.behaviorAnalysis.confidence * 100)}%</p>
            </div>
            
            <div className="analytics-card">
              <h4>Security Insights</h4>
              <p>Threat Level: {analytics.securityInsights[0]?.severity || 'low'}</p>
              <p>Insights: {analytics.securityInsights.length}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIIntegrationDemo;