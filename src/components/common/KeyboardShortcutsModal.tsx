import React, { useEffect, useState } from 'react';
import { Card } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ShortcutGroup {
  title: string;
  shortcuts: {
    keys: string[];
    description: string;
  }[];
}

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'General',
    shortcuts: [
      { keys: ['Cmd/Ctrl', 'K'], description: 'Open command palette' },
      { keys: ['Cmd/Ctrl', 'S'], description: 'Search accounts' },
      { keys: ['Cmd/Ctrl', 'N'], description: 'Add new account' },
      { keys: ['Cmd/Ctrl', ','], description: 'Open settings' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close dialog/modal' }
    ]
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['G', 'D'], description: 'Go to Dashboard' },
      { keys: ['G', 'A'], description: 'Go to Accounts' },
      { keys: ['G', 'S'], description: 'Go to Settings' },
      { keys: ['G', 'B'], description: 'Go to Backup' },
      { keys: ['↑', '↓'], description: 'Navigate list items' },
      { keys: ['Enter'], description: 'Select item' }
    ]
  },
  {
    title: 'Account Actions',
    shortcuts: [
      { keys: ['C'], description: 'Copy OTP code' },
      { keys: ['E'], description: 'Edit selected account' },
      { keys: ['D'], description: 'Delete selected account' },
      { keys: ['F'], description: 'Toggle favorite' },
      { keys: ['Space'], description: 'Show account details' },
      { keys: ['R'], description: 'Refresh OTP codes' }
    ]
  },
  {
    title: 'Productivity',
    shortcuts: [
      { keys: ['Cmd/Ctrl', 'C'], description: 'Copy to clipboard' },
      { keys: ['Cmd/Ctrl', 'V'], description: 'Paste from clipboard' },
      { keys: ['Cmd/Ctrl', 'Z'], description: 'Undo' },
      { keys: ['Cmd/Ctrl', 'Shift', 'Z'], description: 'Redo' },
      { keys: ['Tab'], description: 'Next field' },
      { keys: ['Shift', 'Tab'], description: 'Previous field' }
    ]
  }
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [platform, setPlatform] = useState<'mac' | 'windows'>('windows');

  useEffect(() => {
    // Detect platform
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    setPlatform(isMac ? 'mac' : 'windows');
  }, []);

  useEffect(() => {
    // Handle ESC key to close modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatKey = (key: string) => {
    if (key === 'Cmd/Ctrl') {
      return platform === 'mac' ? '⌘' : 'Ctrl';
    }
    if (key === 'Shift') return '⇧';
    if (key === 'Enter') return '⏎';
    if (key === 'Tab') return '⇥';
    if (key === 'Esc') return 'Esc';
    if (key === 'Space') return 'Space';
    if (key === '↑') return '↑';
    if (key === '↓') return '↓';
    return key;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-3xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="font-medium mb-3 text-muted-foreground">
                  {group.title}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-4"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded">
                              {formatKey(key)}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="text-muted-foreground">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-muted-foreground text-center">
              Press <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded">?</kbd> at any time to view these shortcuts
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Hook to manage keyboard shortcuts
export const useKeyboardShortcuts = () => {
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show shortcuts modal with "?"
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowShortcuts(true);
        return;
      }

      // Handle other shortcuts here
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            // Open command palette
            console.log('Open command palette');
            break;
          case 's':
            e.preventDefault();
            // Focus search
            console.log('Focus search');
            break;
          case 'n':
            e.preventDefault();
            // Add new account
            console.log('Add new account');
            break;
          case ',':
            e.preventDefault();
            // Open settings
            console.log('Open settings');
            break;
        }
      }

      // Navigation shortcuts (G + key)
      if (e.key === 'g' && !isCtrlOrCmd) {
        const handleNextKey = (nextEvent: KeyboardEvent) => {
          switch (nextEvent.key.toLowerCase()) {
            case 'd':
              window.location.href = '/dashboard';
              break;
            case 'a':
              window.location.href = '/accounts';
              break;
            case 's':
              window.location.href = '/settings';
              break;
            case 'b':
              window.location.href = '/backup';
              break;
          }
          document.removeEventListener('keydown', handleNextKey);
        };

        document.addEventListener('keydown', handleNextKey);
        setTimeout(() => {
          document.removeEventListener('keydown', handleNextKey);
        }, 1000);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    showShortcuts,
    setShowShortcuts
  };
};