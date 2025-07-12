/**
 * Ad Interstitial Trigger Component
 * @module components/ads/AdInterstitialTrigger
 */

import { useEffect, useRef } from 'react';
import { useAds } from '../../hooks/useAds';
import { useAppSelector } from '../../store/hooks';

interface AdInterstitialTriggerProps {
  triggerAfterActions?: number; // Show ad after X actions
  triggerAfterSeconds?: number; // Show ad after X seconds
}

const AdInterstitialTrigger: React.FC<AdInterstitialTriggerProps> = ({
  triggerAfterActions = 5,
  triggerAfterSeconds = 180, // 3 minutes
}) => {
  const { showInterstitial, shouldShowAds } = useAds();
  const actionCount = useRef(0);
  const lastAdTime = useRef(Date.now());
  const hasShownTimedAd = useRef(false);

  // Listen for account-related actions
  const accounts = useAppSelector((state) => state.accounts.accounts);
  const previousAccountsLength = useRef(accounts.length);

  useEffect(() => {
    // Check if accounts were added/modified
    if (accounts.length !== previousAccountsLength.current) {
      actionCount.current++;
      previousAccountsLength.current = accounts.length;

      // Show ad after X actions
      if (shouldShowAds && actionCount.current >= triggerAfterActions) {
        const timeSinceLastAd = Date.now() - lastAdTime.current;
        
        // Only show if at least 60 seconds have passed since last ad
        if (timeSinceLastAd > 60000) {
          showInterstitial();
          actionCount.current = 0;
          lastAdTime.current = Date.now();
        }
      }
    }
  }, [accounts.length, shouldShowAds, showInterstitial, triggerAfterActions]);

  // Time-based trigger
  useEffect(() => {
    if (!shouldShowAds || hasShownTimedAd.current) return;

    const timer = setTimeout(() => {
      if (shouldShowAds && !hasShownTimedAd.current) {
        showInterstitial();
        hasShownTimedAd.current = true;
        lastAdTime.current = Date.now();
      }
    }, triggerAfterSeconds * 1000);

    return () => clearTimeout(timer);
  }, [shouldShowAds, showInterstitial, triggerAfterSeconds]);

  return null;
};

export default AdInterstitialTrigger;