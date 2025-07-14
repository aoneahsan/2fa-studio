/**
 * Appearance settings component
 * @module components/settings/AppearanceSettings
 */

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@src/store';
import { setTheme } from '@store/slices/settingsSlice';
import { 
  SunIcon, 
  MoonIcon, 
  ComputerDesktopIcon,
  CheckIcon 
} from '@heroicons/react/24/outline';

/**
 * Appearance settings tab component
 */
const AppearanceSettings: React.FC = () => {
  const dispatch = useDispatch();
  const { theme } = useSelector((state: RootState) => state.settings);

  const themes = [
    {
      id: 'light' as const,
      name: 'Light',
      description: 'Traditional light theme',
      icon: SunIcon,
      preview: 'bg-white text-gray-900 border-gray-200'
    },
    {
      id: 'dark' as const,
      name: 'Dark',
      description: 'Easy on the eyes',
      icon: MoonIcon,
      preview: 'bg-gray-900 text-white border-gray-700'
    },
    {
      id: 'system' as const,
      name: 'System',
      description: 'Follow system preference',
      icon: ComputerDesktopIcon,
      preview: 'bg-gradient-to-r from-white to-gray-900 text-gray-600 border-gray-400'
    }
  ];

  // Apply theme changes
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (_e: MediaQueryListEvent) => {
      const root = document.documentElement;
      if (e.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const handleThemeChange = (newTheme: typeof theme) => {
    dispatch(setTheme(newTheme) as any);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Appearance</h2>
        <p className="text-sm text-muted-foreground">
          Customize how 2FA Studio looks on your device
        </p>
      </div>

      {/* Theme Selection */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-4">Theme</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {themes.map((themeOption) => {
            const Icon = themeOption.icon;
            const isSelected = theme === themeOption.id;
            
            return (
              <button
                key={themeOption.id}
                onClick={() => handleThemeChange(themeOption.id)}
                className={`
                  relative p-4 rounded-lg border-2 transition-all
                  ${isSelected 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                  }
                `}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <CheckIcon className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                
                {/* Theme preview */}
                <div className={`
                  w-full h-20 rounded-md mb-3 border flex items-center justify-center
                  ${themeOption.preview}
                `}>
                  <Icon className="w-8 h-8" />
                </div>
                
                {/* Theme info */}
                <h4 className="font-medium text-foreground text-left">
                  {themeOption.name}
                </h4>
                <p className="text-sm text-muted-foreground text-left mt-1">
                  {themeOption.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Additional Display Settings */}
      <div className="border-t border-border pt-6">
        <h3 className="text-sm font-medium text-foreground mb-4">Display Options</h3>
        
        <div className="space-y-4">
          {/* Compact Mode */}
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-medium text-foreground">Compact Mode</p>
              <p className="text-sm text-muted-foreground">
                Show more accounts on screen
              </p>
            </div>
            <input
              type="checkbox"
              className="toggle"
              disabled
            />
          </label>
          
          {/* Large Text */}
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-medium text-foreground">Large Text</p>
              <p className="text-sm text-muted-foreground">
                Increase text size for better readability
              </p>
            </div>
            <input
              type="checkbox"
              className="toggle"
              disabled
            />
          </label>
          
          {/* High Contrast */}
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-medium text-foreground">High Contrast</p>
              <p className="text-sm text-muted-foreground">
                Enhance color contrast for accessibility
              </p>
            </div>
            <input
              type="checkbox"
              className="toggle"
              disabled
            />
          </label>
        </div>
        
        <p className="text-xs text-muted-foreground mt-4">
          Additional display options coming soon
        </p>
      </div>

      {/* Animation Settings */}
      <div className="border-t border-border pt-6">
        <h3 className="text-sm font-medium text-foreground mb-4">Animations</h3>
        
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="font-medium text-foreground">Reduce Motion</p>
            <p className="text-sm text-muted-foreground">
              Minimize animations throughout the app
            </p>
          </div>
          <input
            type="checkbox"
            className="toggle"
            disabled
          />
        </label>
      </div>
    </div>
  );
};

export default AppearanceSettings;