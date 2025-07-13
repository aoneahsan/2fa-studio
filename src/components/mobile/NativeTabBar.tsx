/**
 * Native-style tab bar component with platform adaptations
 * @module components/mobile/NativeTabBar
 */

import React from 'react';
import { usePlatform } from '@hooks/usePlatform';
import { useLocation, useNavigate } from 'react-router-dom';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import {
  KeyIcon,
  QrCodeIcon,
  Cog6ToothIcon,
  FolderIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import {
  KeyIcon as KeyIconSolid,
  QrCodeIcon as QrCodeIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  FolderIcon as FolderIconSolid,
  ChartBarIcon as ChartBarIconSolid
} from '@heroicons/react/24/solid';

interface TabItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
}

/**
 * Platform-adaptive tab bar component
 */
const NativeTabBar: React.FC = () => {
  const platform = usePlatform();
  const location = useLocation();
  const navigate = useNavigate();

  const tabs: TabItem[] = [
    {
      path: '/accounts',
      label: 'Accounts',
      icon: <KeyIcon className="w-6 h-6" />,
      activeIcon: <KeyIconSolid className="w-6 h-6" />
    },
    {
      path: '/scan',
      label: 'Scan',
      icon: <QrCodeIcon className="w-6 h-6" />,
      activeIcon: <QrCodeIconSolid className="w-6 h-6" />
    },
    {
      path: '/folders',
      label: 'Folders',
      icon: <FolderIcon className="w-6 h-6" />,
      activeIcon: <FolderIconSolid className="w-6 h-6" />
    },
    {
      path: '/analytics',
      label: 'Stats',
      icon: <ChartBarIcon className="w-6 h-6" />,
      activeIcon: <ChartBarIconSolid className="w-6 h-6" />
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: <Cog6ToothIcon className="w-6 h-6" />,
      activeIcon: <Cog6ToothIconSolid className="w-6 h-6" />
    }
  ];

  const handleTabPress = async (path: string) => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
    navigate(path);
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  // iOS style tab bar
  if (platform.isIOS) {
    return (
      <nav 
        className={`
          ios-tab-bar fixed bottom-0 left-0 right-0 z-40
          bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl
          border-t border-gray-200 dark:border-gray-800
          ${platform.features.hasSafeArea ? 'pb-safe' : 'pb-0'}
        `}
      >
        <div className="flex items-stretch h-12">
          {tabs.map((tab) => {
            const active = isActive(tab.path);
            return (
              <button
                key={tab.path}
                onClick={() => handleTabPress(tab.path)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5
                         active:opacity-50 transition-opacity"
              >
                <div className={active ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}>
                  {active ? tab.activeIcon : tab.icon}
                </div>
                <span 
                  className={`text-[10px] ${
                    active 
                      ? 'text-primary' 
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // Android style tab bar
  if (platform.isAndroid) {
    return (
      <nav 
        className={`
          android-tab-bar fixed bottom-0 left-0 right-0 z-40
          bg-white dark:bg-gray-900
          shadow-lg
          ${platform.features.hasSafeArea ? 'pb-safe' : 'pb-0'}
        `}
      >
        <div className="flex items-stretch h-14">
          {tabs.map((tab) => {
            const active = isActive(tab.path);
            return (
              <button
                key={tab.path}
                onClick={() => handleTabPress(tab.path)}
                className="flex-1 flex flex-col items-center justify-center gap-1
                         relative overflow-hidden"
              >
                {/* Ripple effect container */}
                <div className="absolute inset-0 android-ripple" />
                
                <div 
                  className={`relative transition-all duration-200 ${
                    active 
                      ? 'text-primary transform scale-110' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {active ? tab.activeIcon : tab.icon}
                </div>
                <span 
                  className={`text-xs relative ${
                    active 
                      ? 'text-primary font-medium' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // Web/PWA tab bar
  return (
    <nav 
      className="web-tab-bar fixed bottom-0 left-0 right-0 z-40
                bg-white dark:bg-gray-900
                border-t border-gray-200 dark:border-gray-800"
    >
      <div className="flex items-stretch h-16">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => handleTabPress(tab.path)}
              className={`flex-1 flex flex-col items-center justify-center gap-1
                       transition-colors relative
                       ${active 
                         ? 'text-primary' 
                         : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                       }`}
            >
              {/* Active indicator */}
              {active && (
                <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-primary" />
              )}
              
              <div className="relative">
                {active ? tab.activeIcon : tab.icon}
              </div>
              <span className="text-xs">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default NativeTabBar;