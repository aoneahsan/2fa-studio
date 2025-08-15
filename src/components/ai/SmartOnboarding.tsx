/**
 * AI-Powered Smart Onboarding Component
 * Personalized onboarding experience based on user behavior and preferences
 */

import React, { useState, useEffect } from 'react';
import { AnalyticsIntelligenceService } from '../../services/ai/analytics-intelligence.service';
import { RecommendationService } from '../../services/ai/recommendation.service';
import { CategorizationService } from '../../services/ai/categorization.service';
import './SmartOnboarding.css';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
  isOptional: boolean;
  estimatedTime: string;
  aiRecommended: boolean;
  prerequisite?: string;
}

interface UserProfile {
  userType: 'beginner' | 'intermediate' | 'advanced' | 'security_focused';
  preferredComplexity: 'simple' | 'detailed' | 'expert';
  primaryUseCase: 'personal' | 'business' | 'development' | 'mixed';
  securityLevel: 'basic' | 'standard' | 'high' | 'paranoid';
  expectedAccountCount: number;
}

export const SmartOnboarding: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([]);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showPersonalization, setShowPersonalization] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Initialize smart onboarding
    initializeSmartOnboarding();
  }, []);

  useEffect(() => {
    // Update progress
    const completedCount = completedSteps.size;
    const totalSteps = onboardingSteps.length;
    setProgress(totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0);
  }, [completedSteps, onboardingSteps]);

  const initializeSmartOnboarding = async () => {
    try {
      setIsAnalyzing(true);
      
      // Check if user has existing data to personalize onboarding
      const existingAccounts = await getExistingAccounts();
      const userActivity = await getUserActivity();
      
      let profile: UserProfile;
      
      if (existingAccounts.length > 0 || userActivity.length > 0) {
        // Generate AI-powered profile based on existing data
        profile = await generateAIProfile(existingAccounts, userActivity);
        setShowPersonalization(false);
      } else {
        // Use default profile, will be updated via personalization quiz
        profile = getDefaultProfile();
      }
      
      setUserProfile(profile);
      const steps = await generatePersonalizedSteps(profile, existingAccounts);
      setOnboardingSteps(steps);
      
    } catch (error) {
      console.error('Failed to initialize smart onboarding:', error);
      // Fallback to standard onboarding
      setOnboardingSteps(getStandardOnboardingSteps());
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateAIProfile = async (accounts: any[], activity: any[]): Promise<UserProfile> => {
    try {
      const behaviorAnalysis = await AnalyticsIntelligenceService.analyzeBehavior(accounts, activity);
      
      let userType: UserProfile['userType'] = 'beginner';
      switch (behaviorAnalysis.userType) {
        case 'casual': userType = 'beginner'; break;
        case 'regular': userType = 'intermediate'; break;
        case 'power_user': userType = 'advanced'; break;
        case 'security_focused': userType = 'security_focused'; break;
      }

      const securityLevel: UserProfile['securityLevel'] = 
        behaviorAnalysis.riskProfile === 'low' ? 'high' :
        behaviorAnalysis.riskProfile === 'medium' ? 'standard' : 'basic';

      const primaryUseCase: UserProfile['primaryUseCase'] = 
        accounts.length > 20 ? 'business' :
        accounts.some(acc => acc.category === 'developer_tools') ? 'development' :
        accounts.length > 10 ? 'mixed' : 'personal';

      return {
        userType,
        preferredComplexity: userType === 'advanced' ? 'expert' : userType === 'intermediate' ? 'detailed' : 'simple',
        primaryUseCase,
        securityLevel,
        expectedAccountCount: Math.max(accounts.length, estimateAccountGrowth(accounts, activity))
      };
    } catch (error) {
      console.error('AI profile generation failed:', error);
      return getDefaultProfile();
    }
  };

  const generatePersonalizedSteps = async (profile: UserProfile, existingAccounts: any[]): Promise<OnboardingStep[]> => {
    const steps: OnboardingStep[] = [];

    // Core setup steps (always included)
    steps.push({
      id: 'welcome',
      title: 'Welcome to 2FA Studio',
      description: 'Get started with intelligent two-factor authentication management',
      component: <WelcomeStep profile={profile} />,
      isOptional: false,
      estimatedTime: '1 min',
      aiRecommended: true
    });

    // Security setup (personalized based on profile)
    if (profile.securityLevel === 'high' || profile.securityLevel === 'paranoid') {
      steps.push({
        id: 'security-setup',
        title: 'Advanced Security Setup',
        description: 'Configure biometric authentication and advanced security features',
        component: <SecuritySetupStep profile={profile} />,
        isOptional: false,
        estimatedTime: '3 min',
        aiRecommended: true
      });
    } else {
      steps.push({
        id: 'basic-security',
        title: 'Basic Security Setup',
        description: 'Set up essential security features',
        component: <BasicSecurityStep profile={profile} />,
        isOptional: false,
        estimatedTime: '2 min',
        aiRecommended: true
      });
    }

    // Account import/setup
    if (existingAccounts.length === 0) {
      steps.push({
        id: 'first-account',
        title: 'Add Your First Account',
        description: 'Learn how to add and manage 2FA accounts',
        component: <FirstAccountStep profile={profile} />,
        isOptional: false,
        estimatedTime: '2 min',
        aiRecommended: true
      });
    } else {
      steps.push({
        id: 'organize-accounts',
        title: 'Organize Your Accounts',
        description: 'Let AI help categorize and organize your existing accounts',
        component: <OrganizeAccountsStep accounts={existingAccounts} />,
        isOptional: false,
        estimatedTime: '2 min',
        aiRecommended: true
      });
    }

    // Backup setup (critical for everyone)
    steps.push({
      id: 'backup-setup',
      title: 'Secure Backup Setup',
      description: 'Protect your accounts with encrypted backups',
      component: <BackupSetupStep profile={profile} />,
      isOptional: false,
      estimatedTime: '3 min',
      aiRecommended: true
    });

    // Personalized optional steps
    if (profile.userType === 'advanced' || profile.primaryUseCase === 'business') {
      steps.push({
        id: 'advanced-features',
        title: 'Advanced Features',
        description: 'Explore automation, bulk operations, and integrations',
        component: <AdvancedFeaturesStep profile={profile} />,
        isOptional: true,
        estimatedTime: '5 min',
        aiRecommended: true
      });
    }

    if (profile.primaryUseCase === 'development') {
      steps.push({
        id: 'developer-setup',
        title: 'Developer Tools',
        description: 'Set up integrations for development workflows',
        component: <DeveloperSetupStep profile={profile} />,
        isOptional: true,
        estimatedTime: '4 min',
        aiRecommended: true
      });
    }

    // AI features introduction
    steps.push({
      id: 'ai-features',
      title: 'Discover AI Features',
      description: 'Learn about smart categorization, security insights, and recommendations',
      component: <AIFeaturesStep profile={profile} />,
      isOptional: profile.preferredComplexity === 'simple',
      estimatedTime: '3 min',
      aiRecommended: true
    });

    return steps;
  };

  const handlePersonalizationComplete = async (answers: any) => {
    setIsAnalyzing(true);
    
    try {
      const profile = generateProfileFromAnswers(answers);
      setUserProfile(profile);
      
      const steps = await generatePersonalizedSteps(profile, []);
      setOnboardingSteps(steps);
      setShowPersonalization(false);
      
    } catch (error) {
      console.error('Personalization failed:', error);
      setOnboardingSteps(getStandardOnboardingSteps());
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStepComplete = (stepId: string) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
    
    // Record completion for AI learning
    RecommendationService.recordFeedback(`onboarding-${stepId}`, 'implemented');
    
    // Auto-advance to next step if not optional
    const currentStepData = onboardingSteps[currentStep];
    if (currentStepData && !currentStepData.isOptional) {
      if (currentStep < onboardingSteps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleSkipStep = (stepId: string) => {
    RecommendationService.recordFeedback(`onboarding-${stepId}`, 'dismissed');
    
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleStepNavigation = (stepIndex: number) => {
    const step = onboardingSteps[stepIndex];
    
    // Check prerequisites
    if (step.prerequisite && !completedSteps.has(step.prerequisite)) {
      // Show warning about prerequisite
      return;
    }
    
    setCurrentStep(stepIndex);
  };

  if (isAnalyzing) {
    return (
      <div className="smart-onboarding analyzing">
        <div className="analyzing-content">
          <div className="ai-loader">
            <div className="loader-brain">🧠</div>
            <div className="loader-text">Personalizing your experience...</div>
          </div>
          <p>Our AI is analyzing your needs to create the perfect onboarding experience.</p>
        </div>
      </div>
    );
  }

  if (showPersonalization) {
    return (
      <div className="smart-onboarding personalization">
        <PersonalizationQuiz onComplete={handlePersonalizationComplete} />
      </div>
    );
  }

  if (!onboardingSteps.length) {
    return (
      <div className="smart-onboarding error">
        <div className="error-content">
          <span className="error-icon">❌</span>
          <h2>Setup Error</h2>
          <p>Unable to initialize onboarding. Please refresh and try again.</p>
        </div>
      </div>
    );
  }

  const currentStepData = onboardingSteps[currentStep];

  return (
    <div className="smart-onboarding">
      {/* Progress Header */}
      <div className="onboarding-header">
        <div className="progress-section">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="progress-text">
            {completedSteps.size} of {onboardingSteps.length} completed
          </div>
        </div>
        
        {userProfile && (
          <div className="profile-indicator">
            <span className="profile-type">{userProfile.userType}</span>
            <span className="ai-badge">AI Personalized</span>
          </div>
        )}
      </div>

      {/* Step Navigation */}
      <div className="step-navigation">
        {onboardingSteps.map((step, index) => (
          <button
            key={step.id}
            className={`step-nav-item ${
              index === currentStep ? 'active' : ''
            } ${
              completedSteps.has(step.id) ? 'completed' : ''
            } ${
              step.isOptional ? 'optional' : ''
            }`}
            onClick={() => handleStepNavigation(index)}
            disabled={step.prerequisite && !completedSteps.has(step.prerequisite)}
          >
            <div className="step-number">
              {completedSteps.has(step.id) ? '✓' : index + 1}
            </div>
            <div className="step-info">
              <div className="step-title">{step.title}</div>
              <div className="step-time">{step.estimatedTime}</div>
            </div>
            {step.aiRecommended && (
              <div className="ai-recommended">🤖</div>
            )}
          </button>
        ))}
      </div>

      {/* Current Step Content */}
      <div className="step-content">
        <div className="step-header">
          <h1>{currentStepData.title}</h1>
          <p>{currentStepData.description}</p>
          {currentStepData.isOptional && (
            <div className="optional-badge">Optional Step</div>
          )}
        </div>

        <div className="step-body">
          {React.cloneElement(currentStepData.component as React.ReactElement, {
            onComplete: () => handleStepComplete(currentStepData.id),
            onSkip: currentStepData.isOptional ? () => handleSkipStep(currentStepData.id) : undefined,
            userProfile
          })}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="step-controls">
        <button
          className="control-button secondary"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
        >
          Previous
        </button>

        <div className="step-indicator">
          Step {currentStep + 1} of {onboardingSteps.length}
        </div>

        {currentStep < onboardingSteps.length - 1 ? (
          <button
            className="control-button primary"
            onClick={() => setCurrentStep(currentStep + 1)}
          >
            Next
          </button>
        ) : (
          <button
            className="control-button success"
            onClick={() => completeOnboarding()}
          >
            Complete Setup
          </button>
        )}
      </div>
    </div>
  );
};

// Helper Components
const WelcomeStep: React.FC<{ profile: UserProfile; onComplete: () => void }> = ({ 
  profile, 
  onComplete 
}) => (
  <div className="welcome-step">
    <div className="welcome-hero">
      <span className="hero-icon">🛡️</span>
      <h2>Welcome to the Future of 2FA</h2>
      <p>
        Based on our analysis, we've personalized your setup for a{' '}
        <strong>{profile.userType}</strong> user with{' '}
        <strong>{profile.securityLevel}</strong> security needs.
      </p>
    </div>
    
    <div className="feature-highlights">
      <div className="feature">
        <span className="feature-icon">🧠</span>
        <div>
          <strong>AI-Powered</strong>
          <p>Smart categorization and security insights</p>
        </div>
      </div>
      <div className="feature">
        <span className="feature-icon">🔒</span>
        <div>
          <strong>Ultra-Secure</strong>
          <p>End-to-end encryption and biometric protection</p>
        </div>
      </div>
      <div className="feature">
        <span className="feature-icon">☁️</span>
        <div>
          <strong>Cloud Backup</strong>
          <p>Never lose access to your accounts</p>
        </div>
      </div>
    </div>
    
    <button className="welcome-continue" onClick={onComplete}>
      Let's Get Started
    </button>
  </div>
);

const PersonalizationQuiz: React.FC<{ onComplete: (answers: any) => void }> = ({ 
  onComplete 
}) => {
  const [answers, setAnswers] = useState<any>({});
  
  return (
    <div className="personalization-quiz">
      <h1>Let's Personalize Your Experience</h1>
      <p>Help us tailor 2FA Studio to your specific needs</p>
      
      {/* Quiz questions would go here */}
      <div className="quiz-questions">
        {/* Implementation details for quiz questions */}
      </div>
      
      <button onClick={() => onComplete(answers)}>
        Continue with Personalization
      </button>
    </div>
  );
};

// Helper functions
const getExistingAccounts = async (): Promise<any[]> => {
  // This would integrate with your account service
  return [];
};

const getUserActivity = async (): Promise<any[]> => {
  // This would integrate with your activity tracking
  return [];
};

const getDefaultProfile = (): UserProfile => ({
  userType: 'beginner',
  preferredComplexity: 'simple',
  primaryUseCase: 'personal',
  securityLevel: 'standard',
  expectedAccountCount: 5
});

const getStandardOnboardingSteps = (): OnboardingStep[] => {
  return [
    {
      id: 'welcome',
      title: 'Welcome',
      description: 'Get started with 2FA Studio',
      component: <div>Standard welcome</div>,
      isOptional: false,
      estimatedTime: '1 min',
      aiRecommended: false
    }
  ];
};

const generateProfileFromAnswers = (answers: any): UserProfile => {
  // Generate profile based on quiz answers
  return getDefaultProfile();
};

const estimateAccountGrowth = (accounts: any[], activity: any[]): number => {
  // AI-powered estimation of account growth
  return Math.max(accounts.length * 1.5, 10);
};

const completeOnboarding = () => {
  // Complete onboarding and navigate to main app
  console.log('Onboarding completed!');
};

// Placeholder step components (would be implemented)
const SecuritySetupStep = ({ profile }: { profile: UserProfile }) => <div>Security Setup</div>;
const BasicSecurityStep = ({ profile }: { profile: UserProfile }) => <div>Basic Security</div>;
const FirstAccountStep = ({ profile }: { profile: UserProfile }) => <div>First Account</div>;
const OrganizeAccountsStep = ({ accounts }: { accounts: any[] }) => <div>Organize Accounts</div>;
const BackupSetupStep = ({ profile }: { profile: UserProfile }) => <div>Backup Setup</div>;
const AdvancedFeaturesStep = ({ profile }: { profile: UserProfile }) => <div>Advanced Features</div>;
const DeveloperSetupStep = ({ profile }: { profile: UserProfile }) => <div>Developer Setup</div>;
const AIFeaturesStep = ({ profile }: { profile: UserProfile }) => <div>AI Features</div>;

export default SmartOnboarding;