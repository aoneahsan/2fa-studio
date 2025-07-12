/**
 * Ad Banner Component
 * @module components/ads/AdBanner
 */

import React, { useEffect } from 'react';
import { useAds } from '../../hooks/useAds';

interface AdBannerProps {
  position?: 'top' | 'bottom';
  showOnMount?: boolean;
}

const AdBanner: React.FC<AdBannerProps> = ({ 
  position = 'bottom',
  showOnMount = true 
}) => {
  const { showBanner, hideBanner, shouldShowAds } = useAds();

  useEffect(() => {
    if (showOnMount && shouldShowAds) {
      showBanner(position);
    }

    return () => {
      // Hide banner when component unmounts
      hideBanner();
    };
  }, [showOnMount, shouldShowAds, position, showBanner, hideBanner]);

  // This component doesn't render anything in the DOM
  // The native AdMob SDK handles the banner display
  return null;
};

export default AdBanner;