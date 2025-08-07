/**
 * Auto Update Manager Component
 * Handles automatic update checks and user notifications
 * @module components/updates/AutoUpdateManager
 */

import React, { useEffect } from 'react';
import { useAutoUpdate } from '@hooks/useAutoUpdate';
import { useFeatureFlag, FEATURE_FLAGS } from '@hooks/useFeatureFlag';
import { Capacitor } from '@capacitor/core';

const AutoUpdateManager: React.FC = () => {
  const isUpdateEnabled = useFeatureFlag(FEATURE_FLAGS.IN_APP_UPDATES, true);
  
  const {
    updateAvailable,
    updateInfo,
    downloadUpdate,
    installUpdate
  } = useAutoUpdate({
    checkInterval: 6 * 60 * 60 * 1000, // 6 hours
    showNotifications: true,
    autoDownload: false
  });

  // Only render on native platforms when feature is enabled
  if (!Capacitor.isNativePlatform() || !isUpdateEnabled) {
    return null;
  }

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Update Available
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Version {updateInfo?.version} is ready to install
          </p>
          {updateInfo?.releaseNotes && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {updateInfo.releaseNotes}
            </p>
          )}
          <div className="mt-3 flex space-x-2">
            <button
              onClick={async () => {
                await downloadUpdate();
                await installUpdate();
              }}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Update Now
            </button>
            <button
              onClick={() => {
                // Hide the notification
                const element = document.querySelector('.fixed.bottom-4.right-4');
                if (element) {
                  element.remove();
                }
              }}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoUpdateManager;