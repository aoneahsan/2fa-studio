/**
 * PWA Install Banner Component
 * @module components/common/InstallBanner
 */

import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

/**
 * Banner to prompt users to install the PWA
 */
const InstallBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown).MSStream;
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      // Show banner for iOS after a delay
      setTimeout(() => {
        const hasShownIOSBanner = localStorage.getItem('2fa-ios-install-banner-shown');
        if (!hasShownIOSBanner) {
          setShowBanner(true);
        }
      }, 3000);
      return;
    }

    // Handle install prompt for other platforms
    const handleBeforeInstallPrompt = (_e: BeforeInstallPromptEvent) => {
      _e.preventDefault();
      setDeferredPrompt(_e);
      
      const hasShownBanner = localStorage.getItem('2fa-install-banner-shown');
      if (!hasShownBanner) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      // Can't trigger install on iOS, just provide instructions
      alert('To install 2FA Studio:\n\n1. Tap the Share button\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add"');
      handleDismiss();
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
    handleDismiss();
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(isIOS ? '2fa-ios-install-banner-shown' : '2fa-install-banner-shown', 'true');
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-primary text-white p-4 shadow-lg z-50 safe-bottom">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex-1 mr-4">
          <h3 className="font-semibold text-lg">Install 2FA Studio</h3>
          <p className="text-sm opacity-90">
            {isIOS
              ? 'Add 2FA Studio to your home screen for quick access'
              : 'Install our app for a better experience with offline support'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="bg-white text-primary px-4 py-2 rounded-lg font-medium hover:bg-opacity-90 transition-colors"
          >
            {isIOS ? 'How to Install' : 'Install'}
          </button>
          <button
            onClick={handleDismiss}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallBanner;