import React, { useState } from 'react';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { OTPAccount } from '@services/otp.service';
import { CloudIcon, DevicePhoneMobileIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface SyncConflict {
  accountId: string;
  localAccount: OTPAccount;
  remoteAccount: OTPAccount;
  localUpdated: Date;
  remoteUpdated: Date;
}

interface SyncConflictResolverProps {
  conflicts: SyncConflict[];
  onResolve: (resolutions: { accountId: string; choice: 'local' | 'remote' | 'merge' }[]) => void;
  onCancel: () => void;
}

export const SyncConflictResolver: React.FC<SyncConflictResolverProps> = ({
  conflicts,
  onResolve,
  onCancel
}) => {
  const [resolutions, setResolutions] = useState<Record<string, 'local' | 'remote' | 'merge'>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentConflict = conflicts[currentIndex];

  const handleChoice = (choice: 'local' | 'remote' | 'merge') => {
    setResolutions(prev => ({
      ...prev,
      [currentConflict.accountId]: choice
    }));

    if (currentIndex < conflicts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleResolveAll = () => {
    const resolutionArray = conflicts.map(conflict => ({
      accountId: conflict.accountId,
      choice: resolutions[conflict.accountId] || 'remote'
    }));
    onResolve(resolutionArray);
  };

  const isComplete = Object.keys(resolutions).length === conflicts.length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-6">
        <div className="flex items-center gap-3 mb-6">
          <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />
          <div>
            <h2 className="text-xl font-semibold">Sync Conflicts Detected</h2>
            <p className="text-sm text-muted-foreground">
              Conflict {currentIndex + 1} of {conflicts.length}
            </p>
          </div>
        </div>

        {currentConflict && (
          <div className="space-y-4 mb-6">
            <div className="text-center mb-4">
              <h3 className="font-medium">{currentConflict.localAccount.issuer}</h3>
              <p className="text-sm text-muted-foreground">{currentConflict.localAccount.label}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Local Version */}
              <Card
                className={`p-4 cursor-pointer transition-colors ${
                  resolutions[currentConflict.accountId] === 'local' 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:border-muted-foreground'
                }`}
                onClick={() => handleChoice('local')}
              >
                <div className="flex items-center gap-2 mb-3">
                  <DevicePhoneMobileIcon className="w-5 h-5" />
                  <h4 className="font-medium">Local Version</h4>
                </div>
                <div className="space-y-1 text-sm">
                  <p>Updated: {currentConflict.localUpdated.toLocaleString()}</p>
                  <p className="text-muted-foreground">
                    Algorithm: {currentConflict.localAccount.algorithm}
                  </p>
                  <p className="text-muted-foreground">
                    Digits: {currentConflict.localAccount.digits}
                  </p>
                </div>
              </Card>

              {/* Remote Version */}
              <Card
                className={`p-4 cursor-pointer transition-colors ${
                  resolutions[currentConflict.accountId] === 'remote' 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:border-muted-foreground'
                }`}
                onClick={() => handleChoice('remote')}
              >
                <div className="flex items-center gap-2 mb-3">
                  <CloudIcon className="w-5 h-5" />
                  <h4 className="font-medium">Cloud Version</h4>
                </div>
                <div className="space-y-1 text-sm">
                  <p>Updated: {currentConflict.remoteUpdated.toLocaleString()}</p>
                  <p className="text-muted-foreground">
                    Algorithm: {currentConflict.remoteAccount.algorithm}
                  </p>
                  <p className="text-muted-foreground">
                    Digits: {currentConflict.remoteAccount.digits}
                  </p>
                </div>
              </Card>
            </div>

            {/* Progress indicator */}
            <div className="flex justify-center gap-1 mt-4">
              {conflicts.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    index === currentIndex
                      ? 'bg-primary'
                      : resolutions[conflicts[index].accountId]
                      ? 'bg-primary/50'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel Sync
          </Button>
          {currentIndex < conflicts.length - 1 ? (
            <Button
              onClick={() => setCurrentIndex(currentIndex + 1)}
              disabled={!resolutions[currentConflict.accountId]}
              className="flex-1"
            >
              Next Conflict
            </Button>
          ) : (
            <Button
              onClick={handleResolveAll}
              disabled={!isComplete}
              className="flex-1"
            >
              Apply Resolutions
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};