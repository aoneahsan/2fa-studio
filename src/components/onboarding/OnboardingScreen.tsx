/**
 * Onboarding Screen Component
 * @module components/onboarding/OnboardingScreen
 */

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheckIcon, 
  DevicePhoneMobileIcon, 
  CloudArrowUpIcon,
  ChevronRightIcon 
} from '@heroicons/react/24/outline';
import { setOnboardingComplete } from '@store/slices/userSlice';
import { StrataStorage } from 'strata-storage';

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: OnboardingStep[] = [
  {
    title: 'Welcome to 2FA Studio',
    description: 'The most secure way to manage your two-factor authentication codes',
    icon: <ShieldCheckIcon className="w-16 h-16 text-primary" />
  },
  {
    title: 'Scan QR Codes',
    description: 'Easily add accounts by scanning QR codes with your camera',
    icon: <DevicePhoneMobileIcon className="w-16 h-16 text-primary" />
  },
  {
    title: 'Secure Backups',
    description: 'Your accounts are encrypted and backed up to Google Drive',
    icon: <CloudArrowUpIcon className="w-16 h-16 text-primary" />
  }
];

export const OnboardingScreen: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const completeOnboarding = async () => {
    // Mark onboarding as complete
    dispatch(setOnboardingComplete());
    
    // Save to storage
    const storage = StrataStorage.getInstance();
    await storage.set('onboardingComplete', true);
    
    // Navigate to main screen
    navigate('/');
  };

  const step = steps[currentStep];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress dots */}
      <div className="flex justify-center items-center pt-8 pb-4">
        {steps.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 mx-1 rounded-full transition-colors ${
              index === currentStep ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="mb-8">{step.icon}</div>
        
        <h1 className="text-2xl font-bold text-foreground mb-4">
          {step.title}
        </h1>
        
        <p className="text-muted-foreground max-w-sm mb-12">
          {step.description}
        </p>
      </div>

      {/* Actions */}
      <div className="p-6 space-y-3">
        <button
          onClick={handleNext}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
          <ChevronRightIcon className="w-4 h-4" />
        </button>
        
        {currentStep < steps.length - 1 && (
          <button
            onClick={handleSkip}
            className="w-full px-4 py-3 text-muted-foreground font-medium hover:text-foreground transition-colors"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
};