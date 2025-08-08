import React, { useState } from 'react';
import { 
  ExclamationTriangleIcon,
  DevicePhoneMobileIcon,
  CloudIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { Button } from '@components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface ConflictData {
  localVersion: {
    lastModified: Date;
    accountsCount: number;
    device: string;
  };
  remoteVersion: {
    lastModified: Date;
    accountsCount: number;
    device: string;
  };
  differences: {
    added: string[];
    removed: string[];
    modified: string[];
  };
}

interface SyncConflictResolutionProps {
  conflict: ConflictData;
  onResolve: (resolution: 'local' | 'remote' | 'merge') => void;
  onCancel: () => void;
  isResolving?: boolean;
}

export const SyncConflictResolution: React.FC<SyncConflictResolutionProps> = ({
  conflict,
  onResolve,
  onCancel,
  isResolving = false
}) => {
  const [selectedResolution, setSelectedResolution] = useState<'local' | 'remote' | 'merge' | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleResolve = () => {
    if (selectedResolution) {
      onResolve(selectedResolution);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />
            <h2 className="text-xl font-semibold">Sync Conflict Detected</h2>
          </div>
          <p className="text-muted-foreground mt-2">
            Your local data conflicts with the cloud version. Choose how to resolve this conflict.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Version comparison */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {/* Local version */}
            <div 
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedResolution === 'local' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setSelectedResolution('local')}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <DevicePhoneMobileIcon className="w-5 h-5" />
                  <span className="font-medium">Local Version</span>
                </div>
                {selectedResolution === 'local' && (
                  <CheckCircleIcon className="w-5 h-5 text-primary" />
                )}
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ClockIcon className="w-4 h-4" />
                  <span>Modified {formatDistanceToNow(conflict.localVersion.lastModified, { addSuffix: true })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Device:</span>
                  <span>{conflict.localVersion.device}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Accounts:</span>
                  <span>{conflict.localVersion.accountsCount}</span>
                </div>
              </div>
            </div>

            {/* Remote version */}
            <div 
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedResolution === 'remote' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setSelectedResolution('remote')}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CloudIcon className="w-5 h-5" />
                  <span className="font-medium">Cloud Version</span>
                </div>
                {selectedResolution === 'remote' && (
                  <CheckCircleIcon className="w-5 h-5 text-primary" />
                )}
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ClockIcon className="w-4 h-4" />
                  <span>Modified {formatDistanceToNow(conflict.remoteVersion.lastModified, { addSuffix: true })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Device:</span>
                  <span>{conflict.remoteVersion.device}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Accounts:</span>
                  <span>{conflict.remoteVersion.accountsCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Merge option */}
          <div 
            className={`border rounded-lg p-4 mb-6 cursor-pointer transition-all ${
              selectedResolution === 'merge' 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => setSelectedResolution('merge')}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-medium">Merge Both Versions</span>
                <p className="text-sm text-muted-foreground mt-1">
                  Keep all unique accounts from both versions
                </p>
              </div>
              {selectedResolution === 'merge' && (
                <CheckCircleIcon className="w-5 h-5 text-primary" />
              )}
            </div>
          </div>

          {/* Differences details */}
          <div className="border rounded-lg p-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="font-medium">View Differences</span>
              <span className="text-sm text-muted-foreground">
                {showDetails ? 'Hide' : 'Show'} details
              </span>
            </button>
            
            {showDetails && (
              <div className="mt-4 space-y-3">
                {conflict.differences.added.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-green-600 mb-1">
                      Added in cloud ({conflict.differences.added.length})
                    </p>
                    <div className="space-y-1">
                      {conflict.differences.added.slice(0, 3).map((account, index) => (
                        <div key={index} className="text-sm text-muted-foreground">
                          + {account}
                        </div>
                      ))}
                      {conflict.differences.added.length > 3 && (
                        <div className="text-sm text-muted-foreground">
                          ... and {conflict.differences.added.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {conflict.differences.removed.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-red-600 mb-1">
                      Removed in cloud ({conflict.differences.removed.length})
                    </p>
                    <div className="space-y-1">
                      {conflict.differences.removed.slice(0, 3).map((account, index) => (
                        <div key={index} className="text-sm text-muted-foreground">
                          - {account}
                        </div>
                      ))}
                      {conflict.differences.removed.length > 3 && (
                        <div className="text-sm text-muted-foreground">
                          ... and {conflict.differences.removed.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {conflict.differences.modified.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-yellow-600 mb-1">
                      Modified ({conflict.differences.modified.length})
                    </p>
                    <div className="space-y-1">
                      {conflict.differences.modified.slice(0, 3).map((account, index) => (
                        <div key={index} className="text-sm text-muted-foreground">
                          ~ {account}
                        </div>
                      ))}
                      {conflict.differences.modified.length > 3 && (
                        <div className="text-sm text-muted-foreground">
                          ... and {conflict.differences.modified.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex items-center justify-between">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isResolving}
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleResolve}
            disabled={!selectedResolution || isResolving}
          >
            {isResolving ? 'Resolving...' : 'Apply Resolution'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Conflict notification banner
export const SyncConflictBanner: React.FC<{
  onResolve: () => void;
  onDismiss: () => void;
}> = ({ onResolve, onDismiss }) => {
  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">
              Sync conflict detected
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Your local data is different from the cloud version
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onDismiss}
          >
            Dismiss
          </Button>
          <Button
            size="sm"
            onClick={onResolve}
          >
            Resolve
          </Button>
        </div>
      </div>
    </div>
  );
};

// Auto-resolve settings
export const AutoResolveSettings: React.FC<{
  settings: {
    enabled: boolean;
    strategy: 'local' | 'remote' | 'newest' | 'merge';
  };
  onChange: (settings: any) => void;
}> = ({ settings, onChange }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Auto-resolve conflicts</p>
          <p className="text-sm text-muted-foreground">
            Automatically resolve sync conflicts without prompting
          </p>
        </div>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => onChange({ ...settings, enabled: e.target.checked })}
          className="toggle"
        />
      </div>
      
      {settings.enabled && (
        <div className="ml-6 space-y-2">
          <p className="text-sm font-medium">Resolution strategy:</p>
          <select
            value={settings.strategy}
            onChange={(e) => onChange({ ...settings, strategy: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="local">Always keep local version</option>
            <option value="remote">Always keep cloud version</option>
            <option value="newest">Keep newest version</option>
            <option value="merge">Always merge both versions</option>
          </select>
        </div>
      )}
    </div>
  );
};